"""
database.py
-----------
Manages the SQLite connection pool (via aiosqlite) and schema creation.
All tables are created with CREATE TABLE IF NOT EXISTS so this is safe to call
on every startup.  The DB file lives at ./crm.db relative to this file.
"""

import os
import aiosqlite

DB_PATH = os.path.join(os.path.dirname(__file__), "crm.db")


async def get_db() -> aiosqlite.Connection:
    """Open a row-factory-enabled connection.  Caller is responsible for close."""
    conn = await aiosqlite.connect(DB_PATH)
    conn.row_factory = aiosqlite.Row
    return conn


async def init_db() -> None:
    """Create all tables (idempotent)."""
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        await db.executescript("""
            PRAGMA journal_mode=WAL;
            PRAGMA foreign_keys=ON;

            CREATE TABLE IF NOT EXISTS contacts (
                id              TEXT PRIMARY KEY,
                name            TEXT NOT NULL,
                email           TEXT NOT NULL,
                phone           TEXT,
                company         TEXT,
                source          TEXT DEFAULT 'Manual',
                score           INTEGER DEFAULT 50,
                stage           TEXT DEFAULT 'New Lead',
                tags            TEXT DEFAULT '[]',
                assigned_agent  TEXT,
                last_contact    TEXT,
                created_at      TEXT NOT NULL,
                revenue         REAL DEFAULT 0,
                location        TEXT,
                lifecycle       TEXT DEFAULT 'Lead'
            );

            CREATE TABLE IF NOT EXISTS deals (
                id              TEXT PRIMARY KEY,
                title           TEXT NOT NULL,
                contact_id      TEXT,
                contact_name    TEXT,
                value           REAL NOT NULL DEFAULT 0,
                stage           TEXT NOT NULL DEFAULT 'Lead',
                probability     INTEGER DEFAULT 10,
                assigned_agent  TEXT,
                close_date      TEXT,
                created_at      TEXT NOT NULL,
                channel         TEXT DEFAULT 'Email',
                FOREIGN KEY (contact_id) REFERENCES contacts(id) ON DELETE SET NULL
            );

            CREATE TABLE IF NOT EXISTS tasks (
                id              TEXT PRIMARY KEY,
                title           TEXT NOT NULL,
                contact_id      TEXT,
                contact_name    TEXT,
                assigned_agent  TEXT,
                due_date        TEXT,
                priority        TEXT DEFAULT 'Medium',
                status          TEXT DEFAULT 'Pending',
                type            TEXT DEFAULT 'Follow-up',
                automated       INTEGER DEFAULT 0,
                created_at      TEXT NOT NULL,
                FOREIGN KEY (contact_id) REFERENCES contacts(id) ON DELETE SET NULL
            );

            CREATE TABLE IF NOT EXISTS conversations (
                id              TEXT PRIMARY KEY,
                contact_id      TEXT,
                contact_name    TEXT,
                channel         TEXT NOT NULL DEFAULT 'Email',
                last_message    TEXT,
                timestamp       TEXT NOT NULL,
                unread_count    INTEGER DEFAULT 0,
                assigned_agent  TEXT,
                status          TEXT DEFAULT 'open',
                tags            TEXT DEFAULT '[]',
                FOREIGN KEY (contact_id) REFERENCES contacts(id) ON DELETE SET NULL
            );

            CREATE TABLE IF NOT EXISTS messages (
                id              TEXT PRIMARY KEY,
                conversation_id TEXT NOT NULL,
                contact_id      TEXT,
                sender          TEXT NOT NULL,
                content         TEXT NOT NULL,
                timestamp       TEXT NOT NULL,
                channel         TEXT DEFAULT 'Email',
                FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
            );

            CREATE TABLE IF NOT EXISTS agents (
                id              TEXT PRIMARY KEY,
                name            TEXT NOT NULL,
                email           TEXT NOT NULL,
                status          TEXT DEFAULT 'Online',
                leads_assigned  INTEGER DEFAULT 0,
                response_time   REAL DEFAULT 0,
                conversion_rate REAL DEFAULT 0,
                revenue         REAL DEFAULT 0,
                follow_up_rate  REAL DEFAULT 0,
                badges          TEXT DEFAULT '[]',
                rank            INTEGER DEFAULT 0,
                created_at      TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS timeline_events (
                id              TEXT PRIMARY KEY,
                contact_id      TEXT NOT NULL,
                type            TEXT NOT NULL,
                channel         TEXT,
                description     TEXT NOT NULL,
                timestamp       TEXT NOT NULL,
                FOREIGN KEY (contact_id) REFERENCES contacts(id) ON DELETE CASCADE
            );

            CREATE TABLE IF NOT EXISTS notifications (
                id          TEXT PRIMARY KEY,
                type        TEXT NOT NULL DEFAULT 'info',
                title       TEXT NOT NULL,
                description TEXT,
                timestamp   TEXT NOT NULL,
                read        INTEGER DEFAULT 0,
                priority    TEXT DEFAULT 'normal'
            );

            CREATE TABLE IF NOT EXISTS automation_rules (
                id          TEXT PRIMARY KEY,
                name        TEXT NOT NULL,
                trigger     TEXT NOT NULL,
                action      TEXT NOT NULL,
                active      INTEGER DEFAULT 1,
                run_count   INTEGER DEFAULT 0,
                success_rate REAL DEFAULT 0,
                created_at  TEXT NOT NULL
            );
        """)
        await db.commit()
