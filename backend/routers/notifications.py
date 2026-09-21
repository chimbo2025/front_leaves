"""
routers/notifications.py
------------------------
Notifications with mark-read and bulk-read-all.

Routes:
  GET    /notifications                   List all
  POST   /notifications                   Create
  PATCH  /notifications/{id}/read         Mark single as read
  PATCH  /notifications/read-all          Mark all as read
  DELETE /notifications/{id}              Delete
"""

import uuid
from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException
from database import get_db
from models import NotificationCreate, NotificationResponse

router = APIRouter(prefix="/notifications", tags=["Notifications"])


def now() -> str:
    return datetime.now(timezone.utc).isoformat()


@router.get("", response_model=list[NotificationResponse])
async def list_notifications():
    db = await get_db()
    try:
        async with db.execute(
            "SELECT * FROM notifications ORDER BY timestamp DESC"
        ) as cur:
            rows = await cur.fetchall()
        return [NotificationResponse(**dict(r)) for r in rows]
    finally:
        await db.close()


@router.post("", response_model=NotificationResponse, status_code=201)
async def create_notification(body: NotificationCreate):
    db = await get_db()
    try:
        nid = str(uuid.uuid4())
        ts = now()
        await db.execute(
            "INSERT INTO notifications (id,type,title,description,timestamp,read,priority) VALUES (?,?,?,?,?,?,?)",
            (nid, body.type, body.title, body.description, ts, 0, body.priority),
        )
        await db.commit()
        async with db.execute("SELECT * FROM notifications WHERE id=?", (nid,)) as cur:
            row = await cur.fetchone()
        return NotificationResponse(**dict(row))
    finally:
        await db.close()


@router.patch("/read-all", status_code=200)
async def mark_all_read():
    db = await get_db()
    try:
        await db.execute("UPDATE notifications SET read=1")
        await db.commit()
        return {"message": "All notifications marked as read"}
    finally:
        await db.close()


@router.patch("/{notif_id}/read", response_model=NotificationResponse)
async def mark_read(notif_id: str):
    db = await get_db()
    try:
        async with db.execute("SELECT id FROM notifications WHERE id=?", (notif_id,)) as cur:
            if not await cur.fetchone():
                raise HTTPException(status_code=404, detail="Notification not found")
        await db.execute("UPDATE notifications SET read=1 WHERE id=?", (notif_id,))
        await db.commit()
        async with db.execute("SELECT * FROM notifications WHERE id=?", (notif_id,)) as cur:
            row = await cur.fetchone()
        return NotificationResponse(**dict(row))
    finally:
        await db.close()


@router.delete("/{notif_id}", status_code=204)
async def delete_notification(notif_id: str):
    db = await get_db()
    try:
        async with db.execute("SELECT id FROM notifications WHERE id=?", (notif_id,)) as cur:
            if not await cur.fetchone():
                raise HTTPException(status_code=404, detail="Notification not found")
        await db.execute("DELETE FROM notifications WHERE id=?", (notif_id,))
        await db.commit()
    finally:
        await db.close()
