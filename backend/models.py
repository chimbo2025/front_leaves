"""
models.py
---------
Pydantic v2 request/response schemas for every CRM entity.
All *Create schemas contain the fields accepted on POST.
All *Update schemas make every field Optional (PATCH semantics via PUT).
All *Response schemas represent what the API returns (always include id).
"""

from __future__ import annotations
from datetime import datetime, timezone
from typing import Any, Generic, List, Optional, TypeVar
from pydantic import BaseModel, EmailStr, Field, field_validator
import json


T = TypeVar("T")


# ---------------------------------------------------------------------------
# Shared helpers
# ---------------------------------------------------------------------------

def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


class PaginatedResponse(BaseModel, Generic[T]):
    items: List[T]
    total: int
    page: int
    limit: int
    pages: int


class ApiError(BaseModel):
    detail: str
    status_code: int


# ---------------------------------------------------------------------------
# Contact
# ---------------------------------------------------------------------------

class ContactCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=200)
    email: str = Field(..., min_length=3, max_length=320)
    phone: Optional[str] = None
    company: Optional[str] = None
    source: str = "Manual"
    score: int = Field(default=50, ge=0, le=100)
    stage: str = "New Lead"
    tags: List[str] = []
    assigned_agent: Optional[str] = None
    last_contact: Optional[str] = None
    revenue: float = 0.0
    location: Optional[str] = None
    lifecycle: str = "Lead"


class ContactUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    company: Optional[str] = None
    source: Optional[str] = None
    score: Optional[int] = Field(default=None, ge=0, le=100)
    stage: Optional[str] = None
    tags: Optional[List[str]] = None
    assigned_agent: Optional[str] = None
    last_contact: Optional[str] = None
    revenue: Optional[float] = None
    location: Optional[str] = None
    lifecycle: Optional[str] = None


class ContactResponse(BaseModel):
    id: str
    name: str
    email: str
    phone: Optional[str] = None
    company: Optional[str] = None
    source: str
    score: int
    stage: str
    tags: List[str] = []
    assigned_agent: Optional[str] = None
    last_contact: Optional[str] = None
    created_at: str
    revenue: float
    location: Optional[str] = None
    lifecycle: str

    @field_validator("tags", mode="before")
    @classmethod
    def parse_tags(cls, v: Any) -> List[str]:
        if isinstance(v, str):
            try:
                return json.loads(v)
            except Exception:
                return []
        return v or []


# ---------------------------------------------------------------------------
# Deal
# ---------------------------------------------------------------------------

class DealCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=300)
    contact_id: Optional[str] = None
    contact_name: Optional[str] = None
    value: float = Field(default=0.0, ge=0)
    stage: str = "Lead"
    probability: int = Field(default=10, ge=0, le=100)
    assigned_agent: Optional[str] = None
    close_date: Optional[str] = None
    channel: str = "Email"


class DealUpdate(BaseModel):
    title: Optional[str] = None
    contact_id: Optional[str] = None
    contact_name: Optional[str] = None
    value: Optional[float] = None
    stage: Optional[str] = None
    probability: Optional[int] = Field(default=None, ge=0, le=100)
    assigned_agent: Optional[str] = None
    close_date: Optional[str] = None
    channel: Optional[str] = None


class DealStageUpdate(BaseModel):
    stage: str


class DealResponse(BaseModel):
    id: str
    title: str
    contact_id: Optional[str] = None
    contact_name: Optional[str] = None
    value: float
    stage: str
    probability: int
    assigned_agent: Optional[str] = None
    close_date: Optional[str] = None
    created_at: str
    channel: str


# ---------------------------------------------------------------------------
# Task
# ---------------------------------------------------------------------------

class TaskCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=300)
    contact_id: Optional[str] = None
    contact_name: Optional[str] = None
    assigned_agent: Optional[str] = None
    due_date: Optional[str] = None
    priority: str = "Medium"
    status: str = "Pending"
    type: str = "Follow-up"
    automated: bool = False


class TaskUpdate(BaseModel):
    title: Optional[str] = None
    contact_id: Optional[str] = None
    contact_name: Optional[str] = None
    assigned_agent: Optional[str] = None
    due_date: Optional[str] = None
    priority: Optional[str] = None
    status: Optional[str] = None
    type: Optional[str] = None
    automated: Optional[bool] = None


class TaskResponse(BaseModel):
    id: str
    title: str
    contact_id: Optional[str] = None
    contact_name: Optional[str] = None
    assigned_agent: Optional[str] = None
    due_date: Optional[str] = None
    priority: str
    status: str
    type: str
    automated: bool
    created_at: str

    @field_validator("automated", mode="before")
    @classmethod
    def coerce_bool(cls, v: Any) -> bool:
        return bool(v)


# ---------------------------------------------------------------------------
# Conversation & Message
# ---------------------------------------------------------------------------

class ConversationCreate(BaseModel):
    contact_id: Optional[str] = None
    contact_name: Optional[str] = None
    channel: str = "Email"
    last_message: Optional[str] = None
    assigned_agent: Optional[str] = None
    tags: List[str] = []
    status: str = "open"


class ConversationUpdate(BaseModel):
    contact_id: Optional[str] = None
    contact_name: Optional[str] = None
    channel: Optional[str] = None
    last_message: Optional[str] = None
    assigned_agent: Optional[str] = None
    tags: Optional[List[str]] = None
    status: Optional[str] = None


class ConversationResponse(BaseModel):
    id: str
    contact_id: Optional[str] = None
    contact_name: Optional[str] = None
    channel: str
    last_message: Optional[str] = None
    timestamp: str
    unread_count: int
    assigned_agent: Optional[str] = None
    status: str
    tags: List[str] = []

    @field_validator("tags", mode="before")
    @classmethod
    def parse_tags(cls, v: Any) -> List[str]:
        if isinstance(v, str):
            try:
                return json.loads(v)
            except Exception:
                return []
        return v or []


class MessageCreate(BaseModel):
    sender: str = "agent"
    content: str = Field(..., min_length=1)
    channel: Optional[str] = None


class MessageResponse(BaseModel):
    id: str
    conversation_id: str
    contact_id: Optional[str] = None
    sender: str
    content: str
    timestamp: str
    channel: str


# ---------------------------------------------------------------------------
# Agent
# ---------------------------------------------------------------------------

class AgentCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=200)
    email: str
    status: str = "Online"
    leads_assigned: int = 0
    response_time: float = 0.0
    conversion_rate: float = 0.0
    revenue: float = 0.0
    follow_up_rate: float = 0.0
    badges: List[str] = []


class AgentUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None
    status: Optional[str] = None
    leads_assigned: Optional[int] = None
    response_time: Optional[float] = None
    conversion_rate: Optional[float] = None
    revenue: Optional[float] = None
    follow_up_rate: Optional[float] = None
    badges: Optional[List[str]] = None


class AgentResponse(BaseModel):
    id: str
    name: str
    email: str
    status: str
    leads_assigned: int
    response_time: float
    conversion_rate: float
    revenue: float
    follow_up_rate: float
    badges: List[str] = []
    rank: int
    created_at: str

    @field_validator("badges", mode="before")
    @classmethod
    def parse_badges(cls, v: Any) -> List[str]:
        if isinstance(v, str):
            try:
                return json.loads(v)
            except Exception:
                return []
        return v or []


# ---------------------------------------------------------------------------
# Timeline
# ---------------------------------------------------------------------------

class TimelineEventCreate(BaseModel):
    type: str
    channel: Optional[str] = None
    description: str


class TimelineEventResponse(BaseModel):
    id: str
    contact_id: str
    type: str
    channel: Optional[str] = None
    description: str
    timestamp: str


# ---------------------------------------------------------------------------
# Notification
# ---------------------------------------------------------------------------

class NotificationCreate(BaseModel):
    type: str = "info"
    title: str
    description: Optional[str] = None
    priority: str = "normal"


class NotificationResponse(BaseModel):
    id: str
    type: str
    title: str
    description: Optional[str] = None
    timestamp: str
    read: bool
    priority: str

    @field_validator("read", mode="before")
    @classmethod
    def coerce_bool(cls, v: Any) -> bool:
        return bool(v)


# ---------------------------------------------------------------------------
# Analytics
# ---------------------------------------------------------------------------

class KPIResponse(BaseModel):
    total_contacts: int
    total_deals: int
    total_revenue: float
    open_tasks: int
    conversion_rate: float
    avg_deal_value: float
    active_conversations: int
    agents_online: int


class RevenuePoint(BaseModel):
    month: str
    revenue: float
    forecast: float


class PipelineStage(BaseModel):
    stage: str
    count: int
    value: float


class ChannelMix(BaseModel):
    channel: str
    count: int
    percentage: float


class AnalyticsResponse(BaseModel):
    kpis: KPIResponse
    revenue_trend: List[RevenuePoint]
    pipeline_stages: List[PipelineStage]
    channel_mix: List[ChannelMix]
