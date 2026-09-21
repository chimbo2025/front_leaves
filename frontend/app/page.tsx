"use client";

import { useState } from "react";
import { Sidebar } from "@/components/crm/sidebar";
import { Header } from "@/components/crm/header";
import { DashboardView } from "@/components/crm/views/dashboard";
import { ContactsView } from "@/components/crm/views/contacts";
import { PipelineView } from "@/components/crm/views/pipeline";
import { ConversationsView } from "@/components/crm/views/conversations";
import { AnalyticsView } from "@/components/crm/views/analytics";
import { AgentsView } from "@/components/crm/views/agents";
import { AIAssistantView } from "@/components/crm/views/ai-assistant";
import { TasksView } from "@/components/crm/views/tasks";
import { SegmentationView } from "@/components/crm/views/segmentation";
import { AutomationView } from "@/components/crm/views/automation";
import { ComplianceView } from "@/components/crm/views/compliance";
import { IntegrationsView } from "@/components/crm/views/integrations";
import { NotificationsView } from "@/components/crm/views/notifications";
import { SettingsView } from "@/components/crm/views/settings";

type View =
  | "dashboard"
  | "contacts"
  | "pipeline"
  | "conversations"
  | "analytics"
  | "agents"
  | "ai-assistant"
  | "tasks"
  | "segmentation"
  | "automation"
  | "compliance"
  | "integrations"
  | "notifications"
  | "settings";

function ViewRenderer({ view }: { view: View }) {
  switch (view) {
    case "dashboard": return <DashboardView />;
    case "contacts": return <ContactsView />;
    case "pipeline": return <PipelineView />;
    case "conversations": return <ConversationsView />;
    case "analytics": return <AnalyticsView />;
    case "agents": return <AgentsView />;
    case "ai-assistant": return <AIAssistantView />;
    case "tasks": return <TasksView />;
    case "segmentation": return <SegmentationView />;
    case "automation": return <AutomationView />;
    case "compliance": return <ComplianceView />;
    case "integrations": return <IntegrationsView />;
    case "notifications": return <NotificationsView />;
    case "settings": return <SettingsView />;
    default: return <DashboardView />;
  }
}

export default function CRMApp() {
  const [activeView, setActiveView] = useState<View>("dashboard");

  const fullScreenViews: View[] = ["conversations", "ai-assistant", "contacts"];
  const isFullScreen = fullScreenViews.includes(activeView);

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Sidebar */}
      <Sidebar activeView={activeView} onNavigate={(v) => setActiveView(v as View)} />

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        <Header activeView={activeView} />

        {/* View content */}
        <main className={`flex-1 overflow-hidden ${isFullScreen ? "" : "overflow-y-auto"}`}>
          <ViewRenderer view={activeView} />
        </main>
      </div>
    </div>
  );
}
