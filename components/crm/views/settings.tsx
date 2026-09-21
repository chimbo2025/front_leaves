"use client";

import { useState } from "react";
import { Settings, User, Shield, Globe, Palette, Bell, Key, Zap, ChevronRight, Check } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const tabs = [
  { id: "profile", label: "Profile", icon: User },
  { id: "security", label: "Security", icon: Shield },
  { id: "workspace", label: "Workspace", icon: Globe },
  { id: "appearance", label: "Appearance", icon: Palette },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "api", label: "API & Webhooks", icon: Key },
];

function ProfileTab() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center text-xl font-bold text-primary">
          A
        </div>
        <div>
          <p className="text-sm font-semibold text-foreground">Admin User</p>
          <p className="text-xs text-muted-foreground">admin@nexuscrm.io</p>
          <Button variant="outline" size="sm" className="mt-2 h-7 text-xs border-border text-muted-foreground">
            Change Avatar
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {[
          { label: "First Name", value: "Admin", placeholder: "Enter first name" },
          { label: "Last Name", value: "User", placeholder: "Enter last name" },
          { label: "Email", value: "admin@nexuscrm.io", placeholder: "Enter email" },
          { label: "Phone", value: "+1 555-0000", placeholder: "Enter phone" },
          { label: "Role", value: "Super Admin", placeholder: "Role" },
          { label: "Timezone", value: "UTC-5 (Eastern)", placeholder: "Select timezone" },
        ].map((field) => (
          <div key={field.label}>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">{field.label}</label>
            <Input
              defaultValue={field.value}
              placeholder={field.placeholder}
              className="h-8 text-sm bg-secondary border-border"
            />
          </div>
        ))}
      </div>

      <Button className="bg-primary text-primary-foreground h-8 text-xs">Save Changes</Button>
    </div>
  );
}

function SecurityTab() {
  return (
    <div className="space-y-6">
      <Card className="bg-secondary/30 border-border">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">Change Password</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {["Current Password", "New Password", "Confirm New Password"].map((label) => (
            <div key={label}>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">{label}</label>
              <Input type="password" placeholder="••••••••" className="h-8 text-sm bg-secondary border-border" />
            </div>
          ))}
          <Button className="bg-primary text-primary-foreground h-8 text-xs">Update Password</Button>
        </CardContent>
      </Card>

      <Card className="bg-secondary/30 border-border">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">Two-Factor Authentication</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-foreground">Authenticator App</p>
              <p className="text-[10px] text-muted-foreground">Use Google Authenticator or Authy</p>
            </div>
            <Badge className="bg-green-400/10 text-green-400 border-0 flex items-center gap-1">
              <Check className="w-3 h-3" /> Enabled
            </Badge>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-secondary/30 border-border">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">Active Sessions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {[
            { device: "Chrome — Mac OS X", ip: "192.168.1.1", time: "Current session", current: true },
            { device: "Mobile — iOS 17", ip: "10.0.0.12", time: "2 days ago", current: false },
            { device: "Firefox — Windows", ip: "203.0.113.42", time: "5 days ago", current: false },
          ].map((session) => (
            <div key={session.device} className="flex items-center justify-between py-2 border-b border-border/40 last:border-0">
              <div>
                <p className="text-xs font-medium text-foreground">{session.device}</p>
                <p className="text-[10px] text-muted-foreground">{session.ip} · {session.time}</p>
              </div>
              {session.current ? (
                <Badge className="bg-green-400/10 text-green-400 border-0 text-[10px]">Current</Badge>
              ) : (
                <Button variant="ghost" size="sm" className="h-6 text-xs text-red-400 hover:bg-red-400/10">Revoke</Button>
              )}
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

function WorkspaceTab() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {[
          { label: "Workspace Name", value: "NexusCRM Enterprise" },
          { label: "Industry", value: "SaaS / Technology" },
          { label: "Team Size", value: "11-50 employees" },
          { label: "Primary Currency", value: "USD ($)" },
          { label: "SLA Response Time", value: "24 hours" },
          { label: "Lead Score Threshold (Hot)", value: "71" },
        ].map((field) => (
          <div key={field.label}>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">{field.label}</label>
            <Input defaultValue={field.value} className="h-8 text-sm bg-secondary border-border" />
          </div>
        ))}
      </div>

      <div>
        <p className="text-xs font-semibold text-foreground mb-3">Feature Flags</p>
        <div className="space-y-2">
          {[
            { label: "AI Lead Scoring", enabled: true },
            { label: "Autonomous AI Agent", enabled: true },
            { label: "Multi-channel Inbox", enabled: true },
            { label: "Predictive Revenue Forecast", enabled: true },
            { label: "Experimental: Voice AI", enabled: false },
          ].map((flag) => (
            <div key={flag.label} className="flex items-center justify-between py-2 border-b border-border/40 last:border-0">
              <div className="flex items-center gap-2">
                <Zap className="w-3.5 h-3.5 text-primary" />
                <span className="text-xs text-foreground">{flag.label}</span>
              </div>
              <button className={cn("w-10 h-5 rounded-full transition-colors", flag.enabled ? "bg-primary" : "bg-secondary")}>
                <div className={cn("w-4 h-4 bg-white rounded-full m-0.5 shadow-sm transition-transform", flag.enabled ? "translate-x-5" : "translate-x-0")} />
              </button>
            </div>
          ))}
        </div>
      </div>
      <Button className="bg-primary text-primary-foreground h-8 text-xs">Save Workspace Settings</Button>
    </div>
  );
}

function APITab() {
  return (
    <div className="space-y-6">
      <Card className="bg-secondary/30 border-border">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold">API Keys</CardTitle>
            <Button size="sm" className="h-7 bg-primary text-primary-foreground text-xs">Generate Key</Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          {[
            { name: "Production Key", key: "nxs_live_••••••••••••••••••••••••••••3f9a", created: "Jan 15, 2024", last: "2 hours ago" },
            { name: "Development Key", key: "nxs_test_••••••••••••••••••••••••••••8c2b", created: "Feb 1, 2024", last: "3 days ago" },
          ].map((key) => (
            <div key={key.name} className="p-3 rounded-lg border border-border/50 bg-secondary/30">
              <div className="flex items-center justify-between mb-1">
                <p className="text-xs font-semibold text-foreground">{key.name}</p>
                <Button variant="ghost" size="sm" className="h-6 text-xs text-red-400 hover:bg-red-400/10">Revoke</Button>
              </div>
              <code className="text-[11px] text-muted-foreground font-mono">{key.key}</code>
              <p className="text-[10px] text-muted-foreground mt-1">Created: {key.created} · Last used: {key.last}</p>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card className="bg-secondary/30 border-border">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">Webhook Endpoints</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {[
            { url: "https://yourapp.com/webhooks/lead", events: ["lead.created", "lead.updated"], active: true },
            { url: "https://yourapp.com/webhooks/deals", events: ["deal.won", "deal.stage_changed"], active: false },
          ].map((wh) => (
            <div key={wh.url} className="p-3 rounded-lg border border-border/50 bg-secondary/30">
              <div className="flex items-center justify-between mb-1">
                <code className="text-[11px] text-primary font-mono truncate max-w-xs">{wh.url}</code>
                <Badge className={cn("text-[10px] border-0", wh.active ? "bg-green-400/10 text-green-400" : "bg-secondary text-muted-foreground")}>
                  {wh.active ? "Active" : "Paused"}
                </Badge>
              </div>
              <div className="flex flex-wrap gap-1 mt-1">
                {wh.events.map((e) => (
                  <Badge key={e} className="text-[10px] bg-primary/10 text-primary border-0 font-mono">{e}</Badge>
                ))}
              </div>
            </div>
          ))}
          <Button variant="outline" size="sm" className="w-full h-8 border-border text-muted-foreground text-xs border-dashed">
            + Add Endpoint
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

export function SettingsView() {
  const [activeTab, setActiveTab] = useState("profile");

  const renderContent = () => {
    switch (activeTab) {
      case "profile": return <ProfileTab />;
      case "security": return <SecurityTab />;
      case "workspace": return <WorkspaceTab />;
      case "api": return <APITab />;
      default:
        return (
          <div className="text-center py-16 text-muted-foreground">
            <Settings className="w-8 h-8 mx-auto mb-2 opacity-30" />
            <p className="text-sm">Settings panel coming soon.</p>
          </div>
        );
    }
  };

  return (
    <div className="flex h-full overflow-hidden">
      {/* Tab sidebar */}
      <div className="w-48 flex-shrink-0 border-r border-border bg-card/50 py-4">
        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest px-4 mb-3">Settings</p>
        <nav className="space-y-0.5 px-2">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-xs font-medium transition-colors",
                  activeTab === tab.id
                    ? "bg-primary/15 text-primary"
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                )}
              >
                <Icon className="w-3.5 h-3.5 flex-shrink-0" />
                {tab.label}
                {activeTab === tab.id && <ChevronRight className="w-3 h-3 ml-auto" />}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-2xl">
          <h2 className="text-sm font-semibold text-foreground mb-1 capitalize">
            {tabs.find((t) => t.id === activeTab)?.label}
          </h2>
          <p className="text-xs text-muted-foreground mb-6">
            {activeTab === "profile" && "Manage your personal account details and preferences"}
            {activeTab === "security" && "Control access, passwords, and active sessions"}
            {activeTab === "workspace" && "Configure your workspace settings and feature flags"}
            {activeTab === "appearance" && "Customize the look and feel of your CRM"}
            {activeTab === "notifications" && "Manage notification preferences and delivery channels"}
            {activeTab === "api" && "API keys, webhooks, and developer tools"}
          </p>
          {renderContent()}
        </div>
      </div>
    </div>
  );
}
