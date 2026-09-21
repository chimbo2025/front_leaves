"use client";

import { Search, Bell, Plus, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { notifications } from "@/lib/crm-data";

const unreadCount = notifications.filter((n) => !n.read).length;

const viewTitles: Record<string, { title: string; description: string }> = {
  dashboard: { title: "Dashboard", description: "Your AI-powered sales intelligence overview" },
  contacts: { title: "Contacts & Leads", description: "Unified contact & lead management" },
  pipeline: { title: "Pipeline", description: "Drag-and-drop deal management" },
  conversations: { title: "Inbox", description: "Multi-channel conversation hub" },
  analytics: { title: "Analytics", description: "Predictive sales & revenue analytics" },
  agents: { title: "Agent Performance", description: "Leaderboards, metrics & gamification" },
  "ai-assistant": { title: "AI Assistant", description: "Autonomous sales intelligence engine" },
  tasks: { title: "Tasks & Follow-ups", description: "Smart task management system" },
  segmentation: { title: "Segmentation", description: "Smart audience segmentation engine" },
  automation: { title: "Automation", description: "Workflow automation & CRM triggers" },
  compliance: { title: "Compliance & Privacy", description: "GDPR, audit trails & data governance" },
  integrations: { title: "Integrations", description: "API & integration marketplace" },
  notifications: { title: "Notifications", description: "Real-time alerts & smart notifications" },
  settings: { title: "Settings", description: "Platform configuration & preferences" },
};

interface HeaderProps {
  activeView: string;
}

export function Header({ activeView }: HeaderProps) {
  const info = viewTitles[activeView] ?? { title: activeView, description: "" };

  return (
    <header className="flex items-center justify-between px-6 py-3 border-b border-border bg-card/60 backdrop-blur-sm sticky top-0 z-10">
      <div>
        <h1 className="text-lg font-semibold text-foreground leading-none">{info.title}</h1>
        <p className="text-xs text-muted-foreground mt-0.5">{info.description}</p>
      </div>

      <div className="flex items-center gap-3">
        {/* Search */}
        <div className="relative hidden md:block">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input
            placeholder="Search leads, deals, contacts..."
            className="pl-9 w-64 h-8 text-sm bg-secondary border-border text-foreground placeholder:text-muted-foreground"
          />
        </div>

        {/* Live indicator */}
        <div className="hidden sm:flex items-center gap-1.5 text-xs text-muted-foreground">
          <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          <span>Live</span>
        </div>

        {/* Refresh */}
        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground">
          <RefreshCw className="w-4 h-4" />
        </Button>

        {/* Notifications */}
        <Button variant="ghost" size="icon" className="h-8 w-8 relative text-muted-foreground hover:text-foreground">
          <Bell className="w-4 h-4" />
          {unreadCount > 0 && (
            <Badge className="absolute -top-0.5 -right-0.5 w-4 h-4 p-0 flex items-center justify-center text-[9px] bg-red-500 border-0 text-white rounded-full">
              {unreadCount}
            </Badge>
          )}
        </Button>

        {/* Add New */}
        <Button size="sm" className="h-8 gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90 text-xs">
          <Plus className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Add Lead</span>
        </Button>
      </div>
    </header>
  );
}
