"use client";

import { useState } from "react";
import useSWR from "swr";
import { RadarChart, Radar, PolarGrid, PolarAngleAxis, ResponsiveContainer, Tooltip } from "recharts";
import { Crown, Zap, Shield, Star, Clock, TrendingUp, DollarSign, Users, Plus, Edit, Trash2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { api, type Agent, type AgentCreate, ApiError } from "@/lib/api";
import { AgentForm } from "@/components/crm/forms/agent-form";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const badgeIcons: Record<string, React.ReactNode> = {
  "Top Closer": <Crown className="w-2.5 h-2.5" />,
  "Fast Responder": <Zap className="w-2.5 h-2.5" />,
  "Revenue King": <DollarSign className="w-2.5 h-2.5" />,
  "Consistent Performer": <Shield className="w-2.5 h-2.5" />,
  "Rising Star": <Star className="w-2.5 h-2.5" />,
};

const rankColors = [
  "bg-yellow-400 text-yellow-900",
  "bg-slate-300 text-slate-800",
  "bg-amber-600 text-white",
  "bg-secondary text-muted-foreground",
  "bg-secondary text-muted-foreground",
];

const statusColors: Record<string, string> = {
  online: "bg-green-400",
  Online: "bg-green-400",
  busy: "bg-yellow-400",
  Away: "bg-yellow-400",
  offline: "bg-muted-foreground",
  Offline: "bg-muted-foreground",
};

function AgentCard({
  agent,
  isSelected,
  onClick,
  onEdit,
  onDelete,
}: {
  agent: Agent;
  isSelected: boolean;
  onClick: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <Card
      onClick={onClick}
      className={cn(
        "bg-card border-border cursor-pointer transition-all duration-150 hover:border-primary/30 group relative",
        isSelected && "border-primary/50 bg-primary/5"
      )}
    >
      <CardContent className="p-4">
        {/* Actions */}
        <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 text-muted-foreground hover:text-foreground"
            onClick={(e) => {
              e.stopPropagation();
              onEdit();
            }}
          >
            <Edit className="w-3 h-3" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 text-muted-foreground hover:text-destructive"
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
          >
            <Trash2 className="w-3 h-3" />
          </Button>
        </div>

        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-sm font-bold text-primary">
                {agent.name
                  .split(" ")
                  .map((n) => n[0])
                  .join("")}
              </div>
              <span
                className={cn(
                  "absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-card",
                  statusColors[agent.status] ?? "bg-muted-foreground"
                )}
              />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">{agent.name}</p>
              <p className="text-xs text-muted-foreground">{agent.email}</p>
            </div>
          </div>
          <span
            className={cn(
              "w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold",
              rankColors[agent.rank - 1] ?? rankColors[4]
            )}
          >
            {agent.rank}
          </span>
        </div>

        {/* Metrics */}
        <div className="grid grid-cols-2 gap-2 mb-3">
          {[
            { label: "Leads", value: agent.leads_assigned, icon: Users, color: "text-blue-400" },
            { label: "Response", value: `${agent.response_time}h`, icon: Clock, color: "text-yellow-400" },
            { label: "Conv. Rate", value: `${agent.conversion_rate}%`, icon: TrendingUp, color: "text-green-400" },
            { label: "Revenue", value: `$${(agent.revenue / 1000).toFixed(0)}k`, icon: DollarSign, color: "text-primary" },
          ].map((m) => {
            const Icon = m.icon;
            return (
              <div key={m.label} className="bg-secondary/50 rounded-lg p-2">
                <div className="flex items-center gap-1.5 mb-0.5">
                  <Icon className={`w-3 h-3 ${m.color}`} />
                  <span className="text-[10px] text-muted-foreground">{m.label}</span>
                </div>
                <p className={`text-sm font-bold ${m.color}`}>{m.value}</p>
              </div>
            );
          })}
        </div>

        {/* Follow-up Rate */}
        <div>
          <div className="flex items-center justify-between mb-1 text-xs">
            <span className="text-muted-foreground">Follow-up Rate</span>
            <span className="font-medium text-foreground">{agent.follow_up_rate}%</span>
          </div>
          <div className="w-full h-1.5 bg-secondary rounded-full overflow-hidden">
            <div
              className={cn(
                "h-full rounded-full",
                agent.follow_up_rate >= 90 ? "bg-green-400" : agent.follow_up_rate >= 75 ? "bg-yellow-400" : "bg-orange-400"
              )}
              style={{ width: `${agent.follow_up_rate}%` }}
            />
          </div>
        </div>

        {/* Badges */}
        {agent.badges && agent.badges.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-3">
            {agent.badges.map((badge) => (
              <Badge key={badge} className="text-[10px] border-0 bg-primary/10 text-primary flex items-center gap-1">
                {badgeIcons[badge]} {badge}
              </Badge>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function AgentRadar({ agent }: { agent: Agent }) {
  const maxRevenue = 200000; // For normalization
  const data = [
    { metric: "Conversion", value: agent.conversion_rate },
    { metric: "Revenue", value: Math.round((agent.revenue / maxRevenue) * 100) },
    { metric: "Follow-up", value: agent.follow_up_rate },
    { metric: "Speed", value: Math.max(0, Math.round((1 - agent.response_time / 24) * 100)) },
    { metric: "Volume", value: Math.round((agent.leads_assigned / 100) * 100) },
  ];

  return (
    <ResponsiveContainer width="100%" height={220}>
      <RadarChart data={data}>
        <PolarGrid stroke="oklch(0.25 0.008 240)" />
        <PolarAngleAxis dataKey="metric" tick={{ fill: "oklch(0.55 0.01 240)", fontSize: 11 }} />
        <Radar
          name={agent.name}
          dataKey="value"
          stroke="oklch(0.6 0.22 250)"
          fill="oklch(0.6 0.22 250)"
          fillOpacity={0.25}
          strokeWidth={2}
        />
        <Tooltip
          contentStyle={{
            background: "oklch(0.16 0.006 240)",
            border: "1px solid oklch(0.25 0.008 240)",
            borderRadius: 8,
            fontSize: 12,
          }}
        />
      </RadarChart>
    </ResponsiveContainer>
  );
}

export function AgentsView() {
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editingAgent, setEditingAgent] = useState<Agent | null>(null);
  const [deleteAgent, setDeleteAgent] = useState<Agent | null>(null);
  const [loading, setLoading] = useState(false);

  // Fetch agents from API
  const { data: agents = [], isLoading, mutate } = useSWR("agents-list", () => api.agents.list());

  // Auto-select first agent
  if (agents.length > 0 && !selectedAgent) {
    setSelectedAgent(agents[0]);
  }

  const topAgents = [...agents].sort((a, b) => a.rank - b.rank).slice(0, 3);

  const handleCreate = async (data: AgentCreate) => {
    setLoading(true);
    try {
      await api.agents.create(data);
      toast.success("Agent created successfully");
      setFormOpen(false);
      mutate();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to create agent");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async (data: AgentCreate) => {
    if (!editingAgent) return;
    setLoading(true);
    try {
      const updated = await api.agents.update(editingAgent.id, data);
      toast.success("Agent updated successfully");
      setEditingAgent(null);
      mutate();
      if (selectedAgent?.id === updated.id) {
        setSelectedAgent(updated);
      }
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to update agent");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteAgent) return;
    setLoading(true);
    try {
      await api.agents.delete(deleteAgent.id);
      toast.success("Agent deleted successfully");
      setDeleteAgent(null);
      if (selectedAgent?.id === deleteAgent.id) {
        setSelectedAgent(null);
      }
      mutate();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to delete agent");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 space-y-6 overflow-y-auto">
      {/* Header with Add button */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground">Agent Management</h2>
        <Button size="sm" className="h-8 gap-1.5 bg-primary text-primary-foreground text-xs" onClick={() => setFormOpen(true)}>
          <Plus className="w-3.5 h-3.5" /> Add Agent
        </Button>
      </div>

      {/* Podium */}
      <Card className="bg-card border-border overflow-hidden">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold">Agent Leaderboard</CardTitle>
            <Badge className="bg-yellow-400/10 text-yellow-400 border-0 text-xs flex items-center gap-1">
              <Crown className="w-3 h-3" /> Live Rankings
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground text-sm">Loading agents...</div>
          ) : topAgents.length < 3 ? (
            <div className="text-center py-8 text-muted-foreground text-sm">Not enough agents for leaderboard</div>
          ) : (
            <div className="flex items-end justify-center gap-4 mb-4">
              {/* 2nd */}
              <div className="flex flex-col items-center gap-2">
                <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center text-sm font-bold text-primary">
                  {topAgents[1].name
                    .split(" ")
                    .map((n) => n[0])
                    .join("")}
                </div>
                <div className="text-center">
                  <p className="text-xs font-medium">{topAgents[1].name.split(" ")[0]}</p>
                  <p className="text-xs text-muted-foreground">${(topAgents[1].revenue / 1000).toFixed(0)}k</p>
                </div>
                <div className="w-16 h-16 bg-slate-400/20 rounded-t-lg flex items-end justify-center pb-2">
                  <span className="text-slate-400 font-bold text-lg">2</span>
                </div>
              </div>
              {/* 1st */}
              <div className="flex flex-col items-center gap-2">
                <Crown className="w-5 h-5 text-yellow-400" />
                <div className="w-14 h-14 rounded-full bg-yellow-400/20 flex items-center justify-center text-base font-bold text-yellow-400 ring-2 ring-yellow-400/50">
                  {topAgents[0].name
                    .split(" ")
                    .map((n) => n[0])
                    .join("")}
                </div>
                <div className="text-center">
                  <p className="text-xs font-semibold text-foreground">{topAgents[0].name.split(" ")[0]}</p>
                  <p className="text-xs text-yellow-400 font-bold">${(topAgents[0].revenue / 1000).toFixed(0)}k</p>
                </div>
                <div className="w-16 h-24 bg-yellow-400/20 rounded-t-lg flex items-end justify-center pb-2">
                  <span className="text-yellow-400 font-bold text-xl">1</span>
                </div>
              </div>
              {/* 3rd */}
              <div className="flex flex-col items-center gap-2">
                <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center text-sm font-bold text-primary">
                  {topAgents[2].name
                    .split(" ")
                    .map((n) => n[0])
                    .join("")}
                </div>
                <div className="text-center">
                  <p className="text-xs font-medium">{topAgents[2].name.split(" ")[0]}</p>
                  <p className="text-xs text-muted-foreground">${(topAgents[2].revenue / 1000).toFixed(0)}k</p>
                </div>
                <div className="w-16 h-10 bg-amber-600/20 rounded-t-lg flex items-end justify-center pb-2">
                  <span className="text-amber-600 font-bold">3</span>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Agent cards grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {agents.map((agent) => (
          <AgentCard
            key={agent.id}
            agent={agent}
            isSelected={selectedAgent?.id === agent.id}
            onClick={() => setSelectedAgent(agent)}
            onEdit={() => setEditingAgent(agent)}
            onDelete={() => setDeleteAgent(agent)}
          />
        ))}
      </div>

      {/* Selected Agent Deep Dive */}
      {selectedAgent && (
        <Card className="bg-card border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Performance Profile - {selectedAgent.name}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <AgentRadar agent={selectedAgent} />
              <div className="space-y-4">
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                    Detailed Metrics
                  </p>
                  <div className="space-y-3">
                    {[
                      { label: "Leads Assigned", value: selectedAgent.leads_assigned, max: 100, color: "bg-blue-400" },
                      {
                        label: "Conversion Rate",
                        value: selectedAgent.conversion_rate,
                        max: 50,
                        color: "bg-green-400",
                        suffix: "%",
                      },
                      {
                        label: "Follow-up Rate",
                        value: selectedAgent.follow_up_rate,
                        max: 100,
                        color: "bg-yellow-400",
                        suffix: "%",
                      },
                      {
                        label: "Response Time Score",
                        value: Math.max(0, Math.round((1 - selectedAgent.response_time / 24) * 100)),
                        max: 100,
                        color: "bg-primary",
                        suffix: "%",
                      },
                    ].map((m) => (
                      <div key={m.label}>
                        <div className="flex items-center justify-between mb-1 text-xs">
                          <span className="text-muted-foreground">{m.label}</span>
                          <span className="font-medium text-foreground">
                            {m.value}
                            {m.suffix ?? ""}
                          </span>
                        </div>
                        <div className="w-full h-2 bg-secondary rounded-full overflow-hidden">
                          <div
                            className={`h-full ${m.color} rounded-full`}
                            style={{ width: `${Math.min((m.value / m.max) * 100, 100)}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="p-3 rounded-lg bg-primary/10 border border-primary/20">
                  <p className="text-xs font-semibold text-primary mb-1">Total Revenue Generated</p>
                  <p className="text-2xl font-bold text-foreground">${selectedAgent.revenue.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Avg response: {selectedAgent.response_time}h</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Create Agent Form */}
      <AgentForm
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSubmit={handleCreate}
        loading={loading}
        title="New Agent"
      />

      {/* Edit Agent Form */}
      <AgentForm
        open={!!editingAgent}
        onClose={() => setEditingAgent(null)}
        onSubmit={handleUpdate}
        defaultValues={editingAgent ?? undefined}
        loading={loading}
        title="Edit Agent"
      />

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteAgent} onOpenChange={(open) => !open && setDeleteAgent(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Agent</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {deleteAgent?.name}? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
