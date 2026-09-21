"use client";

import { useState } from "react";
import { Zap, Play, Pause, Plus, ChevronRight, CheckCircle, GitBranch, MessageSquare, Users, Bell, Tag } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface Workflow {
  id: string;
  name: string;
  trigger: string;
  steps: number;
  runs: number;
  successRate: number;
  active: boolean;
  category: "lead" | "sales" | "retention" | "notification";
}

const workflows: Workflow[] = [
  { id: "w1", name: "Hot Lead Instant Assignment", trigger: "Lead score > 80", steps: 4, runs: 284, successRate: 94, active: true, category: "lead" },
  { id: "w2", name: "New Lead Welcome Sequence", trigger: "New lead created", steps: 6, runs: 1847, successRate: 88, active: true, category: "lead" },
  { id: "w3", name: "Instagram DM Auto-Reply", trigger: "DM received", steps: 3, runs: 2341, successRate: 97, active: true, category: "sales" },
  { id: "w4", name: "Warm Lead Nurture Flow", trigger: "Score 31-70 + inactive 3 days", steps: 8, runs: 412, successRate: 72, active: true, category: "lead" },
  { id: "w5", name: "Deal Won Celebration & Onboard", trigger: "Stage = Won", steps: 5, runs: 67, successRate: 100, active: true, category: "sales" },
  { id: "w6", name: "SLA Breach Escalation", trigger: "No reply in 24 hours", steps: 3, runs: 89, successRate: 91, active: true, category: "notification" },
  { id: "w7", name: "Cold Lead Retargeting", trigger: "Score < 30 + 14 days", steps: 5, runs: 156, successRate: 34, active: false, category: "retention" },
  { id: "w8", name: "VIP Customer Loyalty Flow", trigger: "Revenue > $20k", steps: 7, runs: 23, successRate: 100, active: true, category: "retention" },
];

const categoryColors = {
  lead: "bg-blue-400/10 text-blue-400",
  sales: "bg-green-400/10 text-green-400",
  retention: "bg-purple-400/10 text-purple-400",
  notification: "bg-yellow-400/10 text-yellow-400",
};

const stepTypes = [
  { icon: <MessageSquare className="w-3 h-3" />, label: "Send Message", color: "bg-blue-400/20 text-blue-400" },
  { icon: <Users className="w-3 h-3" />, label: "Assign Agent", color: "bg-green-400/20 text-green-400" },
  { icon: <Tag className="w-3 h-3" />, label: "Update Tag", color: "bg-yellow-400/20 text-yellow-400" },
  { icon: <Bell className="w-3 h-3" />, label: "Send Alert", color: "bg-orange-400/20 text-orange-400" },
  { icon: <GitBranch className="w-3 h-3" />, label: "Condition", color: "bg-purple-400/20 text-purple-400" },
  { icon: <CheckCircle className="w-3 h-3" />, label: "Update Stage", color: "bg-primary/20 text-primary" },
];

function WorkflowCard({ workflow, onToggle }: { workflow: Workflow; onToggle: (id: string) => void }) {
  return (
    <Card className={cn("bg-card border-border transition-all duration-150 hover:border-primary/30", !workflow.active && "opacity-60")}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-start gap-2">
            <div className={cn("w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5", workflow.active ? "bg-primary/20" : "bg-secondary")}>
              <Zap className={cn("w-3.5 h-3.5", workflow.active ? "text-primary" : "text-muted-foreground")} />
            </div>
            <div>
              <p className="text-xs font-semibold text-foreground">{workflow.name}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">Trigger: {workflow.trigger}</p>
            </div>
          </div>
          <button
            onClick={() => onToggle(workflow.id)}
            className={cn(
              "w-10 h-5 rounded-full transition-colors flex-shrink-0",
              workflow.active ? "bg-primary" : "bg-secondary"
            )}
          >
            <div className={cn("w-4 h-4 bg-white rounded-full m-0.5 transition-transform", workflow.active ? "translate-x-5" : "translate-x-0")} />
          </button>
        </div>

        <div className="grid grid-cols-3 gap-2 mb-3">
          <div className="text-center">
            <p className="text-sm font-bold text-foreground">{workflow.steps}</p>
            <p className="text-[10px] text-muted-foreground">Steps</p>
          </div>
          <div className="text-center">
            <p className="text-sm font-bold text-primary">{workflow.runs.toLocaleString()}</p>
            <p className="text-[10px] text-muted-foreground">Runs</p>
          </div>
          <div className="text-center">
            <p className={cn("text-sm font-bold", workflow.successRate >= 90 ? "text-green-400" : workflow.successRate >= 70 ? "text-yellow-400" : "text-orange-400")}>
              {workflow.successRate}%
            </p>
            <p className="text-[10px] text-muted-foreground">Success</p>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <Badge className={cn("text-[10px] border-0 capitalize", categoryColors[workflow.category])}>
            {workflow.category}
          </Badge>
          <div className="flex items-center gap-1">
            <div className={cn("w-full h-1 bg-secondary rounded-full overflow-hidden w-20")}>
              <div
                className={cn("h-full rounded-full", workflow.successRate >= 90 ? "bg-green-400" : workflow.successRate >= 70 ? "bg-yellow-400" : "bg-orange-400")}
                style={{ width: `${workflow.successRate}%` }}
              />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function AutomationView() {
  const [workflowList, setWorkflowList] = useState(workflows);
  const [selectedWorkflow, setSelectedWorkflow] = useState(workflows[0]);

  const toggleWorkflow = (id: string) => {
    setWorkflowList((prev) => prev.map((w) => w.id === id ? { ...w, active: !w.active } : w));
  };

  const activeCount = workflowList.filter((w) => w.active).length;
  const totalRuns = workflowList.reduce((s, w) => s + w.runs, 0);

  return (
    <div className="p-6 space-y-6 overflow-y-auto">
      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Active Workflows", value: activeCount, color: "text-green-400" },
          { label: "Total Workflows", value: workflowList.length, color: "text-primary" },
          { label: "Total Executions", value: totalRuns.toLocaleString(), color: "text-yellow-400" },
          { label: "Avg Success Rate", value: `${Math.round(workflowList.reduce((s, w) => s + w.successRate, 0) / workflowList.length)}%`, color: "text-blue-400" },
        ].map((s) => (
          <Card key={s.label} className="bg-card border-border">
            <CardContent className="p-4">
              <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{s.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Workflow builder preview */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold">Workflow Builder — {selectedWorkflow.name}</CardTitle>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="h-7 gap-1.5 border-border text-muted-foreground text-xs">
                <Pause className="w-3 h-3" /> Pause
              </Button>
              <Button size="sm" className="h-7 gap-1.5 bg-primary text-primary-foreground text-xs">
                <Play className="w-3 h-3" /> Run
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Visual workflow steps */}
          <div className="flex items-center gap-0 overflow-x-auto pb-2">
            {/* Trigger */}
            <div className="flex-shrink-0 flex flex-col items-center">
              <div className="w-32 p-2.5 rounded-lg bg-orange-400/10 border border-orange-400/30 text-center">
                <Zap className="w-4 h-4 text-orange-400 mx-auto mb-1" />
                <p className="text-[10px] font-semibold text-orange-400">TRIGGER</p>
                <p className="text-[10px] text-foreground mt-0.5">{selectedWorkflow.trigger}</p>
              </div>
            </div>

            {/* Arrow */}
            <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />

            {/* Steps */}
            {stepTypes.slice(0, selectedWorkflow.steps - 1).map((step, i) => (
              <div key={i} className="flex items-center gap-0 flex-shrink-0">
                <div className={cn("w-28 p-2.5 rounded-lg border text-center", step.color.replace("text-", "border-").replace("400", "400/30"))}>
                  <div className={cn("w-5 h-5 rounded-full flex items-center justify-center mx-auto mb-1", step.color)}>
                    {step.icon}
                  </div>
                  <p className="text-[10px] text-foreground">{step.label}</p>
                </div>
                {i < selectedWorkflow.steps - 2 && (
                  <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                )}
              </div>
            ))}

            <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />

            {/* End */}
            <div className="flex-shrink-0">
              <div className="w-24 p-2.5 rounded-lg bg-green-400/10 border border-green-400/30 text-center">
                <CheckCircle className="w-4 h-4 text-green-400 mx-auto mb-1" />
                <p className="text-[10px] font-semibold text-green-400">COMPLETE</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Workflow cards grid */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-foreground">All Workflows</h3>
          <Button size="sm" className="h-8 gap-1.5 bg-primary text-primary-foreground text-xs">
            <Plus className="w-3.5 h-3.5" /> New Workflow
          </Button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
          {workflowList.map((workflow) => (
            <div key={workflow.id} onClick={() => setSelectedWorkflow(workflow)}>
              <WorkflowCard workflow={workflow} onToggle={toggleWorkflow} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
