"""
routers/conversations.py
------------------------
Conversations inbox + per-conversation messaging.

Routes:
  GET    /conversations                       List all conversations
  POST   /conversations                       Create new conversation
  GET    /conversations/{id}                  Get single conversation
  PUT    /conversations/{id}                  Update conversation
  DELETE /conversations/{id}                  Delete conversation
  GET    /conversations/{id}/messages         List messages in conversation
  POST   /conversations/{id}/messages         Send a message
  PATCH  /conversations/{id}/resolve          Mark as resolved
  PATCH  /conversations/{id}/read             Mark all messages read (unread_count = 0)
"""

import json
import uuid
from datetime import datetime, timezone
from typing import Optional
from fastapi import APIRouter, HTTPException, Query
from database import get_db
from models import (
    ConversationCreate, ConversationUpdate, ConversationResponse,
    MessageCreate, MessageResponse,
)

router = APIRouter(prefix="/conversations", tags=["Conversations"])


def now() -> str:
    return datetime.now(timezone.utc).isoformat()


@router.get("", response_model=list[ConversationResponse])
async def list_conversations(
    status: Optional[str] = Query(None),
    channel: Optional[str] = Query(None),
    agent: Optional[str] = Query(None),
):
    db = await get_db()
    try:
        conditions = []
        params: list = []
        if status:
            conditions.append("status = ?")
            params.append(status)
        if channel:
            conditions.append("channel = ?")
            params.append(channel)
        if agent:
            conditions.append("assigned_agent = ?")
            params.append(agent)

        where = ("WHERE " + " AND ".join(conditions)) if conditions else ""
        async with db.execute(
            f"SELECT * FROM conversations {where} ORDER BY timestamp DESC", params
        ) as cur:
            rows = await cur.fetchall()
        return [ConversationResponse(**dict(r)) for r in rows]
    finally:
        await db.close()


@router.post("", response_model=ConversationResponse, status_code=201)
async def create_conversation(body: ConversationCreate):
    db = await get_db()
    try:
        cid = str(uuid.uuid4())
        ts = now()
        await db.execute(
            """INSERT INTO conversations
               (id,contact_id,contact_name,channel,last_message,timestamp,
                unread_count,assigned_agent,status,tags)
               VALUES (?,?,?,?,?,?,?,?,?,?)""",
            (cid, body.contact_id, body.contact_name, body.channel,
             body.last_message, ts, 0, body.assigned_agent,
             body.status, json.dumps(body.tags)),
        )
        await db.commit()
        async with db.execute("SELECT * FROM conversations WHERE id=?", (cid,)) as cur:
            row = await cur.fetchone()
        return ConversationResponse(**dict(row))
    finally:
        await db.close()


@router.get("/{conv_id}", response_model=ConversationResponse)
async def get_conversation(conv_id: str):
    db = await get_db()
    try:
        async with db.execute("SELECT * FROM conversations WHERE id=?", (conv_id,)) as cur:
            row = await cur.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Conversation not found")
        return ConversationResponse(**dict(row))
    finally:
        await db.close()


@router.put("/{conv_id}", response_model=ConversationResponse)
async def update_conversation(conv_id: str, body: ConversationUpdate):
    db = await get_db()
    try:
        async with db.execute("SELECT id FROM conversations WHERE id=?", (conv_id,)) as cur:
            if not await cur.fetchone():
                raise HTTPException(status_code=404, detail="Conversation not found")

        updates = body.model_dump(exclude_none=True)
        if "tags" in updates:
            updates["tags"] = json.dumps(updates["tags"])
        if not updates:
            async with db.execute("SELECT * FROM conversations WHERE id=?", (conv_id,)) as cur:
                return ConversationResponse(**dict(await cur.fetchone()))

        set_clause = ", ".join(f"{k}=?" for k in updates)
        values = list(updates.values()) + [conv_id]
        await db.execute(f"UPDATE conversations SET {set_clause} WHERE id=?", values)
        await db.commit()

        async with db.execute("SELECT * FROM conversations WHERE id=?", (conv_id,)) as cur:
            row = await cur.fetchone()
        return ConversationResponse(**dict(row))
    finally:
        await db.close()


@router.delete("/{conv_id}", status_code=204)
async def delete_conversation(conv_id: str):
    db = await get_db()
    try:
        async with db.execute("SELECT id FROM conversations WHERE id=?", (conv_id,)) as cur:
            if not await cur.fetchone():
                raise HTTPException(status_code=404, detail="Conversation not found")
        await db.execute("DELETE FROM conversations WHERE id=?", (conv_id,))
        await db.commit()
    finally:
        await db.close()


@router.get("/{conv_id}/messages", response_model=list[MessageResponse])
async def list_messages(conv_id: str):
    db = await get_db()
    try:
        async with db.execute("SELECT id FROM conversations WHERE id=?", (conv_id,)) as cur:
            if not await cur.fetchone():
                raise HTTPException(status_code=404, detail="Conversation not found")
        async with db.execute(
            "SELECT * FROM messages WHERE conversation_id=? ORDER BY timestamp ASC",
            (conv_id,),
        ) as cur:
            rows = await cur.fetchall()
        return [MessageResponse(**dict(r)) for r in rows]
    finally:
        await db.close()


@router.post("/{conv_id}/messages", response_model=MessageResponse, status_code=201)
async def send_message(conv_id: str, body: MessageCreate):
    db = await get_db()
    try:
        async with db.execute("SELECT * FROM conversations WHERE id=?", (conv_id,)) as cur:
            conv = await cur.fetchone()
        if not conv:
            raise HTTPException(status_code=404, detail="Conversation not found")

        mid = str(uuid.uuid4())
        ts = now()
        channel = body.channel or conv["channel"]
        await db.execute(
            "INSERT INTO messages (id,conversation_id,contact_id,sender,content,timestamp,channel) VALUES (?,?,?,?,?,?,?)",
            (mid, conv_id, conv["contact_id"], body.sender, body.content, ts, channel),
        )
        # Update last_message and timestamp on conversation
        unread_increment = 0 if body.sender == "agent" else 1
        await db.execute(
            "UPDATE conversations SET last_message=?, timestamp=?, unread_count=unread_count+? WHERE id=?",
            (body.content, ts, unread_increment, conv_id),
        )
        await db.commit()

        async with db.execute("SELECT * FROM messages WHERE id=?", (mid,)) as cur:
            row = await cur.fetchone()
        return MessageResponse(**dict(row))
    finally:
        await db.close()


@router.patch("/{conv_id}/resolve", response_model=ConversationResponse)
async def resolve_conversation(conv_id: str):
    db = await get_db()
    try:
        async with db.execute("SELECT id FROM conversations WHERE id=?", (conv_id,)) as cur:
            if not await cur.fetchone():
                raise HTTPException(status_code=404, detail="Conversation not found")
        await db.execute("UPDATE conversations SET status='resolved' WHERE id=?", (conv_id,))
        await db.commit()
        async with db.execute("SELECT * FROM conversations WHERE id=?", (conv_id,)) as cur:
            row = await cur.fetchone()
        return ConversationResponse(**dict(row))
    finally:
        await db.close()


@router.patch("/{conv_id}/read", response_model=ConversationResponse)
async def mark_read(conv_id: str):
    db = await get_db()
    try:
        async with db.execute("SELECT id FROM conversations WHERE id=?", (conv_id,)) as cur:
            if not await cur.fetchone():
                raise HTTPException(status_code=404, detail="Conversation not found")
        await db.execute("UPDATE conversations SET unread_count=0 WHERE id=?", (conv_id,))
        await db.commit()
        async with db.execute("SELECT * FROM conversations WHERE id=?", (conv_id,)) as cur:
            row = await cur.fetchone()
        return ConversationResponse(**dict(row))
    finally:
        await db.close()
