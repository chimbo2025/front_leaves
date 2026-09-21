export type LeadScore = "hot" | "warm" | "cold";
export type LeadStage = "New Lead" | "Contacted" | "Qualified" | "Proposal Sent" | "Negotiation" | "Won" | "Lost";
export type Channel = "instagram" | "whatsapp" | "facebook" | "email" | "web" | "ads";
export type Priority = "high" | "medium" | "low";
export type AgentStatus = "online" | "busy" | "offline";

export interface Contact {
  id: string;
  name: string;
  email: string;
  phone: string;
  avatar?: string;
  company: string;
  source: Channel;
  score: number;
  stage: LeadStage;
  tags: string[];
  assignedAgent: string;
  lastContact: string;
  createdAt: string;
  revenue: number;
  location: string;
  lifecycle: "New Lead" | "Engaged" | "Qualified" | "Customer" | "Repeat Buyer" | "VIP";
}

export interface Deal {
  id: string;
  title: string;
  contactId: string;
  contactName: string;
  value: number;
  stage: LeadStage;
  probability: number;
  assignedAgent: string;
  closeDate: string;
  createdAt: string;
  channel: Channel;
}

export interface Message {
  id: string;
  contactId: string;
  contactName: string;
  channel: Channel;
  content: string;
  timestamp: string;
  isUnread: boolean;
  isInternal: boolean;
  agentId?: string;
  avatar?: string;
}

export interface Conversation {
  id: string;
  contactId: string;
  contactName: string;
  channel: Channel;
  lastMessage: string;
  timestamp: string;
  unreadCount: number;
  assignedAgent: string;
  status: "open" | "pending" | "resolved";
  tags: string[];
  avatar?: string;
}

export interface Agent {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  status: AgentStatus;
  leadsAssigned: number;
  responseTime: string;
  conversionRate: number;
  revenue: number;
  followUpRate: number;
  badges: string[];
  rank: number;
}

export interface Task {
  id: string;
  title: string;
  contactId?: string;
  contactName?: string;
  assignedAgent: string;
  dueDate: string;
  priority: Priority;
  status: "pending" | "in-progress" | "completed" | "overdue";
  type: "follow-up" | "call" | "email" | "meeting" | "demo";
  automated: boolean;
}

export interface TimelineEvent {
  id: string;
  contactId: string;
  type: "message" | "email" | "call" | "ad_view" | "link_click" | "stage_change" | "score_change" | "task";
  channel?: Channel;
  description: string;
  timestamp: string;
  metadata?: Record<string, string | number>;
}

export interface Segment {
  id: string;
  name: string;
  count: number;
  criteria: string;
  color: string;
  trend: number;
}

export interface Notification {
  id: string;
  type: "hot_lead" | "sla_breach" | "new_message" | "task_due" | "deal_won";
  title: string;
  description: string;
  timestamp: string;
  read: boolean;
  priority: Priority;
}

// ─── MOCK DATA ────────────────────────────────────────────────────────────────

export const contacts: Contact[] = [
  { id: "c1", name: "Sarah Johnson", email: "sarah.j@techcorp.com", phone: "+1 555-0101", company: "TechCorp", source: "instagram", score: 92, stage: "Negotiation", tags: ["VIP", "ecommerce"], assignedAgent: "Marcus Chen", lastContact: "2 hours ago", createdAt: "2024-01-15", revenue: 12400, location: "New York", lifecycle: "Customer" },
  { id: "c2", name: "Ahmed Al-Rashid", email: "ahmed@growthco.io", phone: "+971 50 123 4567", company: "GrowthCo", source: "whatsapp", score: 78, stage: "Qualified", tags: ["warm", "saas"], assignedAgent: "Sofia Lopez", lastContact: "1 day ago", createdAt: "2024-02-03", revenue: 8200, location: "Dubai", lifecycle: "Qualified" },
  { id: "c3", name: "Emily Chen", email: "emily.chen@nexus.ai", phone: "+1 555-0203", company: "Nexus AI", source: "ads", score: 95, stage: "Proposal Sent", tags: ["HOT", "ai"], assignedAgent: "Marcus Chen", lastContact: "30 min ago", createdAt: "2024-03-01", revenue: 24800, location: "San Francisco", lifecycle: "VIP" },
  { id: "c4", name: "Carlos Mendez", email: "carlos@velostore.mx", phone: "+52 55 1234 5678", company: "VeloStore", source: "facebook", score: 45, stage: "Contacted", tags: ["warm", "retail"], assignedAgent: "Priya Sharma", lastContact: "3 days ago", createdAt: "2024-02-20", revenue: 3100, location: "Mexico City", lifecycle: "Engaged" },
  { id: "c5", name: "Aisha Okonkwo", email: "aisha@buildfast.ng", phone: "+234 801 234 5678", company: "BuildFast", source: "web", score: 18, stage: "New Lead", tags: ["cold", "construction"], assignedAgent: "Unassigned", lastContact: "1 week ago", createdAt: "2024-03-10", revenue: 0, location: "Lagos", lifecycle: "New Lead" },
  { id: "c6", name: "James Park", email: "james.park@fintechwave.kr", phone: "+82 10 1234 5678", company: "FintechWave", source: "email", score: 67, stage: "Qualified", tags: ["fintech", "warm"], assignedAgent: "Sofia Lopez", lastContact: "5 hours ago", createdAt: "2024-01-28", revenue: 6700, location: "Seoul", lifecycle: "Qualified" },
  { id: "c7", name: "Laura Martinez", email: "laura@pixelstudio.es", phone: "+34 91 123 4567", company: "PixelStudio", source: "instagram", score: 88, stage: "Won", tags: ["creative", "HOT"], assignedAgent: "Priya Sharma", lastContact: "Yesterday", createdAt: "2024-01-10", revenue: 18900, location: "Madrid", lifecycle: "Repeat Buyer" },
  { id: "c8", name: "David Osei", email: "david@logisticspro.gh", phone: "+233 20 123 4567", company: "LogisticsPro", source: "whatsapp", score: 55, stage: "Negotiation", tags: ["logistics", "warm"], assignedAgent: "Marcus Chen", lastContact: "4 hours ago", createdAt: "2024-02-14", revenue: 5500, location: "Accra", lifecycle: "Customer" },
];

export const deals: Deal[] = [
  { id: "d1", title: "TechCorp Enterprise License", contactId: "c1", contactName: "Sarah Johnson", value: 24000, stage: "Negotiation", probability: 85, assignedAgent: "Marcus Chen", closeDate: "2024-04-30", createdAt: "2024-03-01", channel: "instagram" },
  { id: "d2", title: "GrowthCo SaaS Suite", contactId: "c2", contactName: "Ahmed Al-Rashid", value: 12000, stage: "Qualified", probability: 65, assignedAgent: "Sofia Lopez", closeDate: "2024-05-15", createdAt: "2024-02-20", channel: "whatsapp" },
  { id: "d3", title: "Nexus AI Premium Plan", contactId: "c3", contactName: "Emily Chen", value: 36000, stage: "Proposal Sent", probability: 90, assignedAgent: "Marcus Chen", closeDate: "2024-04-20", createdAt: "2024-03-05", channel: "ads" },
  { id: "d4", title: "VeloStore Starter Pack", contactId: "c4", contactName: "Carlos Mendez", value: 4800, stage: "Contacted", probability: 40, assignedAgent: "Priya Sharma", closeDate: "2024-05-30", createdAt: "2024-03-08", channel: "facebook" },
  { id: "d5", title: "BuildFast Automation Bundle", contactId: "c5", contactName: "Aisha Okonkwo", value: 2400, stage: "New Lead", probability: 15, assignedAgent: "Unassigned", closeDate: "2024-06-15", createdAt: "2024-03-12", channel: "web" },
  { id: "d6", title: "FintechWave API Access", contactId: "c6", contactName: "James Park", value: 9600, stage: "Qualified", probability: 70, assignedAgent: "Sofia Lopez", closeDate: "2024-05-10", createdAt: "2024-02-28", channel: "email" },
  { id: "d7", title: "PixelStudio Creative Suite", contactId: "c7", contactName: "Laura Martinez", value: 18000, stage: "Won", probability: 100, assignedAgent: "Priya Sharma", closeDate: "2024-03-20", createdAt: "2024-01-20", channel: "instagram" },
  { id: "d8", title: "LogisticsPro Fleet Manager", contactId: "c8", contactName: "David Osei", value: 7200, stage: "Negotiation", probability: 75, assignedAgent: "Marcus Chen", closeDate: "2024-04-25", createdAt: "2024-02-15", channel: "whatsapp" },
  { id: "d9", title: "TechCorp Mobile Add-on", contactId: "c1", contactName: "Sarah Johnson", value: 8400, stage: "Won", probability: 100, assignedAgent: "Marcus Chen", closeDate: "2024-03-01", createdAt: "2024-01-05", channel: "instagram" },
  { id: "d10", title: "FintechWave Analytics Pro", contactId: "c6", contactName: "James Park", value: 14400, stage: "Lost", probability: 0, assignedAgent: "Sofia Lopez", closeDate: "2024-03-15", createdAt: "2024-02-01", channel: "email" },
];

export const conversations: Conversation[] = [
  { id: "conv1", contactId: "c3", contactName: "Emily Chen", channel: "instagram", lastMessage: "How much is the enterprise plan? I want to upgrade today.", timestamp: "2 min ago", unreadCount: 3, assignedAgent: "Marcus Chen", status: "open", tags: ["HOT", "buy-intent"] },
  { id: "conv2", contactId: "c1", contactName: "Sarah Johnson", channel: "whatsapp", lastMessage: "Can we schedule a call this week to finalize the contract?", timestamp: "28 min ago", unreadCount: 1, assignedAgent: "Marcus Chen", status: "open", tags: ["negotiation"] },
  { id: "conv3", contactId: "c2", contactName: "Ahmed Al-Rashid", channel: "whatsapp", lastMessage: "I need to compare with another vendor first.", timestamp: "1 hr ago", unreadCount: 0, assignedAgent: "Sofia Lopez", status: "pending", tags: ["objection"] },
  { id: "conv4", contactId: "c6", contactName: "James Park", channel: "email", lastMessage: "Please send me the API documentation and pricing sheet.", timestamp: "3 hr ago", unreadCount: 2, assignedAgent: "Sofia Lopez", status: "open", tags: ["info-request"] },
  { id: "conv5", contactId: "c4", contactName: "Carlos Mendez", channel: "facebook", lastMessage: "Hola, quiero saber más sobre sus servicios.", timestamp: "Yesterday", unreadCount: 0, assignedAgent: "Priya Sharma", status: "pending", tags: ["new"] },
  { id: "conv6", contactId: "c8", contactName: "David Osei", channel: "whatsapp", lastMessage: "What discount can you offer for a 2-year contract?", timestamp: "4 hr ago", unreadCount: 1, assignedAgent: "Marcus Chen", status: "open", tags: ["discount-request"] },
  { id: "conv7", contactId: "c7", contactName: "Laura Martinez", channel: "instagram", lastMessage: "Thank you! Looking forward to working with you.", timestamp: "Yesterday", unreadCount: 0, assignedAgent: "Priya Sharma", status: "resolved", tags: ["won"] },
];

export const agents: Agent[] = [
  { id: "a1", name: "Marcus Chen", email: "marcus@company.com", status: "online", leadsAssigned: 48, responseTime: "4 min", conversionRate: 38, revenue: 142000, followUpRate: 94, badges: ["Top Closer", "Fast Responder", "Revenue King"], rank: 1 },
  { id: "a2", name: "Sofia Lopez", email: "sofia@company.com", status: "online", leadsAssigned: 42, responseTime: "6 min", conversionRate: 31, revenue: 98000, followUpRate: 88, badges: ["Top Closer", "Consistent Performer"], rank: 2 },
  { id: "a3", name: "Priya Sharma", email: "priya@company.com", status: "busy", leadsAssigned: 35, responseTime: "9 min", conversionRate: 28, revenue: 76000, followUpRate: 82, badges: ["Fast Responder"], rank: 3 },
  { id: "a4", name: "Omar Hassan", email: "omar@company.com", status: "online", leadsAssigned: 29, responseTime: "12 min", conversionRate: 22, revenue: 54000, followUpRate: 75, badges: ["Rising Star"], rank: 4 },
  { id: "a5", name: "Nina Petrov", email: "nina@company.com", status: "offline", leadsAssigned: 18, responseTime: "18 min", conversionRate: 15, revenue: 32000, followUpRate: 68, badges: [], rank: 5 },
];

export const tasks: Task[] = [
  { id: "t1", title: "Follow up with Emily Chen — pricing inquiry", contactId: "c3", contactName: "Emily Chen", assignedAgent: "Marcus Chen", dueDate: "Today 3:00 PM", priority: "high", status: "pending", type: "follow-up", automated: true },
  { id: "t2", title: "Schedule demo call with Ahmed Al-Rashid", contactId: "c2", contactName: "Ahmed Al-Rashid", assignedAgent: "Sofia Lopez", dueDate: "Tomorrow 10:00 AM", priority: "high", status: "in-progress", type: "call", automated: false },
  { id: "t3", title: "Send proposal to James Park", contactId: "c6", contactName: "James Park", assignedAgent: "Sofia Lopez", dueDate: "Today 5:00 PM", priority: "medium", status: "pending", type: "email", automated: false },
  { id: "t4", title: "Contract negotiation meeting — Sarah Johnson", contactId: "c1", contactName: "Sarah Johnson", assignedAgent: "Marcus Chen", dueDate: "Apr 28 2:00 PM", priority: "high", status: "pending", type: "meeting", automated: false },
  { id: "t5", title: "Onboarding call with Laura Martinez", contactId: "c7", contactName: "Laura Martinez", assignedAgent: "Priya Sharma", dueDate: "Apr 25 11:00 AM", priority: "medium", status: "completed", type: "call", automated: false },
  { id: "t6", title: "Re-engage Aisha Okonkwo — cold lead", contactId: "c5", contactName: "Aisha Okonkwo", assignedAgent: "Omar Hassan", dueDate: "Yesterday 2:00 PM", priority: "low", status: "overdue", type: "email", automated: true },
  { id: "t7", title: "Discount negotiation with David Osei", contactId: "c8", contactName: "David Osei", assignedAgent: "Marcus Chen", dueDate: "Apr 30 4:00 PM", priority: "high", status: "pending", type: "call", automated: false },
];

export const timelineEvents: TimelineEvent[] = [
  { id: "te1", contactId: "c3", type: "ad_view", channel: "instagram", description: "Viewed Instagram ad — Enterprise Automation Suite", timestamp: "Mar 1, 09:14 AM", metadata: { campaign: "Q1 Enterprise Campaign" } },
  { id: "te2", contactId: "c3", type: "link_click", channel: "instagram", description: "Clicked WhatsApp link in bio", timestamp: "Mar 1, 09:16 AM" },
  { id: "te3", contactId: "c3", type: "message", channel: "instagram", description: "Sent DM: 'Hi, I am interested in your product'", timestamp: "Mar 1, 09:18 AM" },
  { id: "te4", contactId: "c3", type: "stage_change", description: "Stage updated: New Lead → Contacted", timestamp: "Mar 1, 09:20 AM" },
  { id: "te5", contactId: "c3", type: "score_change", description: "Lead score increased: 45 → 72 (Buy intent detected)", timestamp: "Mar 1, 09:22 AM", metadata: { oldScore: 45, newScore: 72 } },
  { id: "te6", contactId: "c3", type: "email", channel: "email", description: "Opened proposal email — 3 times", timestamp: "Mar 5, 2:30 PM" },
  { id: "te7", contactId: "c3", type: "message", channel: "whatsapp", description: "WhatsApp message: 'Can we set up a call this week?'", timestamp: "Mar 10, 11:00 AM" },
  { id: "te8", contactId: "c3", type: "stage_change", description: "Stage updated: Contacted → Qualified", timestamp: "Mar 10, 11:05 AM" },
  { id: "te9", contactId: "c3", type: "score_change", description: "AI Score boost: 72 → 95 (High-frequency engagement)", timestamp: "Mar 12, 9:00 AM", metadata: { oldScore: 72, newScore: 95 } },
  { id: "te10", contactId: "c3", type: "message", channel: "instagram", description: "DM: 'How much is the enterprise plan? I want to upgrade today.'", timestamp: "Today, 10:48 AM" },
];

export const segments: Segment[] = [
  { id: "s1", name: "Hot Leads", count: 127, criteria: "Score > 70", color: "text-[oklch(0.6_0.22_27)]", trend: 12 },
  { id: "s2", name: "High-Value Customers", count: 84, criteria: "Revenue > $10k", color: "text-[oklch(0.6_0.22_250)]", trend: 8 },
  { id: "s3", name: "Active Buyers", count: 215, criteria: "Purchase in last 30 days", color: "text-[oklch(0.6_0.18_150)]", trend: 22 },
  { id: "s4", name: "Dormant Leads", count: 342, criteria: "No activity 30+ days", color: "text-[oklch(0.55_0.01_240)]", trend: -5 },
  { id: "s5", name: "Instagram Audience", count: 489, criteria: "Source = Instagram", color: "text-[oklch(0.72_0.18_60)]", trend: 18 },
  { id: "s6", name: "VIP Clients", count: 38, criteria: "Revenue > $20k + Repeat", color: "text-[oklch(0.65_0.18_210)]", trend: 4 },
];

export const notifications: Notification[] = [
  { id: "n1", type: "hot_lead", title: "Hot Lead Alert", description: "Emily Chen (score 95) just sent a buy intent message", timestamp: "2 min ago", read: false, priority: "high" },
  { id: "n2", type: "sla_breach", title: "SLA Breach", description: "Carlos Mendez has been waiting 3 days without follow-up", timestamp: "1 hr ago", read: false, priority: "high" },
  { id: "n3", type: "new_message", title: "New Message", description: "David Osei asked about discount on WhatsApp", timestamp: "4 hr ago", read: false, priority: "medium" },
  { id: "n4", type: "task_due", title: "Task Overdue", description: "Re-engage Aisha Okonkwo was due yesterday", timestamp: "Yesterday", read: true, priority: "low" },
  { id: "n5", type: "deal_won", title: "Deal Closed!", description: "Laura Martinez — PixelStudio Creative Suite ($18,000)", timestamp: "Yesterday", read: true, priority: "medium" },
];

export const revenueData = [
  { month: "Oct", revenue: 84000, forecast: 80000, leads: 142 },
  { month: "Nov", revenue: 92000, forecast: 90000, leads: 158 },
  { month: "Dec", revenue: 78000, forecast: 95000, leads: 134 },
  { month: "Jan", revenue: 108000, forecast: 100000, leads: 187 },
  { month: "Feb", revenue: 124000, forecast: 115000, leads: 203 },
  { month: "Mar", revenue: 142000, forecast: 130000, leads: 231 },
  { month: "Apr", revenue: 118000, forecast: 145000, leads: 196 },
];

export const pipelineData = [
  { stage: "New Lead", count: 48, value: 186000 },
  { stage: "Contacted", count: 32, value: 284000 },
  { stage: "Qualified", count: 24, value: 412000 },
  { stage: "Proposal", count: 16, value: 568000 },
  { stage: "Negotiation", count: 8, value: 324000 },
  { stage: "Won", count: 14, value: 892000 },
];

export const channelData = [
  { name: "Instagram", value: 38, color: "oklch(0.72 0.18 60)" },
  { name: "WhatsApp", value: 28, color: "oklch(0.6 0.18 150)" },
  { name: "Facebook", value: 14, color: "oklch(0.6 0.22 250)" },
  { name: "Email", value: 12, color: "oklch(0.65 0.18 210)" },
  { name: "Web / Ads", value: 8, color: "oklch(0.6 0.22 27)" },
];

export const getScoreLabel = (score: number): LeadScore => {
  if (score >= 71) return "hot";
  if (score >= 31) return "warm";
  return "cold";
};

export const getScoreColor = (score: number) => {
  if (score >= 71) return "text-orange-400 bg-orange-400/10";
  if (score >= 31) return "text-yellow-400 bg-yellow-400/10";
  return "text-blue-400 bg-blue-400/10";
};

export const getChannelIcon = (channel: Channel) => {
  const icons: Record<Channel, string> = {
    instagram: "📷",
    whatsapp: "💬",
    facebook: "📘",
    email: "✉️",
    web: "🌐",
    ads: "📣",
  };
  return icons[channel];
};

export const getPriorityColor = (priority: Priority) => {
  if (priority === "high") return "text-red-400 bg-red-400/10";
  if (priority === "medium") return "text-yellow-400 bg-yellow-400/10";
  return "text-blue-400 bg-blue-400/10";
};
