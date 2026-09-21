"use client";

import { useState } from "react";
import useSWR from "swr";
import { Plus, MoreHorizontal, DollarSign, TrendingUp, Calendar, Edit, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { api, type Deal, type DealCreate, ApiError } from "@/lib/api";
import { DealForm } from "@/components/crm/forms/deal-form";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type LeadStage = "New Lead" | "Contacted" | "Qualified" | "Proposal Sent" | "Negotiation" | "Won" | "Lost";

const stages: LeadStage[] = ["New Lead", "Contacted", "Qualified", "Proposal Sent", "Negotiation", "Won", "Lost"];

const stageColors: Record<LeadStage, string> = {
  "New Lead": "border-slate-500/40 text-slate-400",
  Contacted: "border-blue-500/40 text-blue-400",
  Qualified: "border-yellow-500/40 text-yellow-400",
  "Proposal Sent": "border-purple-500/40 text-purple-400",
  Negotiation: "border-orange-500/40 text-orange-400",
  Won: "border-green-500/40 text-green-400",
  Lost: "border-red-500/40 text-red-400",
};

const stageBg: Record<LeadStage, string> = {
  "New Lead": "bg-slate-500/10",
  Contacted: "bg-blue-500/10",
  Qualified: "bg-yellow-500/10",
  "Proposal Sent": "bg-purple-500/10",
  Negotiation: "bg-orange-500/10",
  Won: "bg-green-500/10",
  Lost: "bg-red-500/10",
};

const channelEmoji: Record<string, string> = {
  instagram: "IG",
  whatsapp: "WA",
  facebook: "FB",
  email: "EM",
  web: "WB",
  ads: "AD",
  Email: "EM",
  LinkedIn: "LI",
  WhatsApp: "WA",
  Phone: "PH",
  Referral: "RF",
  Website: "WB",
  Event: "EV",
  SMS: "SM",
};

function ProbabilityBar({ probability }: { probability: number }) {
  const color =
    probability >= 80
      ? "bg-green-400"
      : probability >= 50
        ? "bg-yellow-400"
        : probability >= 20
          ? "bg-orange-400"
          : "bg-red-400";

  return (
    <div className="w-full h-1 bg-secondary rounded-full overflow-hidden mt-2">
      <div className={`h-full ${color} rounded-full transition-all duration-500`} style={{ width: `${probability}%` }} />
    </div>
  );
}

function DealCard({
  deal,
  onEdit,
  onDelete,
  onMoveStage,
}: {
  deal: Deal;
  onEdit: () => void;
  onDelete: () => void;
  onMoveStage: (stage: string) => void;
}) {
  const currentStageIndex = stages.indexOf(deal.stage as LeadStage);

  return (
    <div className="bg-card border border-border rounded-lg p-3 hover:border-primary/30 transition-all duration-150 hover:shadow-lg hover:shadow-primary/5">
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-foreground truncate">{deal.title}</p>
          <p className="text-[10px] text-muted-foreground">{deal.contact_name ?? "No contact"}</p>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-5 w-5 text-muted-foreground flex-shrink-0">
              <MoreHorizontal className="w-3 h-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-40">
            <DropdownMenuItem onClick={onEdit}>
              <Edit className="w-3 h-3 mr-2" /> Edit
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-xs text-muted-foreground" disabled>
              Move to...
            </DropdownMenuItem>
            {stages.map((stage, idx) => (
              <DropdownMenuItem
                key={stage}
                onClick={() => onMoveStage(stage)}
                disabled={stage === deal.stage}
                className={cn(idx === currentStageIndex && "bg-primary/10")}
              >
                {stage}
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onDelete} className="text-destructive focus:text-destructive">
              <Trash2 className="w-3 h-3 mr-2" /> Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1 text-sm font-bold text-primary">
          <DollarSign className="w-3 h-3" />
          {(deal.value / 1000).toFixed(0)}k
        </div>
        <span className="text-[10px] text-muted-foreground">{channelEmoji[deal.channel] ?? deal.channel}</span>
      </div>

      <ProbabilityBar probability={deal.probability} />

      <div className="flex items-center justify-between mt-2">
        <span className="text-[10px] text-muted-foreground flex items-center gap-1">
          <Calendar className="w-2.5 h-2.5" />
          {deal.close_date ?? "No date"}
        </span>
        <div className="flex items-center gap-1">
          <TrendingUp className="w-2.5 h-2.5 text-muted-foreground" />
          <span className="text-[10px] text-muted-foreground">{deal.probability}%</span>
        </div>
      </div>

      <div className="mt-2 pt-2 border-t border-border/50">
        <p className="text-[10px] text-muted-foreground">{deal.assigned_agent ?? "Unassigned"}</p>
      </div>
    </div>
  );
}

function StageColumn({
  stage,
  deals,
  onAddDeal,
  onEditDeal,
  onDeleteDeal,
  onMoveDeal,
}: {
  stage: LeadStage;
  deals: Deal[];
  onAddDeal: (stage: string) => void;
  onEditDeal: (deal: Deal) => void;
  onDeleteDeal: (deal: Deal) => void;
  onMoveDeal: (deal: Deal, stage: string) => void;
}) {
  const totalValue = deals.reduce((sum, d) => sum + d.value, 0);

  return (
    <div className="flex flex-col min-w-52 max-w-56 flex-shrink-0">
      {/* Stage header */}
      <div className={cn("rounded-lg p-3 mb-3 border", stageBg[stage], stageColors[stage])}>
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs font-semibold">{stage}</span>
          <Badge className={cn("text-[10px] border-0 px-1.5", stageBg[stage], stageColors[stage])}>{deals.length}</Badge>
        </div>
        <p className="text-sm font-bold">${(totalValue / 1000).toFixed(0)}k</p>
      </div>

      {/* Deal cards */}
      <div className="flex-1 space-y-2 min-h-20">
        {deals.map((deal) => (
          <DealCard
            key={deal.id}
            deal={deal}
            onEdit={() => onEditDeal(deal)}
            onDelete={() => onDeleteDeal(deal)}
            onMoveStage={(newStage) => onMoveDeal(deal, newStage)}
          />
        ))}
      </div>

      {/* Add deal */}
      <Button
        variant="ghost"
        size="sm"
        className="mt-2 h-7 w-full text-xs text-muted-foreground border border-dashed border-border hover:border-primary/30 hover:text-primary"
        onClick={() => onAddDeal(stage)}
      >
        <Plus className="w-3 h-3 mr-1" /> Add Deal
      </Button>
    </div>
  );
}

export function PipelineView() {
  const [formOpen, setFormOpen] = useState(false);
  const [defaultStage, setDefaultStage] = useState<string>("New Lead");
  const [editingDeal, setEditingDeal] = useState<Deal | null>(null);
  const [deleteDeal, setDeleteDeal] = useState<Deal | null>(null);
  const [loading, setLoading] = useState(false);

  // Fetch deals from API
  const { data: deals = [], isLoading, mutate } = useSWR("deals-list", () => api.deals.list());

  const dealsByStage = stages.reduce(
    (acc, stage) => {
      acc[stage] = deals.filter((d) => d.stage === stage);
      return acc;
    },
    {} as Record<LeadStage, Deal[]>
  );

  const totalPipelineValue = deals.filter((d) => d.stage !== "Lost").reduce((s, d) => s + d.value, 0);
  const wonValue = deals.filter((d) => d.stage === "Won").reduce((s, d) => s + d.value, 0);
  const activeDeals = deals.filter((d) => d.stage !== "Won" && d.stage !== "Lost");
  const avgProbability = activeDeals.length
    ? Math.round(activeDeals.reduce((s, d) => s + d.probability, 0) / activeDeals.length)
    : 0;

  const handleCreate = async (data: DealCreate) => {
    setLoading(true);
    try {
      await api.deals.create(data);
      toast.success("Deal created successfully");
      setFormOpen(false);
      mutate();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to create deal");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async (data: DealCreate) => {
    if (!editingDeal) return;
    setLoading(true);
    try {
      await api.deals.update(editingDeal.id, data);
      toast.success("Deal updated successfully");
      setEditingDeal(null);
      mutate();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to update deal");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteDeal) return;
    setLoading(true);
    try {
      await api.deals.delete(deleteDeal.id);
      toast.success("Deal deleted successfully");
      setDeleteDeal(null);
      mutate();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to delete deal");
    } finally {
      setLoading(false);
    }
  };

  const handleMoveStage = async (deal: Deal, newStage: string) => {
    try {
      await api.deals.moveStage(deal.id, newStage);
      toast.success(`Deal moved to ${newStage}`);
      mutate();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to move deal");
    }
  };

  const handleAddDeal = (stage: string) => {
    setDefaultStage(stage);
    setFormOpen(true);
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Metrics bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 border-b border-border">
        {[
          { label: "Total Pipeline", value: `$${(totalPipelineValue / 1000).toFixed(0)}k`, color: "text-primary" },
          { label: "Won This Month", value: `$${(wonValue / 1000).toFixed(0)}k`, color: "text-green-400" },
          { label: "Avg Probability", value: `${avgProbability}%`, color: "text-yellow-400" },
          { label: "Active Deals", value: activeDeals.length.toString(), color: "text-blue-400" },
        ].map((m) => (
          <div key={m.label} className="bg-secondary/50 rounded-lg p-3">
            <p className="text-xs text-muted-foreground">{m.label}</p>
            <p className={`text-xl font-bold mt-0.5 ${m.color}`}>{m.value}</p>
          </div>
        ))}
      </div>

      {/* Kanban Board */}
      <div className="flex-1 overflow-x-auto overflow-y-auto p-4">
        {isLoading ? (
          <div className="flex items-center justify-center h-40">
            <div className="text-sm text-muted-foreground">Loading deals...</div>
          </div>
        ) : (
          <div className="flex gap-3 h-full min-h-96">
            {stages.map((stage) => (
              <StageColumn
                key={stage}
                stage={stage}
                deals={dealsByStage[stage]}
                onAddDeal={handleAddDeal}
                onEditDeal={setEditingDeal}
                onDeleteDeal={setDeleteDeal}
                onMoveDeal={handleMoveStage}
              />
            ))}
          </div>
        )}
      </div>

      {/* Create Deal Form */}
      <DealForm
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSubmit={handleCreate}
        defaultStage={defaultStage}
        loading={loading}
        title="New Deal"
      />

      {/* Edit Deal Form */}
      <DealForm
        open={!!editingDeal}
        onClose={() => setEditingDeal(null)}
        onSubmit={handleUpdate}
        defaultValues={editingDeal ?? undefined}
        loading={loading}
        title="Edit Deal"
      />

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteDeal} onOpenChange={(open) => !open && setDeleteDeal(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Deal</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{deleteDeal?.title}&quot;? This action cannot be undone.
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
