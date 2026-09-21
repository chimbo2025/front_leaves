"use client";

import { useState } from "react";
import useSWR from "swr";
import { Bell, CheckCheck, Trash2, Filter, Zap, AlertTriangle, MessageSquare, CheckCircle, Clock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { api, type Notification, ApiError } from "@/lib/api";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const typeIcons: Record<string, React.ReactNode> = {
  hot_lead: <Zap className="w-4 h-4 text-orange-400" />,
  sla_breach: <AlertTriangle className="w-4 h-4 text-red-400" />,
  new_message: <MessageSquare className="w-4 h-4 text-blue-400" />,
  task_due: <Clock className="w-4 h-4 text-yellow-400" />,
  deal_won: <CheckCircle className="w-4 h-4 text-green-400" />,
};

const typeBg: Record<string, string> = {
  hot_lead: "bg-orange-400/10",
  sla_breach: "bg-red-400/10",
  new_message: "bg-blue-400/10",
  task_due: "bg-yellow-400/10",
  deal_won: "bg-green-400/10",
};

const priorityColors: Record<string, string> = {
  high: "bg-red-400/10 text-red-400",
  medium: "bg-yellow-400/10 text-yellow-400",
  low: "bg-secondary text-muted-foreground",
};

function NotificationRow({
  notif,
  onRead,
  onDelete,
}: {
  notif: Notification;
  onRead: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <div
      className={cn(
        "flex items-start gap-3 p-3 rounded-lg border transition-all group",
        !notif.read ? "bg-primary/5 border-primary/15" : "border-border/40 bg-secondary/20 hover:bg-secondary/40"
      )}
    >
      {/* Icon */}
      <div
        className={cn(
          "w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5",
          typeBg[notif.type] ?? "bg-secondary"
        )}
      >
        {typeIcons[notif.type] ?? <Bell className="w-4 h-4 text-muted-foreground" />}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <p className={cn("text-xs font-semibold", !notif.read ? "text-foreground" : "text-muted-foreground")}>
              {notif.title}
            </p>
            {!notif.read && <span className="w-2 h-2 rounded-full bg-primary flex-shrink-0" />}
          </div>
          <Badge className={cn("text-[10px] border-0 flex-shrink-0", priorityColors[notif.priority] ?? priorityColors.medium)}>
            {notif.priority}
          </Badge>
        </div>
        <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">{notif.description}</p>
        <p className="text-[10px] text-muted-foreground/60 mt-1">{notif.timestamp}</p>
      </div>

      {/* Actions */}
      <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
        {!notif.read && (
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 text-muted-foreground hover:text-primary"
            onClick={() => onRead(notif.id)}
            title="Mark as read"
          >
            <CheckCheck className="w-3 h-3" />
          </Button>
        )}
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 text-muted-foreground hover:text-red-400"
          onClick={() => onDelete(notif.id)}
          title="Delete"
        >
          <Trash2 className="w-3 h-3" />
        </Button>
      </div>
    </div>
  );
}

export function NotificationsView() {
  const [filter, setFilter] = useState<"all" | "unread" | "high">("all");

  // Notification preferences state
  const [preferences, setPreferences] = useState({
    hot_lead_alerts: true,
    sla_breach_warnings: true,
    deal_won_celebrations: true,
    daily_digest_email: false,
    agent_performance_alerts: false,
  });

  // Fetch notifications from API
  const { data: notifications = [], isLoading, mutate } = useSWR("notifications-list", () => api.notifications.list());

  const unreadCount = notifications.filter((n) => !n.read).length;

  const handleMarkRead = async (id: string) => {
    try {
      await api.notifications.markRead(id);
      mutate();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to mark as read");
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await api.notifications.delete(id);
      toast.success("Notification deleted");
      mutate();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to delete notification");
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await api.notifications.markAllRead();
      toast.success("All notifications marked as read");
      mutate();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to mark all as read");
    }
  };

  const filtered = notifications.filter((n) => {
    if (filter === "unread") return !n.read;
    if (filter === "high") return n.priority === "high";
    return true;
  });

  const grouped = {
    today: filtered.filter(
      (n) =>
        n.timestamp.toLowerCase().includes("min") ||
        n.timestamp.toLowerCase().includes("hr") ||
        n.timestamp.toLowerCase().includes("today")
    ),
    earlier: filtered.filter(
      (n) => n.timestamp.toLowerCase().includes("yesterday") || n.timestamp.includes("days")
    ),
  };

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6 overflow-y-auto">
      {/* Header stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Total", value: notifications.length, color: "text-foreground" },
          { label: "Unread", value: unreadCount, color: "text-primary" },
          { label: "High Priority", value: notifications.filter((n) => n.priority === "high").length, color: "text-red-400" },
        ].map((s) => (
          <Card key={s.label} className="bg-card border-border">
            <CardContent className="p-3 text-center">
              <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{s.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="bg-card border-border">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Bell className="w-4 h-4 text-primary" />
              Notifications
              {unreadCount > 0 && <Badge className="bg-primary/10 text-primary border-0 text-xs">{unreadCount} new</Badge>}
            </CardTitle>
            <div className="flex gap-2">
              {unreadCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 gap-1.5 text-xs text-muted-foreground"
                  onClick={handleMarkAllRead}
                >
                  <CheckCheck className="w-3 h-3" /> Mark all read
                </Button>
              )}
              <Button variant="outline" size="sm" className="h-7 gap-1.5 border-border text-muted-foreground text-xs">
                <Filter className="w-3 h-3" />
              </Button>
            </div>
          </div>
          {/* Filter tabs */}
          <div className="flex gap-1 mt-2">
            {(["all", "unread", "high"] as const).map((f) => (
              <Button
                key={f}
                size="sm"
                variant={filter === f ? "default" : "ghost"}
                className={cn(
                  "h-7 text-xs capitalize",
                  filter === f ? "bg-primary text-primary-foreground" : "text-muted-foreground"
                )}
                onClick={() => setFilter(f)}
              >
                {f === "high" ? "High Priority" : f.charAt(0).toUpperCase() + f.slice(1)}
              </Button>
            ))}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {isLoading ? (
            <div className="text-center py-10">
              <span className="text-sm text-muted-foreground">Loading notifications...</span>
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-10">
              <Bell className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">No notifications</p>
            </div>
          ) : (
            <>
              {/* Today group */}
              {grouped.today.length > 0 && (
                <div>
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mb-2">Today</p>
                  <div className="space-y-2">
                    {grouped.today.map((notif) => (
                      <NotificationRow key={notif.id} notif={notif} onRead={handleMarkRead} onDelete={handleDelete} />
                    ))}
                  </div>
                </div>
              )}

              {/* Earlier group */}
              {grouped.earlier.length > 0 && (
                <div>
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mb-2">Earlier</p>
                  <div className="space-y-2">
                    {grouped.earlier.map((notif) => (
                      <NotificationRow key={notif.id} notif={notif} onRead={handleMarkRead} onDelete={handleDelete} />
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Notification preferences */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">Notification Preferences</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[
              {
                key: "hot_lead_alerts",
                label: "Hot lead alerts",
                description: "Instant alert when a lead score crosses 70",
              },
              {
                key: "sla_breach_warnings",
                label: "SLA breach warnings",
                description: "Alert when a conversation exceeds SLA limit",
              },
              {
                key: "deal_won_celebrations",
                label: "Deal won celebrations",
                description: "Notify when a deal is marked as Won",
              },
              {
                key: "daily_digest_email",
                label: "Daily digest email",
                description: "Summary of daily pipeline activity",
              },
              {
                key: "agent_performance_alerts",
                label: "Agent performance alerts",
                description: "Alert when an agent falls below target",
              },
            ].map((pref) => (
              <div
                key={pref.key}
                className="flex items-center justify-between py-2 border-b border-border/40 last:border-0"
              >
                <div>
                  <p className="text-xs font-medium text-foreground">{pref.label}</p>
                  <p className="text-[10px] text-muted-foreground">{pref.description}</p>
                </div>
                <Switch
                  checked={preferences[pref.key as keyof typeof preferences]}
                  onCheckedChange={(checked) =>
                    setPreferences((prev) => ({ ...prev, [pref.key]: checked }))
                  }
                />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
