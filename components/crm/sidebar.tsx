"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Users,
  MessageSquare,
  Kanban,
  TrendingUp,
  CheckSquare,
  Bot,
  Zap,
  Settings,
  Bell,
  ChevronLeft,
  ChevronRight,
  Target,
  BarChart3,
  Shield,
  Layers,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { notifications } from "@/lib/crm-data";

const unreadCount = notifications.filter((n) => !n.read).length;

const navItems = [
  {
    section: "MAIN",
    items: [
      { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
      { id: "contacts", label: "Contacts & Leads", icon: Users, badge: "231" },
      { id: "pipeline", label: "Pipeline", icon: Kanban, badge: "8" },
      { id: "conversations", label: "Inbox", icon: MessageSquare, badge: "7" },
    ],
  },
  {
    section: "INTELLIGENCE",
    items: [
      { id: "analytics", label: "Analytics", icon: BarChart3 },
      { id: "agents", label: "Agent Performance", icon: TrendingUp },
      { id: "ai-assistant", label: "AI Assistant", icon: Bot, badge: "AI" },
      { id: "tasks", label: "Tasks", icon: CheckSquare, badge: "3" },
    ],
  },
  {
    section: "ADVANCED",
    items: [
      { id: "segmentation", label: "Segmentation", icon: Target },
      { id: "automation", label: "Automation", icon: Zap },
      { id: "compliance", label: "Compliance", icon: Shield },
      { id: "integrations", label: "Integrations", icon: Layers },
    ],
  },
];

interface SidebarProps {
  activeView: string;
  onNavigate: (view: string) => void;
}

export function Sidebar({ activeView, onNavigate }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside
      className={cn(
        "flex flex-col h-screen bg-sidebar border-r border-sidebar-border transition-all duration-300 ease-in-out relative z-10",
        collapsed ? "w-16" : "w-60"
      )}
    >
      {/* Logo */}
      <div className={cn("flex items-center gap-3 px-4 py-4 border-b border-sidebar-border", collapsed && "justify-center px-0")}>
        <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center flex-shrink-0">
          <span className="text-primary-foreground font-bold text-sm">N</span>
        </div>
        {!collapsed && (
          <div>
            <p className="font-semibold text-sm text-foreground leading-none">NexusCRM</p>
            <p className="text-xs text-muted-foreground mt-0.5">Enterprise</p>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-3 space-y-1 px-2">
        {navItems.map((section) => (
          <div key={section.section} className="mb-4">
            {!collapsed && (
              <p className="text-[10px] font-semibold text-muted-foreground px-2 mb-2 tracking-widest">{section.section}</p>
            )}
            {section.items.map((item) => {
              const Icon = item.icon;
              const isActive = activeView === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onNavigate(item.id)}
                  className={cn(
                    "w-full flex items-center gap-3 px-2 py-2 rounded-md text-sm font-medium transition-colors duration-150",
                    isActive
                      ? "bg-primary/15 text-primary"
                      : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-accent-foreground",
                    collapsed && "justify-center"
                  )}
                  title={collapsed ? item.label : undefined}
                >
                  <Icon className="w-4 h-4 flex-shrink-0" />
                  {!collapsed && (
                    <>
                      <span className="flex-1 text-left">{item.label}</span>
                      {item.badge && (
                        <Badge
                          className={cn(
                            "text-[10px] px-1.5 py-0 h-5 rounded",
                            item.badge === "AI"
                              ? "bg-primary/20 text-primary border-0"
                              : "bg-secondary text-muted-foreground border-0"
                          )}
                        >
                          {item.badge}
                        </Badge>
                      )}
                    </>
                  )}
                </button>
              );
            })}
          </div>
        ))}
      </nav>

      {/* Bottom actions */}
      <div className="border-t border-sidebar-border p-2 space-y-1">
        <button
          onClick={() => onNavigate("notifications")}
          className={cn(
            "w-full flex items-center gap-3 px-2 py-2 rounded-md text-sm text-sidebar-foreground hover:bg-sidebar-accent transition-colors",
            collapsed && "justify-center"
          )}
        >
          <div className="relative">
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-red-500 rounded-full text-[9px] text-white flex items-center justify-center font-bold">
                {unreadCount}
              </span>
            )}
          </div>
          {!collapsed && <span>Notifications</span>}
        </button>
        <button
          onClick={() => onNavigate("settings")}
          className={cn(
            "w-full flex items-center gap-3 px-2 py-2 rounded-md text-sm text-sidebar-foreground hover:bg-sidebar-accent transition-colors",
            collapsed && "justify-center"
          )}
        >
          <Settings className="w-4 h-4" />
          {!collapsed && <span>Settings</span>}
        </button>

        {/* User */}
        <div className={cn("flex items-center gap-2 px-2 py-2 mt-2 rounded-md bg-secondary/50", collapsed && "justify-center")}>
          <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
            <span className="text-primary text-xs font-bold">A</span>
          </div>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium truncate text-foreground">Admin User</p>
              <p className="text-[10px] text-muted-foreground truncate">admin@nexuscrm.io</p>
            </div>
          )}
        </div>
      </div>

      {/* Collapse toggle */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="absolute -right-3 top-20 w-6 h-6 rounded-full bg-secondary border border-border flex items-center justify-center hover:bg-accent transition-colors z-20"
      >
        {collapsed ? <ChevronRight className="w-3 h-3" /> : <ChevronLeft className="w-3 h-3" />}
      </button>
    </aside>
  );
}
