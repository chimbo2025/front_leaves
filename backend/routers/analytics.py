"""
routers/analytics.py
--------------------
Read-only analytics derived from live database data.

Routes:
  GET /analytics/kpis       Core KPI summary
  GET /analytics/revenue    Monthly revenue trend (last 12 months)
  GET /analytics/pipeline   Deal count + value per pipeline stage
  GET /analytics/channels   Channel distribution of deals
"""

from datetime import datetime, timezone, timedelta
from fastapi import APIRouter
from database import get_db
from models import (
    KPIResponse, RevenuePoint, PipelineStage, ChannelMix, AnalyticsResponse
)

router = APIRouter(prefix="/analytics", tags=["Analytics"])


@router.get("", response_model=AnalyticsResponse)
async def get_all_analytics():
    kpis = await _kpis()
    revenue = await _revenue()
    pipeline = await _pipeline()
    channels = await _channels()
    return AnalyticsResponse(
        kpis=kpis,
        revenue_trend=revenue,
        pipeline_stages=pipeline,
        channel_mix=channels,
    )


@router.get("/kpis", response_model=KPIResponse)
async def get_kpis():
    return await _kpis()


@router.get("/revenue", response_model=list[RevenuePoint])
async def get_revenue():
    return await _revenue()


@router.get("/pipeline", response_model=list[PipelineStage])
async def get_pipeline():
    return await _pipeline()


@router.get("/channels", response_model=list[ChannelMix])
async def get_channels():
    return await _channels()


# -----------------------------------------------------------------------
# Private helpers
# -----------------------------------------------------------------------

async def _kpis() -> KPIResponse:
    db = await get_db()
    try:
        async with db.execute("SELECT COUNT(*) FROM contacts") as cur:
            total_contacts = (await cur.fetchone())[0]
        async with db.execute("SELECT COUNT(*) FROM deals") as cur:
            total_deals = (await cur.fetchone())[0]
        async with db.execute("SELECT COALESCE(SUM(value),0) FROM deals WHERE stage='Closed Won'") as cur:
            total_revenue = (await cur.fetchone())[0]
        async with db.execute("SELECT COUNT(*) FROM tasks WHERE status != 'Done'") as cur:
            open_tasks = (await cur.fetchone())[0]
        async with db.execute("SELECT COUNT(*) FROM deals WHERE stage='Closed Won'") as cur:
            closed_won = (await cur.fetchone())[0]
        conversion_rate = round((closed_won / total_deals * 100) if total_deals else 0, 1)
        async with db.execute("SELECT COALESCE(AVG(value),0) FROM deals") as cur:
            avg_deal = (await cur.fetchone())[0]
        async with db.execute("SELECT COUNT(*) FROM conversations WHERE status='open'") as cur:
            active_convs = (await cur.fetchone())[0]
        async with db.execute("SELECT COUNT(*) FROM agents WHERE status='Online'") as cur:
            agents_online = (await cur.fetchone())[0]

        return KPIResponse(
            total_contacts=total_contacts,
            total_deals=total_deals,
            total_revenue=round(total_revenue, 2),
            open_tasks=open_tasks,
            conversion_rate=conversion_rate,
            avg_deal_value=round(avg_deal, 2),
            active_conversations=active_convs,
            agents_online=agents_online,
        )
    finally:
        await db.close()


async def _revenue() -> list[RevenuePoint]:
    db = await get_db()
    try:
        now = datetime.now(timezone.utc)
        months = []
        for i in range(11, -1, -1):
            dt = now - timedelta(days=30 * i)
            month_str = dt.strftime("%b %Y")
            month_prefix = dt.strftime("%Y-%m")
            async with db.execute(
                "SELECT COALESCE(SUM(value),0) FROM deals WHERE stage='Closed Won' AND created_at LIKE ?",
                (f"{month_prefix}%",),
            ) as cur:
                revenue = (await cur.fetchone())[0]
            months.append(RevenuePoint(
                month=dt.strftime("%b"),
                revenue=round(float(revenue), 2),
                forecast=round(float(revenue) * 1.12, 2),
            ))
        return months
    finally:
        await db.close()


async def _pipeline() -> list[PipelineStage]:
    db = await get_db()
    try:
        stage_order = ["Lead", "Qualified", "Proposal Sent", "In Negotiation", "Closed Won", "Closed Lost"]
        result = []
        for stage in stage_order:
            async with db.execute(
                "SELECT COUNT(*), COALESCE(SUM(value),0) FROM deals WHERE stage=?", (stage,)
            ) as cur:
                row = await cur.fetchone()
            result.append(PipelineStage(stage=stage, count=row[0], value=round(float(row[1]), 2)))
        return result
    finally:
        await db.close()


async def _channels() -> list[ChannelMix]:
    db = await get_db()
    try:
        async with db.execute("SELECT COUNT(*) FROM deals") as cur:
            total = (await cur.fetchone())[0] or 1
        async with db.execute(
            "SELECT channel, COUNT(*) as cnt FROM deals GROUP BY channel ORDER BY cnt DESC"
        ) as cur:
            rows = await cur.fetchall()
        return [
            ChannelMix(
                channel=r["channel"],
                count=r["cnt"],
                percentage=round(r["cnt"] / total * 100, 1),
            )
            for r in rows
        ]
    finally:
        await db.close()
