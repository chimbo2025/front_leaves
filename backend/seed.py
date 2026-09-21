"""
seed.py
-------
Populates the database with realistic sample data on first startup.
Called from main.py lifespan only when all tables are empty.
"""

import json
import uuid
from datetime import datetime, timezone, timedelta
import aiosqlite
from database import DB_PATH


def uid() -> str:
    return str(uuid.uuid4())


def ts(days_ago: int = 0) -> str:
    return (datetime.now(timezone.utc) - timedelta(days=days_ago)).isoformat()


async def seed_db() -> None:
    async with aiosqlite.connect(DB_PATH) as db:
        # Check if already seeded
        async with db.execute("SELECT COUNT(*) FROM contacts") as cur:
            row = await cur.fetchone()
            if row and row[0] > 0:
                return

        # ---------------------------------------------------------------
        # Agents
        # ---------------------------------------------------------------
        agents = [
            (uid(), "Sarah Chen", "sarah.chen@crm.io", "Online", 47, 1.2, 68.5, 284000, 92.0, json.dumps(["Top Closer", "Fast Responder"]), 1, ts(180)),
            (uid(), "Marcus Johnson", "marcus.j@crm.io", "Online", 38, 2.1, 54.2, 198000, 78.0, json.dumps(["Deal Maker"]), 2, ts(160)),
            (uid(), "Priya Patel", "priya.p@crm.io", "Away", 29, 3.4, 42.1, 145000, 65.0, json.dumps(["Rising Star"]), 3, ts(140)),
            (uid(), "Tom Rivers", "tom.r@crm.io", "Online", 51, 1.8, 61.3, 231000, 85.0, json.dumps(["Pipeline King"]), 4, ts(120)),
            (uid(), "Elena Vasquez", "elena.v@crm.io", "Offline", 22, 4.2, 38.9, 112000, 55.0, json.dumps([]), 5, ts(100)),
        ]
        agent_ids = [a[0] for a in agents]
        agent_names = [a[1] for a in agents]
        await db.executemany(
            "INSERT INTO agents VALUES (?,?,?,?,?,?,?,?,?,?,?,?)", agents
        )

        # ---------------------------------------------------------------
        # Contacts
        # ---------------------------------------------------------------
        sources = ["LinkedIn", "Website", "Referral", "Cold Email", "Event", "Social Media", "Webinar"]
        stages = ["New Lead", "Qualified", "Proposal", "Negotiation", "Closed Won", "Closed Lost"]
        lifecycles = ["Lead", "MQL", "SQL", "Opportunity", "Customer", "Churned"]
        companies = [
            "TechVision Inc", "NovaSpark LLC", "BlueSky Analytics", "Quantum Digital",
            "Apex Solutions", "CloudFirst Systems", "DataBridge Corp", "InnovatePro",
            "StellarOps", "PinnacleSoft", "NexGen Labs", "FluxMedia", "OrbisAI",
            "VelocityStack", "ZenithCloud", "CatalystHQ", "PrimeEdge", "HorizonTech"
        ]

        contacts_data = [
            ("Alexandra Rhodes", "a.rhodes@techvision.com", "+1-555-0101", companies[0], sources[0], 92, stages[2], ["VIP", "Enterprise"], agent_names[0], ts(1), 128000, "New York, NY", lifecycles[3]),
            ("James Weston", "j.weston@novaspark.com", "+1-555-0102", companies[1], sources[1], 78, stages[1], ["Warm", "Mid-Market"], agent_names[1], ts(2), 45000, "Austin, TX", lifecycles[2]),
            ("Mei Lin", "mei.lin@bluesky.io", "+1-555-0103", companies[2], sources[3], 85, stages[2], ["Hot", "Analytics"], agent_names[0], ts(0), 89000, "San Francisco, CA", lifecycles[3]),
            ("Carlos Mendez", "c.mendez@quantum.com", "+1-555-0104", companies[3], sources[2], 64, stages[0], ["Cold"], agent_names[2], ts(7), 12000, "Miami, FL", lifecycles[0]),
            ("Sophia Turner", "s.turner@apex.io", "+1-555-0105", companies[4], sources[4], 91, stages[3], ["VIP", "Hot"], agent_names[3], ts(0), 210000, "Chicago, IL", lifecycles[4]),
            ("Daniel Park", "d.park@cloudfirst.com", "+1-555-0106", companies[5], sources[1], 73, stages[1], ["Mid-Market"], agent_names[1], ts(3), 67000, "Seattle, WA", lifecycles[2]),
            ("Aisha Okonkwo", "a.okonkwo@databridge.com", "+1-555-0107", companies[6], sources[0], 88, stages[2], ["Enterprise", "Hot"], agent_names[0], ts(1), 155000, "London, UK", lifecycles[3]),
            ("Ryan Kowalski", "r.kowalski@innovate.pro", "+1-555-0108", companies[7], sources[5], 55, stages[0], ["Cold", "SMB"], agent_names[4], ts(14), 8500, "Boston, MA", lifecycles[0]),
            ("Fatima Al-Hassan", "f.hassan@stellarops.com", "+1-555-0109", companies[8], sources[6], 96, stages[4], ["VIP", "Closed"], agent_names[3], ts(0), 320000, "Dubai, UAE", lifecycles[4]),
            ("Luke Brannigan", "l.brannigan@pinnaclesoft.com", "+1-555-0110", companies[9], sources[3], 42, stages[5], ["Lost"], agent_names[2], ts(30), 0, "Toronto, CA", lifecycles[5]),
            ("Nadia Petrov", "n.petrov@nexgenlabs.com", "+1-555-0111", companies[10], sources[0], 81, stages[2], ["Warm", "Tech"], agent_names[0], ts(2), 95000, "Berlin, DE", lifecycles[2]),
            ("Omar Khalid", "o.khalid@fluxmedia.com", "+1-555-0112", companies[11], sources[4], 69, stages[1], ["Mid-Market"], agent_names[1], ts(5), 38000, "Riyadh, SA", lifecycles[1]),
            ("Isabella Romano", "i.romano@orbisai.com", "+1-555-0113", companies[12], sources[2], 93, stages[3], ["VIP", "AI"], agent_names[3], ts(1), 245000, "Milan, IT", lifecycles[3]),
            ("Wei Zhang", "w.zhang@velocitystack.com", "+1-555-0114", companies[13], sources[1], 77, stages[2], ["Warm"], agent_names[0], ts(3), 72000, "Shanghai, CN", lifecycles[2]),
            ("Grace O'Brien", "g.obrien@zenithcloud.com", "+1-555-0115", companies[14], sources[5], 60, stages[0], ["Cold"], agent_names[4], ts(10), 15000, "Dublin, IE", lifecycles[0]),
        ]

        contact_rows = []
        contact_ids = []
        for row in contacts_data:
            cid = uid()
            contact_ids.append(cid)
            contact_rows.append((
                cid, row[0], row[1], row[2], row[3], row[4], row[5], row[6],
                json.dumps(row[7]), row[8], row[9], ts(60), row[10], row[11], row[12]
            ))

        await db.executemany(
            "INSERT INTO contacts VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
            contact_rows
        )

        # ---------------------------------------------------------------
        # Deals
        # ---------------------------------------------------------------
        deal_stages = ["Lead", "Qualified", "Proposal Sent", "In Negotiation", "Closed Won", "Closed Lost"]
        deals = [
            (uid(), "Enterprise Platform License", contact_ids[0], contacts_data[0][0], 128000, deal_stages[3], 85, agent_names[0], ts(-30), ts(5), "Email"),
            (uid(), "Analytics Suite Upgrade", contact_ids[1], contacts_data[1][0], 45000, deal_stages[2], 60, agent_names[1], ts(-20), ts(10), "LinkedIn"),
            (uid(), "Data Warehouse Migration", contact_ids[2], contacts_data[2][0], 89000, deal_stages[2], 72, agent_names[0], ts(-15), ts(3), "Website"),
            (uid(), "CRM Integration Package", contact_ids[4], contacts_data[4][0], 210000, deal_stages[3], 90, agent_names[3], ts(-10), ts(1), "Referral"),
            (uid(), "Cloud Infrastructure Deal", contact_ids[5], contacts_data[5][0], 67000, deal_stages[1], 45, agent_names[1], ts(-45), ts(15), "Email"),
            (uid(), "AI Assistant Rollout", contact_ids[6], contacts_data[6][0], 155000, deal_stages[2], 78, agent_names[0], ts(-8), ts(7), "LinkedIn"),
            (uid(), "Annual SaaS Subscription", contact_ids[8], contacts_data[8][0], 320000, deal_stages[4], 100, agent_names[3], ts(-90), ts(0), "Referral"),
            (uid(), "Starter Package", contact_ids[7], contacts_data[7][0], 8500, deal_stages[0], 20, agent_names[4], ts(-60), ts(30), "Website"),
            (uid(), "ML Platform License", contact_ids[10], contacts_data[10][0], 95000, deal_stages[2], 68, agent_names[0], ts(-12), ts(8), "Email"),
            (uid(), "Media Analytics Bundle", contact_ids[11], contacts_data[11][0], 38000, deal_stages[1], 40, agent_names[1], ts(-25), ts(20), "LinkedIn"),
            (uid(), "AI Enterprise Contract", contact_ids[12], contacts_data[12][0], 245000, deal_stages[3], 88, agent_names[3], ts(-5), ts(2), "Referral"),
            (uid(), "Performance Stack", contact_ids[13], contacts_data[13][0], 72000, deal_stages[2], 55, agent_names[0], ts(-18), ts(12), "Website"),
        ]
        await db.executemany(
            "INSERT INTO deals VALUES (?,?,?,?,?,?,?,?,?,?,?)", deals
        )

        # ---------------------------------------------------------------
        # Tasks
        # ---------------------------------------------------------------
        task_types = ["Follow-up", "Demo", "Proposal", "Call", "Email", "Contract Review"]
        priorities = ["High", "Medium", "Low", "Critical"]
        statuses = ["Pending", "In Progress", "Done", "Overdue"]

        tasks_data = [
            (uid(), "Follow up on enterprise proposal", contact_ids[0], contacts_data[0][0], agent_names[0], ts(-2), priorities[0], statuses[1], task_types[0], 0, ts(10)),
            (uid(), "Schedule product demo", contact_ids[2], contacts_data[2][0], agent_names[0], ts(-1), priorities[1], statuses[0], task_types[1], 0, ts(9)),
            (uid(), "Send pricing proposal", contact_ids[4], contacts_data[4][0], agent_names[3], ts(-3), priorities[3], statuses[3], task_types[2], 0, ts(8)),
            (uid(), "Quarterly check-in call", contact_ids[8], contacts_data[8][0], agent_names[3], ts(-5), priorities[1], statuses[2], task_types[3], 1, ts(7)),
            (uid(), "Onboarding follow-up email", contact_ids[8], contacts_data[8][0], agent_names[3], ts(-1), priorities[0], statuses[2], task_types[4], 1, ts(6)),
            (uid(), "Review contract terms", contact_ids[12], contacts_data[12][0], agent_names[3], ts(-1), priorities[3], statuses[1], task_types[5], 0, ts(5)),
            (uid(), "Demo follow-up", contact_ids[1], contacts_data[1][0], agent_names[1], ts(-7), priorities[2], statuses[3], task_types[0], 0, ts(4)),
            (uid(), "Send case studies", contact_ids[6], contacts_data[6][0], agent_names[0], ts(-2), priorities[1], statuses[0], task_types[4], 1, ts(3)),
            (uid(), "Negotiate contract renewal", contact_ids[4], contacts_data[4][0], agent_names[3], ts(-1), priorities[0], statuses[1], task_types[5], 0, ts(2)),
            (uid(), "Cold outreach sequence", contact_ids[7], contacts_data[7][0], agent_names[4], ts(-14), priorities[2], statuses[3], task_types[0], 1, ts(1)),
        ]
        await db.executemany(
            "INSERT INTO tasks VALUES (?,?,?,?,?,?,?,?,?,?,?)", tasks_data
        )

        # ---------------------------------------------------------------
        # Conversations
        # ---------------------------------------------------------------
        channels = ["Email", "LinkedIn", "WhatsApp", "Twitter", "Phone", "SMS"]
        conv_ids = []
        conversations = [
            (uid(), contact_ids[0], contacts_data[0][0], channels[0], "Looking forward to the contract discussion", ts(0), 2, agent_names[0], "open", json.dumps(["VIP"])),
            (uid(), contact_ids[2], contacts_data[2][0], channels[1], "Can we schedule a deeper technical demo?", ts(0), 1, agent_names[0], "open", json.dumps(["Hot"])),
            (uid(), contact_ids[4], contacts_data[4][0], channels[2], "Negotiation terms look good on our end", ts(1), 0, agent_names[3], "open", json.dumps(["VIP", "Urgent"])),
            (uid(), contact_ids[8], contacts_data[8][0], channels[0], "Thank you for the excellent onboarding!", ts(1), 0, agent_names[3], "resolved", json.dumps(["Closed"])),
            (uid(), contact_ids[6], contacts_data[6][0], channels[1], "Could you share the technical documentation?", ts(2), 3, agent_names[0], "open", json.dumps(["Enterprise"])),
            (uid(), contact_ids[12], contacts_data[12][0], channels[2], "We need clarification on SLA terms", ts(0), 1, agent_names[3], "open", json.dumps(["VIP"])),
            (uid(), contact_ids[1], contacts_data[1][0], channels[4], "Missed the call, please reschedule", ts(3), 1, agent_names[1], "open", json.dumps([])),
            (uid(), contact_ids[5], contacts_data[5][0], channels[0], "Reviewing the proposal with our team", ts(2), 0, agent_names[1], "open", json.dumps([])),
        ]
        conv_ids = [c[0] for c in conversations]
        await db.executemany(
            "INSERT INTO conversations VALUES (?,?,?,?,?,?,?,?,?,?)", conversations
        )

        # ---------------------------------------------------------------
        # Messages
        # ---------------------------------------------------------------
        messages = [
            (uid(), conv_ids[0], contact_ids[0], "contact", "Hi, I reviewed the proposal and have a few questions.", ts(2), channels[0]),
            (uid(), conv_ids[0], contact_ids[0], "agent", "Of course! Happy to walk you through everything.", ts(2), channels[0]),
            (uid(), conv_ids[0], contact_ids[0], "contact", "Looking forward to the contract discussion", ts(0), channels[0]),
            (uid(), conv_ids[1], contact_ids[2], "contact", "The analytics features look impressive.", ts(1), channels[1]),
            (uid(), conv_ids[1], contact_ids[2], "agent", "Thanks! Our data warehouse migration module is brand new.", ts(1), channels[1]),
            (uid(), conv_ids[1], contact_ids[2], "contact", "Can we schedule a deeper technical demo?", ts(0), channels[1]),
            (uid(), conv_ids[2], contact_ids[4], "agent", "Here are the revised contract terms you requested.", ts(2), channels[2]),
            (uid(), conv_ids[2], contact_ids[4], "contact", "Negotiation terms look good on our end", ts(1), channels[2]),
            (uid(), conv_ids[4], contact_ids[6], "contact", "We are very interested in the AI assistant features.", ts(3), channels[1]),
            (uid(), conv_ids[4], contact_ids[6], "agent", "I will send over the full technical documentation shortly.", ts(2), channels[1]),
            (uid(), conv_ids[4], contact_ids[6], "contact", "Could you share the technical documentation?", ts(2), channels[1]),
        ]
        await db.executemany(
            "INSERT INTO messages VALUES (?,?,?,?,?,?,?)", messages
        )

        # ---------------------------------------------------------------
        # Timeline Events
        # ---------------------------------------------------------------
        timeline_events = []
        for i, cid in enumerate(contact_ids[:8]):
            timeline_events += [
                (uid(), cid, "email", "Email", f"Initial outreach email sent", ts(30 + i)),
                (uid(), cid, "call", "Phone", f"Discovery call completed — 25 min", ts(25 + i)),
                (uid(), cid, "meeting", "Video", f"Product demo presented to stakeholders", ts(15 + i)),
                (uid(), cid, "note", None, f"Prospect requested custom pricing", ts(10 + i)),
                (uid(), cid, "email", "Email", f"Proposal document shared via email", ts(5 + i)),
            ]
        await db.executemany(
            "INSERT INTO timeline_events VALUES (?,?,?,?,?,?)", timeline_events
        )

        # ---------------------------------------------------------------
        # Notifications
        # ---------------------------------------------------------------
        notifications = [
            (uid(), "lead", "Hot lead detected", "Alexandra Rhodes scored 92 — review now", ts(0), 0, "high"),
            (uid(), "deal", "Deal stage updated", "AI Enterprise Contract moved to Negotiation", ts(0), 0, "high"),
            (uid(), "task", "Task overdue", "Send pricing proposal is 3 days overdue", ts(0), 0, "high"),
            (uid(), "ai", "AI insight ready", "Churn risk detected for 3 contacts", ts(1), 0, "normal"),
            (uid(), "deal", "Deal closed", "Fatima Al-Hassan — $320,000 deal closed!", ts(1), 0, "high"),
            (uid(), "system", "Weekly report ready", "Your CRM performance report is available", ts(2), 1, "low"),
            (uid(), "task", "Task completed", "Quarterly check-in call marked done by Tom Rivers", ts(2), 1, "normal"),
            (uid(), "lead", "New lead assigned", "Grace O'Brien assigned to Elena Vasquez", ts(3), 1, "normal"),
            (uid(), "ai", "Automation triggered", "Follow-up sequence started for 12 leads", ts(4), 1, "low"),
            (uid(), "system", "Integration synced", "LinkedIn CRM sync completed — 8 new leads", ts(5), 1, "low"),
        ]
        await db.executemany(
            "INSERT INTO notifications VALUES (?,?,?,?,?,?,?)", notifications
        )

        # ---------------------------------------------------------------
        # Automation Rules
        # ---------------------------------------------------------------
        automations = [
            (uid(), "Hot Lead Alert", "score > 85", "Notify agent + add 'Hot' tag", 1, 247, 96.2, ts(90)),
            (uid(), "Follow-up Sequence", "no activity > 7 days", "Send follow-up email series", 1, 1834, 78.4, ts(80)),
            (uid(), "Deal Stage Advance", "proposal opened", "Move deal to Proposal stage", 1, 412, 89.1, ts(70)),
            (uid(), "Churn Risk Flag", "no login > 30 days", "Flag contact + notify success team", 1, 89, 72.3, ts(60)),
            (uid(), "Welcome Sequence", "contact created", "Send 3-part welcome email series", 1, 2310, 91.7, ts(50)),
        ]
        await db.executemany(
            "INSERT INTO automation_rules VALUES (?,?,?,?,?,?,?,?)", automations
        )

        await db.commit()
