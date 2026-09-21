"""
routers/tasks.py
----------------
Full CRUD for Tasks + toggle-complete shortcut.

Routes:
  GET    /tasks              List (filter by status, agent, contact_id)
  POST   /tasks              Create
  GET    /tasks/{id}         Read
  PUT    /tasks/{id}         Update
  DELETE /tasks/{id}         Delete
  PATCH  /tasks/{id}/toggle  Toggle Done/Pending
"""

import uuid
from datetime import datetime, timezone
from typing import Optional
from fastapi import APIRouter, HTTPException, Query
from database import get_db
from models import TaskCreate, TaskUpdate, TaskResponse

router = APIRouter(prefix="/tasks", tags=["Tasks"])


def now() -> str:
    return datetime.now(timezone.utc).isoformat()


@router.get("", response_model=list[TaskResponse])
async def list_tasks(
    status: Optional[str] = Query(None),
    agent: Optional[str] = Query(None),
    contact_id: Optional[str] = Query(None),
    priority: Optional[str] = Query(None),
):
    db = await get_db()
    try:
        conditions = []
        params: list = []
        if status:
            conditions.append("status = ?")
            params.append(status)
        if agent:
            conditions.append("assigned_agent = ?")
            params.append(agent)
        if contact_id:
            conditions.append("contact_id = ?")
            params.append(contact_id)
        if priority:
            conditions.append("priority = ?")
            params.append(priority)

        where = ("WHERE " + " AND ".join(conditions)) if conditions else ""
        async with db.execute(
            f"SELECT * FROM tasks {where} ORDER BY created_at DESC", params
        ) as cur:
            rows = await cur.fetchall()
        return [TaskResponse(**dict(r)) for r in rows]
    finally:
        await db.close()


@router.post("", response_model=TaskResponse, status_code=201)
async def create_task(body: TaskCreate):
    db = await get_db()
    try:
        tid = str(uuid.uuid4())
        created = now()
        await db.execute(
            """INSERT INTO tasks
               (id,title,contact_id,contact_name,assigned_agent,
                due_date,priority,status,type,automated,created_at)
               VALUES (?,?,?,?,?,?,?,?,?,?,?)""",
            (tid, body.title, body.contact_id, body.contact_name,
             body.assigned_agent, body.due_date, body.priority,
             body.status, body.type, int(body.automated), created),
        )
        await db.commit()
        async with db.execute("SELECT * FROM tasks WHERE id=?", (tid,)) as cur:
            row = await cur.fetchone()
        return TaskResponse(**dict(row))
    finally:
        await db.close()


@router.get("/{task_id}", response_model=TaskResponse)
async def get_task(task_id: str):
    db = await get_db()
    try:
        async with db.execute("SELECT * FROM tasks WHERE id=?", (task_id,)) as cur:
            row = await cur.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Task not found")
        return TaskResponse(**dict(row))
    finally:
        await db.close()


@router.put("/{task_id}", response_model=TaskResponse)
async def update_task(task_id: str, body: TaskUpdate):
    db = await get_db()
    try:
        async with db.execute("SELECT id FROM tasks WHERE id=?", (task_id,)) as cur:
            if not await cur.fetchone():
                raise HTTPException(status_code=404, detail="Task not found")

        updates = body.model_dump(exclude_none=True)
        if "automated" in updates:
            updates["automated"] = int(updates["automated"])
        if not updates:
            async with db.execute("SELECT * FROM tasks WHERE id=?", (task_id,)) as cur:
                return TaskResponse(**dict(await cur.fetchone()))

        set_clause = ", ".join(f"{k}=?" for k in updates)
        values = list(updates.values()) + [task_id]
        await db.execute(f"UPDATE tasks SET {set_clause} WHERE id=?", values)
        await db.commit()

        async with db.execute("SELECT * FROM tasks WHERE id=?", (task_id,)) as cur:
            row = await cur.fetchone()
        return TaskResponse(**dict(row))
    finally:
        await db.close()


@router.delete("/{task_id}", status_code=204)
async def delete_task(task_id: str):
    db = await get_db()
    try:
        async with db.execute("SELECT id FROM tasks WHERE id=?", (task_id,)) as cur:
            if not await cur.fetchone():
                raise HTTPException(status_code=404, detail="Task not found")
        await db.execute("DELETE FROM tasks WHERE id=?", (task_id,))
        await db.commit()
    finally:
        await db.close()


@router.patch("/{task_id}/toggle", response_model=TaskResponse)
async def toggle_task(task_id: str):
    db = await get_db()
    try:
        async with db.execute("SELECT * FROM tasks WHERE id=?", (task_id,)) as cur:
            row = await cur.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Task not found")

        current_status = row["status"]
        new_status = "Done" if current_status != "Done" else "Pending"
        await db.execute("UPDATE tasks SET status=? WHERE id=?", (new_status, task_id))
        await db.commit()

        async with db.execute("SELECT * FROM tasks WHERE id=?", (task_id,)) as cur:
            updated = await cur.fetchone()
        return TaskResponse(**dict(updated))
    finally:
        await db.close()
