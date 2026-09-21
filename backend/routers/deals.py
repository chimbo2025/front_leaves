"""
routers/deals.py
----------------
Full CRUD for Pipeline Deals + stage patch.

Routes:
  GET    /deals              List (filter by stage, contact_id)
  POST   /deals              Create
  GET    /deals/{id}         Read
  PUT    /deals/{id}         Update
  DELETE /deals/{id}         Delete
  PATCH  /deals/{id}/stage   Move to a new pipeline stage
"""

import uuid
from datetime import datetime, timezone
from typing import Optional
from fastapi import APIRouter, HTTPException, Query
from database import get_db
from models import DealCreate, DealUpdate, DealStageUpdate, DealResponse

router = APIRouter(prefix="/deals", tags=["Deals"])


def now() -> str:
    return datetime.now(timezone.utc).isoformat()


@router.get("", response_model=list[DealResponse])
async def list_deals(
    stage: Optional[str] = Query(None),
    contact_id: Optional[str] = Query(None),
    agent: Optional[str] = Query(None),
):
    db = await get_db()
    try:
        conditions = []
        params: list = []
        if stage:
            conditions.append("stage = ?")
            params.append(stage)
        if contact_id:
            conditions.append("contact_id = ?")
            params.append(contact_id)
        if agent:
            conditions.append("assigned_agent = ?")
            params.append(agent)

        where = ("WHERE " + " AND ".join(conditions)) if conditions else ""
        async with db.execute(
            f"SELECT * FROM deals {where} ORDER BY created_at DESC", params
        ) as cur:
            rows = await cur.fetchall()
        return [DealResponse(**dict(r)) for r in rows]
    finally:
        await db.close()


@router.post("", response_model=DealResponse, status_code=201)
async def create_deal(body: DealCreate):
    db = await get_db()
    try:
        did = str(uuid.uuid4())
        created = now()
        await db.execute(
            """INSERT INTO deals
               (id,title,contact_id,contact_name,value,stage,probability,
                assigned_agent,close_date,created_at,channel)
               VALUES (?,?,?,?,?,?,?,?,?,?,?)""",
            (did, body.title, body.contact_id, body.contact_name, body.value,
             body.stage, body.probability, body.assigned_agent,
             body.close_date, created, body.channel),
        )
        await db.commit()
        async with db.execute("SELECT * FROM deals WHERE id=?", (did,)) as cur:
            row = await cur.fetchone()
        return DealResponse(**dict(row))
    finally:
        await db.close()


@router.get("/{deal_id}", response_model=DealResponse)
async def get_deal(deal_id: str):
    db = await get_db()
    try:
        async with db.execute("SELECT * FROM deals WHERE id=?", (deal_id,)) as cur:
            row = await cur.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Deal not found")
        return DealResponse(**dict(row))
    finally:
        await db.close()


@router.put("/{deal_id}", response_model=DealResponse)
async def update_deal(deal_id: str, body: DealUpdate):
    db = await get_db()
    try:
        async with db.execute("SELECT id FROM deals WHERE id=?", (deal_id,)) as cur:
            if not await cur.fetchone():
                raise HTTPException(status_code=404, detail="Deal not found")

        updates = body.model_dump(exclude_none=True)
        if not updates:
            async with db.execute("SELECT * FROM deals WHERE id=?", (deal_id,)) as cur:
                return DealResponse(**dict(await cur.fetchone()))

        set_clause = ", ".join(f"{k}=?" for k in updates)
        values = list(updates.values()) + [deal_id]
        await db.execute(f"UPDATE deals SET {set_clause} WHERE id=?", values)
        await db.commit()

        async with db.execute("SELECT * FROM deals WHERE id=?", (deal_id,)) as cur:
            row = await cur.fetchone()
        return DealResponse(**dict(row))
    finally:
        await db.close()


@router.delete("/{deal_id}", status_code=204)
async def delete_deal(deal_id: str):
    db = await get_db()
    try:
        async with db.execute("SELECT id FROM deals WHERE id=?", (deal_id,)) as cur:
            if not await cur.fetchone():
                raise HTTPException(status_code=404, detail="Deal not found")
        await db.execute("DELETE FROM deals WHERE id=?", (deal_id,))
        await db.commit()
    finally:
        await db.close()


@router.patch("/{deal_id}/stage", response_model=DealResponse)
async def move_deal_stage(deal_id: str, body: DealStageUpdate):
    db = await get_db()
    try:
        async with db.execute("SELECT id FROM deals WHERE id=?", (deal_id,)) as cur:
            if not await cur.fetchone():
                raise HTTPException(status_code=404, detail="Deal not found")
        await db.execute("UPDATE deals SET stage=? WHERE id=?", (body.stage, deal_id))
        await db.commit()
        async with db.execute("SELECT * FROM deals WHERE id=?", (deal_id,)) as cur:
            row = await cur.fetchone()
        return DealResponse(**dict(row))
    finally:
        await db.close()
