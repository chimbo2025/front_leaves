"""
routers/contacts.py
-------------------
Full CRUD for Contacts + per-contact timeline.

Routes (Vercel strips /api prefix, FastAPI sees these paths):
  GET    /contacts                 List with search, filter, pagination
  POST   /contacts                 Create
  GET    /contacts/{id}            Read single
  PUT    /contacts/{id}            Full update
  DELETE /contacts/{id}            Delete
  GET    /contacts/{id}/timeline   List timeline events
  POST   /contacts/{id}/timeline   Add timeline event
"""

import json
import uuid
from datetime import datetime, timezone
from typing import Optional
from fastapi import APIRouter, HTTPException, Query
from database import get_db
from models import (
    ContactCreate, ContactUpdate, ContactResponse,
    TimelineEventCreate, TimelineEventResponse,
    PaginatedResponse,
)

router = APIRouter(prefix="/contacts", tags=["Contacts"])


def now() -> str:
    return datetime.now(timezone.utc).isoformat()


@router.get("", response_model=PaginatedResponse[ContactResponse])
async def list_contacts(
    search: Optional[str] = Query(None),
    stage: Optional[str] = Query(None),
    lifecycle: Optional[str] = Query(None),
    source: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=200),
):
    db = await get_db()
    try:
        conditions = []
        params: list = []
        if search:
            conditions.append("(name LIKE ? OR email LIKE ? OR company LIKE ?)")
            like = f"%{search}%"
            params += [like, like, like]
        if stage:
            conditions.append("stage = ?")
            params.append(stage)
        if lifecycle:
            conditions.append("lifecycle = ?")
            params.append(lifecycle)
        if source:
            conditions.append("source = ?")
            params.append(source)

        where = ("WHERE " + " AND ".join(conditions)) if conditions else ""
        offset = (page - 1) * limit

        async with db.execute(f"SELECT COUNT(*) FROM contacts {where}", params) as cur:
            total = (await cur.fetchone())[0]

        async with db.execute(
            f"SELECT * FROM contacts {where} ORDER BY created_at DESC LIMIT ? OFFSET ?",
            params + [limit, offset],
        ) as cur:
            rows = await cur.fetchall()

        items = [ContactResponse(**dict(r)) for r in rows]
        return PaginatedResponse(
            items=items, total=total, page=page, limit=limit,
            pages=max(1, -(-total // limit)),
        )
    finally:
        await db.close()


@router.post("", response_model=ContactResponse, status_code=201)
async def create_contact(body: ContactCreate):
    db = await get_db()
    try:
        cid = str(uuid.uuid4())
        created = now()
        await db.execute(
            """INSERT INTO contacts
               (id,name,email,phone,company,source,score,stage,tags,
                assigned_agent,last_contact,created_at,revenue,location,lifecycle)
               VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)""",
            (cid, body.name, body.email, body.phone, body.company,
             body.source, body.score, body.stage, json.dumps(body.tags),
             body.assigned_agent, body.last_contact, created,
             body.revenue, body.location, body.lifecycle),
        )
        await db.commit()
        async with db.execute("SELECT * FROM contacts WHERE id=?", (cid,)) as cur:
            row = await cur.fetchone()
        return ContactResponse(**dict(row))
    finally:
        await db.close()


@router.get("/{contact_id}", response_model=ContactResponse)
async def get_contact(contact_id: str):
    db = await get_db()
    try:
        async with db.execute("SELECT * FROM contacts WHERE id=?", (contact_id,)) as cur:
            row = await cur.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Contact not found")
        return ContactResponse(**dict(row))
    finally:
        await db.close()


@router.put("/{contact_id}", response_model=ContactResponse)
async def update_contact(contact_id: str, body: ContactUpdate):
    db = await get_db()
    try:
        async with db.execute("SELECT * FROM contacts WHERE id=?", (contact_id,)) as cur:
            existing = await cur.fetchone()
        if not existing:
            raise HTTPException(status_code=404, detail="Contact not found")

        updates = body.model_dump(exclude_none=True)
        if "tags" in updates:
            updates["tags"] = json.dumps(updates["tags"])
        if not updates:
            return ContactResponse(**dict(existing))

        set_clause = ", ".join(f"{k}=?" for k in updates)
        values = list(updates.values()) + [contact_id]
        await db.execute(f"UPDATE contacts SET {set_clause} WHERE id=?", values)
        await db.commit()

        async with db.execute("SELECT * FROM contacts WHERE id=?", (contact_id,)) as cur:
            row = await cur.fetchone()
        return ContactResponse(**dict(row))
    finally:
        await db.close()


@router.delete("/{contact_id}", status_code=204)
async def delete_contact(contact_id: str):
    db = await get_db()
    try:
        async with db.execute("SELECT id FROM contacts WHERE id=?", (contact_id,)) as cur:
            if not await cur.fetchone():
                raise HTTPException(status_code=404, detail="Contact not found")
        await db.execute("DELETE FROM contacts WHERE id=?", (contact_id,))
        await db.commit()
    finally:
        await db.close()


# --- Timeline ---

@router.get("/{contact_id}/timeline", response_model=list[TimelineEventResponse])
async def get_timeline(contact_id: str):
    db = await get_db()
    try:
        async with db.execute(
            "SELECT * FROM timeline_events WHERE contact_id=? ORDER BY timestamp DESC",
            (contact_id,),
        ) as cur:
            rows = await cur.fetchall()
        return [TimelineEventResponse(**dict(r)) for r in rows]
    finally:
        await db.close()


@router.post("/{contact_id}/timeline", response_model=TimelineEventResponse, status_code=201)
async def add_timeline_event(contact_id: str, body: TimelineEventCreate):
    db = await get_db()
    try:
        async with db.execute("SELECT id FROM contacts WHERE id=?", (contact_id,)) as cur:
            if not await cur.fetchone():
                raise HTTPException(status_code=404, detail="Contact not found")
        eid = str(uuid.uuid4())
        ts = now()
        await db.execute(
            "INSERT INTO timeline_events (id,contact_id,type,channel,description,timestamp) VALUES (?,?,?,?,?,?)",
            (eid, contact_id, body.type, body.channel, body.description, ts),
        )
        await db.commit()
        async with db.execute("SELECT * FROM timeline_events WHERE id=?", (eid,)) as cur:
            row = await cur.fetchone()
        return TimelineEventResponse(**dict(row))
    finally:
        await db.close()
