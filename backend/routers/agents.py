"""
routers/agents.py
-----------------
Full CRUD for Agents.

Routes:
  GET    /agents          List all (optionally filter by status)
  POST   /agents          Create
  GET    /agents/{id}     Read
  PUT    /agents/{id}     Update
  DELETE /agents/{id}     Delete
"""

import json
import uuid
from datetime import datetime, timezone
from typing import Optional
from fastapi import APIRouter, HTTPException, Query
from database import get_db
from models import AgentCreate, AgentUpdate, AgentResponse

router = APIRouter(prefix="/agents", tags=["Agents"])


def now() -> str:
    return datetime.now(timezone.utc).isoformat()


@router.get("", response_model=list[AgentResponse])
async def list_agents(status: Optional[str] = Query(None)):
    db = await get_db()
    try:
        if status:
            async with db.execute(
                "SELECT * FROM agents WHERE status=? ORDER BY rank ASC", (status,)
            ) as cur:
                rows = await cur.fetchall()
        else:
            async with db.execute("SELECT * FROM agents ORDER BY rank ASC") as cur:
                rows = await cur.fetchall()
        return [AgentResponse(**dict(r)) for r in rows]
    finally:
        await db.close()


@router.post("", response_model=AgentResponse, status_code=201)
async def create_agent(body: AgentCreate):
    db = await get_db()
    try:
        aid = str(uuid.uuid4())
        created = now()
        # Assign rank = max + 1
        async with db.execute("SELECT COALESCE(MAX(rank),0)+1 FROM agents") as cur:
            rank = (await cur.fetchone())[0]
        await db.execute(
            """INSERT INTO agents
               (id,name,email,status,leads_assigned,response_time,
                conversion_rate,revenue,follow_up_rate,badges,rank,created_at)
               VALUES (?,?,?,?,?,?,?,?,?,?,?,?)""",
            (aid, body.name, body.email, body.status, body.leads_assigned,
             body.response_time, body.conversion_rate, body.revenue,
             body.follow_up_rate, json.dumps(body.badges), rank, created),
        )
        await db.commit()
        async with db.execute("SELECT * FROM agents WHERE id=?", (aid,)) as cur:
            row = await cur.fetchone()
        return AgentResponse(**dict(row))
    finally:
        await db.close()


@router.get("/{agent_id}", response_model=AgentResponse)
async def get_agent(agent_id: str):
    db = await get_db()
    try:
        async with db.execute("SELECT * FROM agents WHERE id=?", (agent_id,)) as cur:
            row = await cur.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Agent not found")
        return AgentResponse(**dict(row))
    finally:
        await db.close()


@router.put("/{agent_id}", response_model=AgentResponse)
async def update_agent(agent_id: str, body: AgentUpdate):
    db = await get_db()
    try:
        async with db.execute("SELECT id FROM agents WHERE id=?", (agent_id,)) as cur:
            if not await cur.fetchone():
                raise HTTPException(status_code=404, detail="Agent not found")

        updates = body.model_dump(exclude_none=True)
        if "badges" in updates:
            updates["badges"] = json.dumps(updates["badges"])
        if not updates:
            async with db.execute("SELECT * FROM agents WHERE id=?", (agent_id,)) as cur:
                return AgentResponse(**dict(await cur.fetchone()))

        set_clause = ", ".join(f"{k}=?" for k in updates)
        values = list(updates.values()) + [agent_id]
        await db.execute(f"UPDATE agents SET {set_clause} WHERE id=?", values)
        await db.commit()

        async with db.execute("SELECT * FROM agents WHERE id=?", (agent_id,)) as cur:
            row = await cur.fetchone()
        return AgentResponse(**dict(row))
    finally:
        await db.close()


@router.delete("/{agent_id}", status_code=204)
async def delete_agent(agent_id: str):
    db = await get_db()
    try:
        async with db.execute("SELECT id FROM agents WHERE id=?", (agent_id,)) as cur:
            if not await cur.fetchone():
                raise HTTPException(status_code=404, detail="Agent not found")
        await db.execute("DELETE FROM agents WHERE id=?", (agent_id,))
        await db.commit()
    finally:
        await db.close()
