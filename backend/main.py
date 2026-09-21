"""
main.py
-------
FastAPI entrypoint for the Advanced CRM backend.

Vercel experimentalServices routes /api/* to this service.
Vercel strips the /api prefix before forwarding, so all routes
are registered without /api (e.g. /contacts, /deals, etc.)

Auto-docs available at:
  /api/docs    — Swagger UI
  /api/redoc   — ReDoc
"""

from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from database import init_db
from seed import seed_db
from routers import contacts, deals, tasks, conversations, agents, analytics, notifications


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Initialize DB schema and seed on first run."""
    await init_db()
    await seed_db()
    yield


app = FastAPI(
    title="Advanced CRM API",
    description="""
## Advanced CRM — Python FastAPI Backend

A full-featured CRM REST API powering the Advanced CRM frontend.

### Features
- **Contacts** — Full CRUD with search, filter, pagination, and timeline
- **Deals** — Pipeline management with stage transitions
- **Tasks** — Task management with toggle-complete shortcut
- **Conversations** — Multi-channel inbox with messaging
- **Agents** — Agent profiles and performance data
- **Analytics** — Live KPIs, revenue trends, pipeline funnel, channel mix
- **Notifications** — Notification center with read/delete

### Data Persistence
SQLite via `aiosqlite` — zero-config, file-based, fully async.
Database file: `backend/crm.db`

### Auth
Not implemented in this demo. Add JWT middleware as needed.
    """,
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)

# CORS — allows the Next.js frontend (any origin in dev)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Health check
@app.get("/health", tags=["System"])
async def health():
    return {"status": "ok", "service": "crm-backend", "version": "1.0.0"}

# Mount all routers
app.include_router(contacts.router)
app.include_router(deals.router)
app.include_router(tasks.router)
app.include_router(conversations.router)
app.include_router(agents.router)
app.include_router(analytics.router)
app.include_router(notifications.router)
