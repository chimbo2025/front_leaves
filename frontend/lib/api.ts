/**
 * api.ts
 * ------
 * Typed API client for the Advanced CRM backend.
 * All requests go to /api/* which Vercel routes to the FastAPI service.
 *
 * Usage:
 *   import { api } from "@/lib/api"
 *   const contacts = await api.contacts.list({ search: "alex" })
 *   const contact  = await api.contacts.create({ name: "...", email: "..." })
 */

const BASE = "/api";

// ---------------------------------------------------------------------------
// Types (mirrored from backend/models.py)
// ---------------------------------------------------------------------------

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  pages: number;
}

export interface Contact {
  id: string;
  name: string;
  email: string;
  phone?: string;
  company?: string;
  source: string;
  score: number;
  stage: string;
  tags: string[];
  assigned_agent?: string;
  last_contact?: string;
  created_at: string;
  revenue: number;
  location?: string;
  lifecycle: string;
}

export type ContactCreate = Omit<Contact, "id" | "created_at">;
export type ContactUpdate = Partial<ContactCreate>;

export interface Deal {
  id: string;
  title: string;
  contact_id?: string;
  contact_name?: string;
  value: number;
  stage: string;
  probability: number;
  assigned_agent?: string;
  close_date?: string;
  created_at: string;
  channel: string;
}

export type DealCreate = Omit<Deal, "id" | "created_at">;
export type DealUpdate = Partial<DealCreate>;

export interface Task {
  id: string;
  title: string;
  contact_id?: string;
  contact_name?: string;
  assigned_agent?: string;
  due_date?: string;
  priority: string;
  status: string;
  type: string;
  automated: boolean;
  created_at: string;
}

export type TaskCreate = Omit<Task, "id" | "created_at">;
export type TaskUpdate = Partial<TaskCreate>;

export interface Conversation {
  id: string;
  contact_id?: string;
  contact_name?: string;
  channel: string;
  last_message?: string;
  timestamp: string;
  unread_count: number;
  assigned_agent?: string;
  status: string;
  tags: string[];
}

export type ConversationCreate = Omit<Conversation, "id" | "timestamp" | "unread_count">;
export type ConversationUpdate = Partial<ConversationCreate>;

export interface Message {
  id: string;
  conversation_id: string;
  contact_id?: string;
  sender: string;
  content: string;
  timestamp: string;
  channel: string;
}

export interface Agent {
  id: string;
  name: string;
  email: string;
  status: string;
  leads_assigned: number;
  response_time: number;
  conversion_rate: number;
  revenue: number;
  follow_up_rate: number;
  badges: string[];
  rank: number;
  created_at: string;
}

export type AgentCreate = Omit<Agent, "id" | "rank" | "created_at">;
export type AgentUpdate = Partial<AgentCreate>;

export interface TimelineEvent {
  id: string;
  contact_id: string;
  type: string;
  channel?: string;
  description: string;
  timestamp: string;
}

export interface Notification {
  id: string;
  type: string;
  title: string;
  description?: string;
  timestamp: string;
  read: boolean;
  priority: string;
}

export interface KPIs {
  total_contacts: number;
  total_deals: number;
  total_revenue: number;
  open_tasks: number;
  conversion_rate: number;
  avg_deal_value: number;
  active_conversations: number;
  agents_online: number;
}

export interface RevenuePoint {
  month: string;
  revenue: number;
  forecast: number;
}

export interface PipelineStage {
  stage: string;
  count: number;
  value: number;
}

export interface ChannelMix {
  channel: string;
  count: number;
  percentage: number;
}

export interface AnalyticsData {
  kpis: KPIs;
  revenue_trend: RevenuePoint[];
  pipeline_stages: PipelineStage[];
  channel_mix: ChannelMix[];
}

// ---------------------------------------------------------------------------
// Core fetch wrapper
// ---------------------------------------------------------------------------

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = "ApiError";
  }
}

async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${BASE}${path}`;
  const res = await fetch(url, {
    headers: { "Content-Type": "application/json", ...options.headers },
    ...options,
  });

  if (res.status === 204) return undefined as T;

  const data = await res.json().catch(() => ({ detail: res.statusText }));

  if (!res.ok) {
    throw new ApiError(res.status, data?.detail ?? "Request failed");
  }

  return data as T;
}

function qs(params: Record<string, string | number | boolean | undefined>): string {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== "") p.set(k, String(v));
  }
  const s = p.toString();
  return s ? `?${s}` : "";
}

// ---------------------------------------------------------------------------
// API client
// ---------------------------------------------------------------------------

export const api = {
  // -------------------------------------------------------------------------
  // Contacts
  // -------------------------------------------------------------------------
  contacts: {
    list: (params?: {
      search?: string;
      stage?: string;
      lifecycle?: string;
      source?: string;
      page?: number;
      limit?: number;
    }) =>
      request<PaginatedResponse<Contact>>(`/contacts${qs(params ?? {})}`),

    get: (id: string) => request<Contact>(`/contacts/${id}`),

    create: (body: ContactCreate) =>
      request<Contact>("/contacts", {
        method: "POST",
        body: JSON.stringify(body),
      }),

    update: (id: string, body: ContactUpdate) =>
      request<Contact>(`/contacts/${id}`, {
        method: "PUT",
        body: JSON.stringify(body),
      }),

    delete: (id: string) =>
      request<void>(`/contacts/${id}`, { method: "DELETE" }),

    getTimeline: (id: string) =>
      request<TimelineEvent[]>(`/contacts/${id}/timeline`),

    addTimelineEvent: (
      id: string,
      body: { type: string; channel?: string; description: string }
    ) =>
      request<TimelineEvent>(`/contacts/${id}/timeline`, {
        method: "POST",
        body: JSON.stringify(body),
      }),
  },

  // -------------------------------------------------------------------------
  // Deals
  // -------------------------------------------------------------------------
  deals: {
    list: (params?: {
      stage?: string;
      contact_id?: string;
      agent?: string;
    }) =>
      request<Deal[]>(`/deals${qs(params ?? {})}`),

    get: (id: string) => request<Deal>(`/deals/${id}`),

    create: (body: DealCreate) =>
      request<Deal>("/deals", {
        method: "POST",
        body: JSON.stringify(body),
      }),

    update: (id: string, body: DealUpdate) =>
      request<Deal>(`/deals/${id}`, {
        method: "PUT",
        body: JSON.stringify(body),
      }),

    delete: (id: string) =>
      request<void>(`/deals/${id}`, { method: "DELETE" }),

    moveStage: (id: string, stage: string) =>
      request<Deal>(`/deals/${id}/stage`, {
        method: "PATCH",
        body: JSON.stringify({ stage }),
      }),
  },

  // -------------------------------------------------------------------------
  // Tasks
  // -------------------------------------------------------------------------
  tasks: {
    list: (params?: {
      status?: string;
      agent?: string;
      contact_id?: string;
      priority?: string;
    }) =>
      request<Task[]>(`/tasks${qs(params ?? {})}`),

    get: (id: string) => request<Task>(`/tasks/${id}`),

    create: (body: TaskCreate) =>
      request<Task>("/tasks", {
        method: "POST",
        body: JSON.stringify(body),
      }),

    update: (id: string, body: TaskUpdate) =>
      request<Task>(`/tasks/${id}`, {
        method: "PUT",
        body: JSON.stringify(body),
      }),

    delete: (id: string) =>
      request<void>(`/tasks/${id}`, { method: "DELETE" }),

    toggle: (id: string) =>
      request<Task>(`/tasks/${id}/toggle`, { method: "PATCH" }),
  },

  // -------------------------------------------------------------------------
  // Conversations
  // -------------------------------------------------------------------------
  conversations: {
    list: (params?: {
      status?: string;
      channel?: string;
      agent?: string;
    }) =>
      request<Conversation[]>(`/conversations${qs(params ?? {})}`),

    get: (id: string) => request<Conversation>(`/conversations/${id}`),

    create: (body: ConversationCreate) =>
      request<Conversation>("/conversations", {
        method: "POST",
        body: JSON.stringify(body),
      }),

    update: (id: string, body: ConversationUpdate) =>
      request<Conversation>(`/conversations/${id}`, {
        method: "PUT",
        body: JSON.stringify(body),
      }),

    delete: (id: string) =>
      request<void>(`/conversations/${id}`, { method: "DELETE" }),

    getMessages: (id: string) =>
      request<Message[]>(`/conversations/${id}/messages`),

    sendMessage: (
      id: string,
      body: { sender: string; content: string; channel?: string }
    ) =>
      request<Message>(`/conversations/${id}/messages`, {
        method: "POST",
        body: JSON.stringify(body),
      }),

    resolve: (id: string) =>
      request<Conversation>(`/conversations/${id}/resolve`, { method: "PATCH" }),

    markRead: (id: string) =>
      request<Conversation>(`/conversations/${id}/read`, { method: "PATCH" }),
  },

  // -------------------------------------------------------------------------
  // Agents
  // -------------------------------------------------------------------------
  agents: {
    list: (params?: { status?: string }) =>
      request<Agent[]>(`/agents${qs(params ?? {})}`),

    get: (id: string) => request<Agent>(`/agents/${id}`),

    create: (body: AgentCreate) =>
      request<Agent>("/agents", {
        method: "POST",
        body: JSON.stringify(body),
      }),

    update: (id: string, body: AgentUpdate) =>
      request<Agent>(`/agents/${id}`, {
        method: "PUT",
        body: JSON.stringify(body),
      }),

    delete: (id: string) =>
      request<void>(`/agents/${id}`, { method: "DELETE" }),
  },

  // -------------------------------------------------------------------------
  // Analytics
  // -------------------------------------------------------------------------
  analytics: {
    all: () => request<AnalyticsData>("/analytics"),
    kpis: () => request<KPIs>("/analytics/kpis"),
    revenue: () => request<RevenuePoint[]>("/analytics/revenue"),
    pipeline: () => request<PipelineStage[]>("/analytics/pipeline"),
    channels: () => request<ChannelMix[]>("/analytics/channels"),
  },

  // -------------------------------------------------------------------------
  // Notifications
  // -------------------------------------------------------------------------
  notifications: {
    list: () => request<Notification[]>("/notifications"),

    create: (body: { type: string; title: string; description?: string; priority?: string }) =>
      request<Notification>("/notifications", {
        method: "POST",
        body: JSON.stringify(body),
      }),

    markRead: (id: string) =>
      request<Notification>(`/notifications/${id}/read`, { method: "PATCH" }),

    markAllRead: () =>
      request<{ message: string }>("/notifications/read-all", { method: "PATCH" }),

    delete: (id: string) =>
      request<void>(`/notifications/${id}`, { method: "DELETE" }),
  },
};
