"use client";

import { Link, Plus, CheckCircle, XCircle, Settings, ExternalLink } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface Integration {
  id: string;
  name: string;
  category: string;
  description: string;
  status: "connected" | "disconnected" | "error";
  icon: string;
  events?: number;
}

const integrations: Integration[] = [
  { id: "i1", name: "Instagram DM", category: "Social", description: "Auto-capture leads from Instagram DMs", status: "connected", icon: "📷", events: 2341 },
  { id: "i2", name: "WhatsApp Business", category: "Messaging", description: "WhatsApp conversation hub & automation", status: "connected", icon: "💬", events: 1847 },
  { id: "i3", name: "Facebook Messenger", category: "Social", description: "Facebook page inbox integration", status: "connected", icon: "📘", events: 687 },
  { id: "i4", name: "Mailchimp", category: "Email", description: "Email marketing campaigns & sequences", status: "connected", icon: "✉️", events: 412 },
  { id: "i5", name: "Stripe", category: "Payments", description: "Payment processing & subscription billing", status: "connected", icon: "💳", events: 134 },
  { id: "i6", name: "Google Ads", category: "Advertising", description: "Track leads from Google ad campaigns", status: "disconnected", icon: "🎯" },
  { id: "i7", name: "Zapier", category: "Automation", description: "Connect with 5000+ apps via Zapier", status: "disconnected", icon: "⚡" },
  { id: "i8", name: "Salesforce", category: "CRM Sync", description: "Bi-directional Salesforce data sync", status: "error", icon: "☁️" },
  { id: "i9", name: "HubSpot", category: "CRM Sync", description: "Migrate and sync from HubSpot", status: "disconnected", icon: "🔄" },
  { id: "i10", name: "Slack", category: "Notifications", description: "Real-time lead alerts in Slack channels", status: "connected", icon: "💼", events: 892 },
  { id: "i11", name: "Twilio SMS", category: "Messaging", description: "SMS campaigns and two-way texting", status: "disconnected", icon: "📱" },
  { id: "i12", name: "Calendly", category: "Scheduling", description: "Auto-book demo calls from leads", status: "connected", icon: "📅", events: 67 },
];

const statusColors = {
  connected: "bg-green-400/10 text-green-400",
  disconnected: "bg-secondary text-muted-foreground",
  error: "bg-red-400/10 text-red-400",
};

const webhookEvents = [
  { event: "lead.created", description: "New lead captured from any channel", url: "https://api.nexuscrm.io/webhooks/lead-created" },
  { event: "lead.score_changed", description: "Lead AI score updated", url: "https://api.nexuscrm.io/webhooks/score-changed" },
  { event: "deal.stage_changed", description: "Deal moved to new stage", url: "https://api.nexuscrm.io/webhooks/deal-stage" },
  { event: "message.received", description: "Inbound message on any channel", url: "https://api.nexuscrm.io/webhooks/message" },
];

export function IntegrationsView() {
  const connected = integrations.filter((i) => i.status === "connected").length;

  return (
    <div className="p-6 space-y-6 overflow-y-auto">
      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Connected", value: connected, color: "text-green-400" },
          { label: "Disconnected", value: integrations.filter((i) => i.status === "disconnected").length, color: "text-muted-foreground" },
          { label: "Errors", value: integrations.filter((i) => i.status === "error").length, color: "text-red-400" },
          { label: "Total Events", value: integrations.reduce((s, i) => s + (i.events ?? 0), 0).toLocaleString(), color: "text-primary" },
        ].map((s) => (
          <Card key={s.label} className="bg-card border-border">
            <CardContent className="p-4">
              <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{s.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Integration Marketplace */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold">Integration Marketplace</CardTitle>
            <Button size="sm" className="h-7 gap-1.5 bg-primary text-primary-foreground text-xs">
              <Plus className="w-3 h-3" /> Add Integration
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
            {integrations.map((intg) => (
              <div key={intg.id} className="flex items-center gap-3 p-3 rounded-lg border border-border/50 bg-secondary/30 hover:bg-secondary/60 transition-colors">
                <div className="w-9 h-9 rounded-xl bg-secondary flex items-center justify-center text-lg flex-shrink-0">
                  {intg.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold text-foreground truncate">{intg.name}</p>
                    <Badge className={cn("text-[10px] border-0 ml-1 flex-shrink-0", statusColors[intg.status])}>
                      {intg.status === "connected" ? <CheckCircle className="w-2.5 h-2.5" /> :
                       intg.status === "error" ? <XCircle className="w-2.5 h-2.5" /> : null}
                    </Badge>
                  </div>
                  <p className="text-[10px] text-muted-foreground truncate">{intg.description}</p>
                  {intg.events && (
                    <p className="text-[10px] text-primary mt-0.5">{intg.events.toLocaleString()} events</p>
                  )}
                </div>
                <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground flex-shrink-0">
                  <Settings className="w-3 h-3" />
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Webhooks */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Link className="w-4 h-4 text-primary" /> Webhook Events
            </CardTitle>
            <Button size="sm" variant="outline" className="h-7 gap-1.5 border-border text-muted-foreground text-xs">
              <ExternalLink className="w-3 h-3" /> API Docs
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {webhookEvents.map((webhook) => (
              <div key={webhook.event} className="flex items-center justify-between p-3 rounded-lg bg-secondary/50 border border-border/50">
                <div>
                  <code className="text-xs text-primary font-mono">{webhook.event}</code>
                  <p className="text-[10px] text-muted-foreground mt-0.5">{webhook.description}</p>
                </div>
                <div className="flex items-center gap-2">
                  <code className="text-[10px] text-muted-foreground font-mono hidden md:block truncate max-w-48">{webhook.url}</code>
                  <Button variant="ghost" size="sm" className="h-6 text-xs text-primary hover:bg-primary/10">Copy</Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
