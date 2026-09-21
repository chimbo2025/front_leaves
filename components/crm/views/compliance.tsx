"use client";

import { Shield, CheckCircle, AlertTriangle, Download, Trash2, Eye, Lock, Clock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const auditLog = [
  { action: "Lead score updated", user: "AI System", resource: "Emily Chen", timestamp: "Today 10:48 AM", type: "ai" },
  { action: "Contact data exported", user: "Marcus Chen", resource: "87 contacts", timestamp: "Today 9:30 AM", type: "export" },
  { action: "Workflow triggered", user: "Automation Engine", resource: "Hot Lead Assignment", timestamp: "Today 9:15 AM", type: "automation" },
  { action: "Stage changed", user: "Sofia Lopez", resource: "Ahmed Al-Rashid → Qualified", timestamp: "Yesterday 4:20 PM", type: "update" },
  { action: "User login", user: "Priya Sharma", resource: "192.168.1.45", timestamp: "Yesterday 9:00 AM", type: "auth" },
  { action: "Contact deleted", user: "Admin", resource: "Test Lead 001", timestamp: "2 days ago", type: "delete" },
];

const typeColors: Record<string, string> = {
  ai: "bg-primary/10 text-primary",
  export: "bg-blue-400/10 text-blue-400",
  automation: "bg-yellow-400/10 text-yellow-400",
  update: "bg-green-400/10 text-green-400",
  auth: "bg-purple-400/10 text-purple-400",
  delete: "bg-red-400/10 text-red-400",
};

export function ComplianceView() {
  return (
    <div className="p-6 space-y-6 overflow-y-auto">
      {/* GDPR Status */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { title: "GDPR Compliance", status: "Compliant", icon: Shield, color: "text-green-400", bg: "bg-green-400/10", detail: "All data processed under consent" },
          { title: "Data Retention", status: "Configured", icon: Clock, color: "text-yellow-400", bg: "bg-yellow-400/10", detail: "90-day retention policy active" },
          { title: "Encryption", status: "Active", icon: Lock, color: "text-primary", bg: "bg-primary/10", detail: "AES-256 at rest & in transit" },
        ].map((item) => {
          const Icon = item.icon;
          return (
            <Card key={item.title} className="bg-card border-border">
              <CardContent className="p-4">
                <div className={`w-9 h-9 rounded-lg ${item.bg} flex items-center justify-center mb-3`}>
                  <Icon className={`w-5 h-5 ${item.color}`} />
                </div>
                <p className="text-sm font-semibold text-foreground">{item.title}</p>
                <Badge className={`text-xs border-0 mt-1 ${item.bg} ${item.color}`}>{item.status}</Badge>
                <p className="text-xs text-muted-foreground mt-2">{item.detail}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* GDPR Actions */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">Data Subject Rights</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              { title: "Export User Data", desc: "GDPR Article 20 — Data Portability", icon: Download, color: "text-blue-400" },
              { title: "Delete User Data", desc: "GDPR Article 17 — Right to Erasure", icon: Trash2, color: "text-red-400" },
              { title: "View Consent Records", desc: "Track all consent confirmations", icon: Eye, color: "text-green-400" },
            ].map((action) => {
              const Icon = action.icon;
              return (
                <Button key={action.title} variant="outline" className="h-auto flex flex-col items-start p-4 border-border hover:border-primary/30 hover:bg-primary/5">
                  <Icon className={`w-4 h-4 ${action.color} mb-2`} />
                  <p className="text-xs font-semibold text-foreground">{action.title}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5 text-left">{action.desc}</p>
                </Button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Audit Trail */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold">Audit Trail (Immutable Log)</CardTitle>
            <Badge className="bg-green-400/10 text-green-400 border-0 text-xs flex items-center gap-1">
              <CheckCircle className="w-3 h-3" /> Tamper-proof
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {auditLog.map((entry, i) => (
              <div key={i} className="flex items-center justify-between p-2.5 rounded-lg bg-secondary/50 hover:bg-secondary transition-colors">
                <div className="flex items-center gap-3">
                  <Badge className={`text-[10px] border-0 capitalize w-20 justify-center ${typeColors[entry.type]}`}>
                    {entry.type}
                  </Badge>
                  <div>
                    <p className="text-xs font-medium text-foreground">{entry.action}</p>
                    <p className="text-[10px] text-muted-foreground">{entry.user} · {entry.resource}</p>
                  </div>
                </div>
                <span className="text-[10px] text-muted-foreground flex-shrink-0">{entry.timestamp}</span>
              </div>
            ))}
          </div>
          <Button variant="outline" size="sm" className="w-full mt-3 h-8 border-border text-muted-foreground text-xs hover:border-primary/30">
            View Full Audit Log
          </Button>
        </CardContent>
      </Card>

      {/* Data Retention Policy */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">Data Retention Policy</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {[
              { type: "Active Contacts", retention: "Indefinite", policy: "Retained while account active" },
              { type: "Conversation History", retention: "90 days", policy: "Auto-purged after retention period" },
              { type: "Audit Logs", retention: "365 days", policy: "Immutable, exported before deletion" },
              { type: "AI Memory Embeddings", retention: "180 days", policy: "Re-computed on refresh" },
              { type: "Deleted Contact Data", retention: "30 days", policy: "Grace period before permanent deletion" },
            ].map((item) => (
              <div key={item.type} className="flex items-center justify-between p-3 rounded-lg border border-border/50 bg-secondary/30">
                <div>
                  <p className="text-xs font-medium text-foreground">{item.type}</p>
                  <p className="text-[10px] text-muted-foreground">{item.policy}</p>
                </div>
                <Badge className="bg-secondary text-muted-foreground border-0 text-[10px]">{item.retention}</Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
