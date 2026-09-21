# Advanced SMMA CRM - Frontend Documentation

## Overview

The Advanced SMMA (Social Media Marketing Agency) CRM is a modern, full-featured customer relationship management system built with Next.js 16, React 19, and TypeScript. The frontend provides a comprehensive interface for managing contacts, deals, tasks, conversations, agents, and analytics.

## Tech Stack

- **Framework**: Next.js 16 with App Router
- **UI Components**: shadcn/ui with Radix primitives
- **Styling**: Tailwind CSS v4
- **State Management**: SWR for data fetching and caching
- **Forms**: React Hook Form with Zod validation
- **Charts**: Recharts
- **Notifications**: Sonner toast notifications

## Project Structure

```
frontend/
├── app/
│   ├── layout.tsx       # Root layout with theme provider
│   ├── page.tsx         # Main CRM application entry
│   └── globals.css      # Global styles and Tailwind config
├── components/
│   ├── crm/
│   │   ├── forms/       # CRUD form components
│   │   │   ├── agent-form.tsx
│   │   │   ├── contact-form.tsx
│   │   │   ├── deal-form.tsx
│   │   │   └── task-form.tsx
│   │   ├── views/       # Main view components
│   │   │   ├── agents.tsx
│   │   │   ├── analytics.tsx
│   │   │   ├── contacts.tsx
│   │   │   ├── conversations.tsx
│   │   │   ├── dashboard.tsx
│   │   │   ├── notifications.tsx
│   │   │   ├── pipeline.tsx
│   │   │   ├── tasks.tsx
│   │   │   └── ...more views
│   │   ├── header.tsx   # App header
│   │   └── sidebar.tsx  # Navigation sidebar
│   ├── ui/              # shadcn/ui components
│   └── theme-provider.tsx
├── lib/
│   ├── api.ts           # API client with typed endpoints
│   ├── crm-data.ts      # Mock data and type definitions
│   └── utils.ts         # Utility functions
└── hooks/               # Custom React hooks
```

## API Client (`lib/api.ts`)

The API client provides typed access to all backend endpoints. All requests are made to `/api/*` which is proxied to the FastAPI backend.

### Usage

```typescript
import { api } from "@/lib/api";

// List contacts with pagination
const { items, total, page } = await api.contacts.list({ search: "john", page: 1 });

// Create a contact
const contact = await api.contacts.create({ name: "John Doe", email: "john@example.com" });

// Update a contact
await api.contacts.update(contactId, { score: 85 });

// Delete a contact
await api.contacts.delete(contactId);
```

### Available Endpoints

#### Contacts
- `api.contacts.list(params?)` - List contacts with filtering and pagination
- `api.contacts.get(id)` - Get a single contact
- `api.contacts.create(data)` - Create a new contact
- `api.contacts.update(id, data)` - Update a contact
- `api.contacts.delete(id)` - Delete a contact
- `api.contacts.getTimeline(id)` - Get contact activity timeline
- `api.contacts.addTimelineEvent(id, data)` - Add timeline event

#### Deals
- `api.deals.list(params?)` - List deals with filtering
- `api.deals.get(id)` - Get a single deal
- `api.deals.create(data)` - Create a new deal
- `api.deals.update(id, data)` - Update a deal
- `api.deals.delete(id)` - Delete a deal
- `api.deals.moveStage(id, stage)` - Move deal to a different stage

#### Tasks
- `api.tasks.list(params?)` - List tasks with filtering
- `api.tasks.get(id)` - Get a single task
- `api.tasks.create(data)` - Create a new task
- `api.tasks.update(id, data)` - Update a task
- `api.tasks.delete(id)` - Delete a task
- `api.tasks.toggle(id)` - Toggle task completion

#### Conversations
- `api.conversations.list(params?)` - List conversations with filtering
- `api.conversations.get(id)` - Get a single conversation
- `api.conversations.create(data)` - Create a new conversation
- `api.conversations.update(id, data)` - Update a conversation
- `api.conversations.delete(id)` - Delete a conversation
- `api.conversations.getMessages(id)` - Get messages in a conversation
- `api.conversations.sendMessage(id, data)` - Send a message
- `api.conversations.resolve(id)` - Mark conversation as resolved
- `api.conversations.markRead(id)` - Mark conversation as read

#### Agents
- `api.agents.list(params?)` - List agents
- `api.agents.get(id)` - Get a single agent
- `api.agents.create(data)` - Create a new agent
- `api.agents.update(id, data)` - Update an agent
- `api.agents.delete(id)` - Delete an agent

#### Notifications
- `api.notifications.list()` - List all notifications
- `api.notifications.create(data)` - Create a notification
- `api.notifications.markRead(id)` - Mark notification as read
- `api.notifications.markAllRead()` - Mark all notifications as read
- `api.notifications.delete(id)` - Delete a notification

#### Analytics
- `api.analytics.all()` - Get all analytics data
- `api.analytics.kpis()` - Get key performance indicators
- `api.analytics.revenue()` - Get revenue trend data
- `api.analytics.pipeline()` - Get pipeline stage data
- `api.analytics.channels()` - Get channel mix data

## View Components

### ContactsView
A full-featured contact management view with:
- Searchable and filterable contact table
- Lead scoring with hot/warm/cold indicators
- Contact detail panel with activity timeline
- Create, edit, and delete contacts via dialogs

### PipelineView
A Kanban-style pipeline board with:
- Drag-and-drop deal stages (New Lead, Contacted, Qualified, Proposal Sent, Negotiation, Won, Lost)
- Deal cards showing value, probability, and assigned agent
- Quick stage movement via dropdown menu
- Pipeline metrics summary

### TasksView
A task management interface with:
- Task cards with priority, status, and due date
- Toggle completion with animated checkbox
- Filter by status (all, pending, in-progress, overdue, completed)
- Auto-generated task rules display

### ConversationsView
A chat-style inbox with:
- Conversation list with unread counts
- Real-time message display
- AI-suggested replies
- Mark as read and resolve actions
- Contact info sidebar

### NotificationsView
A notification center with:
- Grouped notifications (Today, Earlier)
- Mark as read/unread actions
- Filter by all, unread, or high priority
- Notification preferences management

### AgentsView
An agent management dashboard with:
- Leaderboard with podium display
- Agent cards with performance metrics
- Radar chart for detailed performance profile
- CRUD operations for agent management

## Data Fetching with SWR

All views use SWR for data fetching, which provides:
- Automatic caching and revalidation
- Optimistic UI updates
- Error handling
- Loading states

### Example Usage

```typescript
import useSWR from "swr";
import { api } from "@/lib/api";

function ContactsView() {
  const { data, error, isLoading, mutate } = useSWR(
    "contacts-list",
    () => api.contacts.list({ limit: 100 })
  );

  // After mutation, call mutate() to refresh data
  const handleCreate = async (data) => {
    await api.contacts.create(data);
    mutate(); // Revalidate the cache
  };
}
```

## Form Components

All forms use React Hook Form with Zod validation:

```typescript
const schema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email"),
  score: z.coerce.number().min(0).max(100),
});

const { register, handleSubmit, formState: { errors } } = useForm({
  resolver: zodResolver(schema),
});
```

## Styling Guidelines

The application uses a consistent design system:

- **Colors**: Primary (purple/blue), destructive (red), muted grays
- **Typography**: Clean sans-serif with clear hierarchy
- **Spacing**: Consistent padding (p-3, p-4, p-6) and gaps (gap-2, gap-3, gap-4)
- **Components**: Rounded corners (rounded-lg), subtle borders, hover states

## Running the Frontend

```bash
cd frontend
pnpm install
pnpm dev
```

The development server runs at `http://localhost:3000`.

## Environment Variables

No environment variables are required for the frontend. The API client automatically proxies requests to `/api/*`.

## Error Handling

The API client throws `ApiError` for non-2xx responses:

```typescript
import { ApiError } from "@/lib/api";

try {
  await api.contacts.create(data);
} catch (err) {
  if (err instanceof ApiError) {
    toast.error(err.message);
  }
}
```
