# Advanced SMMA CRM - Backend API Documentation

## Overview

The backend API is designed to support the Advanced SMMA CRM frontend. This document outlines all the API endpoints, request/response formats, and data models that the frontend expects.

## Base URL

All API endpoints are accessed via `/api` prefix. In development, the frontend proxies these requests to the backend server.

## Authentication

Currently, the API does not require authentication. Future implementations should add JWT-based authentication.

## Data Models

### Contact

```typescript
interface Contact {
  id: string;
  name: string;
  email: string;
  phone?: string;
  company?: string;
  source: string;           // "Manual", "LinkedIn", "Website", etc.
  score: number;            // Lead score 0-100
  stage: string;            // "New Lead", "Contacted", "Qualified", etc.
  tags: string[];
  assigned_agent?: string;
  last_contact?: string;    // ISO date or relative string
  created_at: string;       // ISO date
  revenue: number;
  location?: string;
  lifecycle: string;        // "Lead", "MQL", "SQL", "Customer", etc.
}
```

### Deal

```typescript
interface Deal {
  id: string;
  title: string;
  contact_id?: string;
  contact_name?: string;
  value: number;            // Deal value in dollars
  stage: string;            // "New Lead", "Contacted", "Qualified", "Proposal Sent", "Negotiation", "Won", "Lost"
  probability: number;      // Win probability 0-100
  assigned_agent?: string;
  close_date?: string;      // ISO date
  created_at: string;       // ISO date
  channel: string;          // "Email", "LinkedIn", "WhatsApp", etc.
}
```

### Task

```typescript
interface Task {
  id: string;
  title: string;
  contact_id?: string;
  contact_name?: string;
  assigned_agent?: string;
  due_date?: string;        // ISO date or relative string
  priority: string;         // "Low", "Medium", "High", "Critical"
  status: string;           // "Pending", "In Progress", "Done", "Overdue"
  type: string;             // "Follow-up", "Demo", "Proposal", "Call", "Email"
  automated: boolean;       // Whether task was auto-generated
  created_at: string;       // ISO date
}
```

### Conversation

```typescript
interface Conversation {
  id: string;
  contact_id?: string;
  contact_name?: string;
  channel: string;          // "instagram", "whatsapp", "facebook", "email"
  last_message?: string;
  timestamp: string;
  unread_count: number;
  assigned_agent?: string;
  status: string;           // "open", "pending", "resolved"
  tags: string[];
}
```

### Message

```typescript
interface Message {
  id: string;
  conversation_id: string;
  contact_id?: string;
  sender: string;           // Contact name or "Agent"
  content: string;
  timestamp: string;
  channel: string;
}
```

### Agent

```typescript
interface Agent {
  id: string;
  name: string;
  email: string;
  status: string;           // "Online", "Away", "Offline"
  leads_assigned: number;
  response_time: number;    // Average response time in hours
  conversion_rate: number;  // Percentage 0-100
  revenue: number;          // Total revenue generated
  follow_up_rate: number;   // Percentage 0-100
  badges: string[];         // ["Top Closer", "Fast Responder", etc.]
  rank: number;             // Leaderboard rank
  created_at: string;       // ISO date
}
```

### Notification

```typescript
interface Notification {
  id: string;
  type: string;             // "hot_lead", "sla_breach", "new_message", "task_due", "deal_won"
  title: string;
  description?: string;
  timestamp: string;
  read: boolean;
  priority: string;         // "high", "medium", "low"
}
```

### Timeline Event

```typescript
interface TimelineEvent {
  id: string;
  contact_id: string;
  type: string;             // "message", "email", "call", "ad_view", "stage_change", "score_change"
  channel?: string;
  description: string;
  timestamp: string;
}
```

## API Endpoints

### Contacts

#### List Contacts
```
GET /api/contacts
```

Query Parameters:
- `search` (optional): Search by name, email, or company
- `stage` (optional): Filter by stage
- `lifecycle` (optional): Filter by lifecycle
- `source` (optional): Filter by source
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 20)

Response:
```json
{
  "items": [Contact],
  "total": 150,
  "page": 1,
  "limit": 20,
  "pages": 8
}
```

#### Get Contact
```
GET /api/contacts/{id}
```

Response: `Contact`

#### Create Contact
```
POST /api/contacts
```

Request Body: `ContactCreate` (Contact without id and created_at)

Response: `Contact`

#### Update Contact
```
PUT /api/contacts/{id}
```

Request Body: `ContactUpdate` (Partial Contact)

Response: `Contact`

#### Delete Contact
```
DELETE /api/contacts/{id}
```

Response: 204 No Content

#### Get Contact Timeline
```
GET /api/contacts/{id}/timeline
```

Response: `TimelineEvent[]`

#### Add Timeline Event
```
POST /api/contacts/{id}/timeline
```

Request Body:
```json
{
  "type": "message",
  "channel": "whatsapp",
  "description": "Sent inquiry about pricing"
}
```

Response: `TimelineEvent`

### Deals

#### List Deals
```
GET /api/deals
```

Query Parameters:
- `stage` (optional): Filter by stage
- `contact_id` (optional): Filter by contact
- `agent` (optional): Filter by assigned agent

Response: `Deal[]`

#### Get Deal
```
GET /api/deals/{id}
```

Response: `Deal`

#### Create Deal
```
POST /api/deals
```

Request Body: `DealCreate`

Response: `Deal`

#### Update Deal
```
PUT /api/deals/{id}
```

Request Body: `DealUpdate`

Response: `Deal`

#### Delete Deal
```
DELETE /api/deals/{id}
```

Response: 204 No Content

#### Move Deal Stage
```
PATCH /api/deals/{id}/stage
```

Request Body:
```json
{
  "stage": "Qualified"
}
```

Response: `Deal`

### Tasks

#### List Tasks
```
GET /api/tasks
```

Query Parameters:
- `status` (optional): Filter by status
- `agent` (optional): Filter by assigned agent
- `contact_id` (optional): Filter by contact
- `priority` (optional): Filter by priority

Response: `Task[]`

#### Get Task
```
GET /api/tasks/{id}
```

Response: `Task`

#### Create Task
```
POST /api/tasks
```

Request Body: `TaskCreate`

Response: `Task`

#### Update Task
```
PUT /api/tasks/{id}
```

Request Body: `TaskUpdate`

Response: `Task`

#### Delete Task
```
DELETE /api/tasks/{id}
```

Response: 204 No Content

#### Toggle Task Completion
```
PATCH /api/tasks/{id}/toggle
```

Response: `Task`

### Conversations

#### List Conversations
```
GET /api/conversations
```

Query Parameters:
- `status` (optional): Filter by status
- `channel` (optional): Filter by channel
- `agent` (optional): Filter by assigned agent

Response: `Conversation[]`

#### Get Conversation
```
GET /api/conversations/{id}
```

Response: `Conversation`

#### Create Conversation
```
POST /api/conversations
```

Request Body: `ConversationCreate`

Response: `Conversation`

#### Update Conversation
```
PUT /api/conversations/{id}
```

Request Body: `ConversationUpdate`

Response: `Conversation`

#### Delete Conversation
```
DELETE /api/conversations/{id}
```

Response: 204 No Content

#### Get Messages
```
GET /api/conversations/{id}/messages
```

Response: `Message[]`

#### Send Message
```
POST /api/conversations/{id}/messages
```

Request Body:
```json
{
  "sender": "Agent",
  "content": "Hello! How can I help you?",
  "channel": "whatsapp"
}
```

Response: `Message`

#### Resolve Conversation
```
PATCH /api/conversations/{id}/resolve
```

Response: `Conversation`

#### Mark as Read
```
PATCH /api/conversations/{id}/read
```

Response: `Conversation`

### Agents

#### List Agents
```
GET /api/agents
```

Query Parameters:
- `status` (optional): Filter by status

Response: `Agent[]`

#### Get Agent
```
GET /api/agents/{id}
```

Response: `Agent`

#### Create Agent
```
POST /api/agents
```

Request Body: `AgentCreate`

Response: `Agent`

#### Update Agent
```
PUT /api/agents/{id}
```

Request Body: `AgentUpdate`

Response: `Agent`

#### Delete Agent
```
DELETE /api/agents/{id}
```

Response: 204 No Content

### Notifications

#### List Notifications
```
GET /api/notifications
```

Response: `Notification[]`

#### Create Notification
```
POST /api/notifications
```

Request Body:
```json
{
  "type": "hot_lead",
  "title": "New Hot Lead",
  "description": "John Doe just reached score 85",
  "priority": "high"
}
```

Response: `Notification`

#### Mark as Read
```
PATCH /api/notifications/{id}/read
```

Response: `Notification`

#### Mark All as Read
```
PATCH /api/notifications/read-all
```

Response:
```json
{
  "message": "All notifications marked as read"
}
```

#### Delete Notification
```
DELETE /api/notifications/{id}
```

Response: 204 No Content

### Analytics

#### Get All Analytics
```
GET /api/analytics
```

Response:
```json
{
  "kpis": {
    "total_contacts": 150,
    "total_deals": 45,
    "total_revenue": 1250000,
    "open_tasks": 23,
    "conversion_rate": 32,
    "avg_deal_value": 28000,
    "active_conversations": 12,
    "agents_online": 5
  },
  "revenue_trend": [
    { "month": "Jan", "revenue": 95000, "forecast": 90000 }
  ],
  "pipeline_stages": [
    { "stage": "New Lead", "count": 48, "value": 186000 }
  ],
  "channel_mix": [
    { "channel": "Instagram", "count": 54, "percentage": 38 }
  ]
}
```

#### Get KPIs
```
GET /api/analytics/kpis
```

Response: `KPIs`

#### Get Revenue Trend
```
GET /api/analytics/revenue
```

Response: `RevenuePoint[]`

#### Get Pipeline Stages
```
GET /api/analytics/pipeline
```

Response: `PipelineStage[]`

#### Get Channel Mix
```
GET /api/analytics/channels
```

Response: `ChannelMix[]`

## Error Responses

All errors return a JSON response with the following format:

```json
{
  "detail": "Error message describing what went wrong"
}
```

Common HTTP status codes:
- `400` - Bad Request (validation errors)
- `404` - Not Found
- `422` - Unprocessable Entity (validation errors)
- `500` - Internal Server Error

## Implementation Notes

### Database Schema

The backend should implement tables for:
- `contacts` - Main contact information
- `deals` - Sales pipeline deals
- `tasks` - Task management
- `conversations` - Chat threads
- `messages` - Individual messages within conversations
- `agents` - CRM agent/user accounts
- `notifications` - User notifications
- `timeline_events` - Contact activity history

### Relationships

- A Contact can have multiple Deals
- A Contact can have multiple Conversations
- A Conversation has multiple Messages
- An Agent can be assigned to multiple Contacts, Deals, Tasks, and Conversations
- Timeline Events belong to a Contact

### Recommended Tech Stack

For Python/FastAPI:
- FastAPI for the web framework
- SQLAlchemy or Tortoise ORM for database
- PostgreSQL for production database
- Pydantic for data validation
- UUID for primary keys

### Sample FastAPI Setup

```python
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import List, Optional
import uuid

app = FastAPI(title="SMMA CRM API")

class ContactCreate(BaseModel):
    name: str
    email: str
    phone: Optional[str] = None
    company: Optional[str] = None
    source: str = "Manual"
    score: int = 50
    stage: str = "New Lead"
    lifecycle: str = "Lead"

@app.post("/api/contacts")
async def create_contact(data: ContactCreate):
    # Create contact in database
    contact = {
        "id": str(uuid.uuid4()),
        **data.dict(),
        "created_at": datetime.utcnow().isoformat()
    }
    return contact
```

## Testing

Recommended testing approach:
1. Unit tests for individual endpoints
2. Integration tests for CRUD operations
3. E2E tests for complete workflows

Example test:
```python
def test_create_contact():
    response = client.post("/api/contacts", json={
        "name": "Test User",
        "email": "test@example.com"
    })
    assert response.status_code == 200
    assert response.json()["name"] == "Test User"
```
