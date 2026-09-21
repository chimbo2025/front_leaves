"use client";

import { useState } from "react";
import useSWR from "swr";
import {
  CheckSquare,
  Clock,
  Plus,
  Filter,
  AlertTriangle,
  Zap,
  Phone,
  Mail,
  Users,
  Video,
  Calendar,
  Edit,
  Trash2,
} from "lucide-react";
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
import { api, type Task, type TaskCreate, ApiError } from "@/lib/api";
import { TaskForm } from "@/components/crm/forms/task-form";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const priorityColors: Record<string, string> = {
  high: "bg-red-400/10 text-red-400 border-red-400/20",
  High: "bg-red-400/10 text-red-400 border-red-400/20",
  Critical: "bg-red-400/10 text-red-400 border-red-400/20",
  medium: "bg-yellow-400/10 text-yellow-400 border-yellow-400/20",
  Medium: "bg-yellow-400/10 text-yellow-400 border-yellow-400/20",
  low: "bg-blue-400/10 text-blue-400 border-blue-400/20",
  Low: "bg-blue-400/10 text-blue-400 border-blue-400/20",
};

const statusColors: Record<string, string> = {
  pending: "bg-secondary text-muted-foreground",
  Pending: "bg-secondary text-muted-foreground",
  "in-progress": "bg-primary/10 text-primary",
  "In Progress": "bg-primary/10 text-primary",
  completed: "bg-green-400/10 text-green-400",
  Done: "bg-green-400/10 text-green-400",
  overdue: "bg-red-400/10 text-red-400",
  Overdue: "bg-red-400/10 text-red-400",
};

const typeIcons: Record<string, React.ReactNode> = {
  "follow-up": <Clock className="w-3 h-3" />,
  "Follow-up": <Clock className="w-3 h-3" />,
  call: <Phone className="w-3 h-3" />,
  Call: <Phone className="w-3 h-3" />,
  email: <Mail className="w-3 h-3" />,
  Email: <Mail className="w-3 h-3" />,
  meeting: <Users className="w-3 h-3" />,
  demo: <Video className="w-3 h-3" />,
  Demo: <Video className="w-3 h-3" />,
  Proposal: <Mail className="w-3 h-3" />,
  "Contract Review": <Mail className="w-3 h-3" />,
};

type TaskStatus = "all" | "pending" | "in-progress" | "overdue" | "completed";

function normalizeStatus(status: string): TaskStatus {
  const s = status.toLowerCase().replace(" ", "-");
  if (s === "done") return "completed";
  return s as TaskStatus;
}

function TaskCard({
  task,
  onToggle,
  onEdit,
  onDelete,
}: {
  task: Task;
  onToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const normalizedStatus = normalizeStatus(task.status);

  return (
    <div
      className={cn(
        "flex items-start gap-3 p-3 rounded-lg border transition-all duration-150 group",
        normalizedStatus === "completed"
          ? "border-border/30 opacity-60"
          : normalizedStatus === "overdue"
            ? "border-red-400/20 bg-red-400/5"
            : normalizedStatus === "in-progress"
              ? "border-primary/20 bg-primary/5"
              : "border-border bg-card hover:border-primary/20"
      )}
    >
      {/* Checkbox */}
      <button
        onClick={onToggle}
        className={cn(
          "w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5 transition-colors",
          normalizedStatus === "completed" ? "border-green-400 bg-green-400/20" : "border-border hover:border-primary"
        )}
      >
        {normalizedStatus === "completed" && <CheckSquare className="w-2.5 h-2.5 text-green-400" />}
      </button>

      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <p
            className={cn(
              "text-xs font-medium",
              normalizedStatus === "completed" ? "line-through text-muted-foreground" : "text-foreground"
            )}
          >
            {task.title}
          </p>
          <div className="flex items-center gap-1 flex-shrink-0">
            {task.automated && (
              <Badge className="bg-primary/10 text-primary border-0 text-[10px] flex items-center gap-0.5">
                <Zap className="w-2.5 h-2.5" /> Auto
              </Badge>
            )}
            <Badge className={cn("text-[10px] border", priorityColors[task.priority] ?? priorityColors.medium)}>
              {task.priority}
            </Badge>
          </div>
        </div>

        <div className="flex items-center gap-3 mt-1.5">
          <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
            {typeIcons[task.type] ?? <Clock className="w-3 h-3" />}
            <span className="capitalize">{task.type}</span>
          </div>
          <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
            <Calendar className="w-2.5 h-2.5" />
            <span className={normalizedStatus === "overdue" ? "text-red-400 font-medium" : ""}>
              {task.due_date ?? "No due date"}
            </span>
            {normalizedStatus === "overdue" && <AlertTriangle className="w-2.5 h-2.5 text-red-400" />}
          </div>
        </div>

        <div className="flex items-center justify-between mt-1.5">
          {task.contact_name && (
            <p className="text-[10px] text-muted-foreground">
              Contact: <span className="text-foreground">{task.contact_name}</span>
            </p>
          )}
          <Badge className={cn("text-[10px] border-0 ml-auto", statusColors[task.status] ?? statusColors.pending)}>
            {task.status.replace("-", " ")}
          </Badge>
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
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
    </div>
  );
}

export function TasksView() {
  const [filter, setFilter] = useState<TaskStatus>("all");
  const [formOpen, setFormOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [deleteTask, setDeleteTask] = useState<Task | null>(null);
  const [loading, setLoading] = useState(false);

  // Fetch tasks from API
  const { data: tasks = [], isLoading, mutate } = useSWR("tasks-list", () => api.tasks.list());

  const getCounts = () => {
    const counts = {
      all: tasks.length,
      pending: 0,
      "in-progress": 0,
      overdue: 0,
      completed: 0,
    };
    tasks.forEach((t) => {
      const s = normalizeStatus(t.status);
      if (counts[s] !== undefined) counts[s]++;
    });
    return counts;
  };

  const counts = getCounts();

  const filtered = filter === "all" ? tasks : tasks.filter((t) => normalizeStatus(t.status) === filter);

  const handleCreate = async (data: TaskCreate) => {
    setLoading(true);
    try {
      await api.tasks.create(data);
      toast.success("Task created successfully");
      setFormOpen(false);
      mutate();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to create task");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async (data: TaskCreate) => {
    if (!editingTask) return;
    setLoading(true);
    try {
      await api.tasks.update(editingTask.id, data);
      toast.success("Task updated successfully");
      setEditingTask(null);
      mutate();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to update task");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTask) return;
    setLoading(true);
    try {
      await api.tasks.delete(deleteTask.id);
      toast.success("Task deleted successfully");
      setDeleteTask(null);
      mutate();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to delete task");
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = async (task: Task) => {
    try {
      await api.tasks.toggle(task.id);
      toast.success(normalizeStatus(task.status) === "completed" ? "Task reopened" : "Task completed");
      mutate();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to toggle task");
    }
  };

  return (
    <div className="p-6 space-y-6 overflow-y-auto">
      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Total Tasks", count: counts.all, color: "text-primary", bg: "bg-primary/10" },
          { label: "Overdue", count: counts.overdue, color: "text-red-400", bg: "bg-red-400/10" },
          { label: "Pending", count: counts.pending, color: "text-yellow-400", bg: "bg-yellow-400/10" },
          { label: "Completed", count: counts.completed, color: "text-green-400", bg: "bg-green-400/10" },
        ].map((s) => (
          <Card key={s.label} className="bg-card border-border">
            <CardContent className="p-4">
              <p className={`text-3xl font-bold ${s.color}`}>{s.count}</p>
              <p className="text-xs text-muted-foreground mt-1">{s.label}</p>
              <div className={`w-8 h-1 rounded-full mt-2 ${s.bg.replace("/10", "/40")}`} />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Main panel */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold">Task Queue</CardTitle>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" className="h-7 gap-1.5 border-border text-muted-foreground text-xs">
                <Filter className="w-3 h-3" /> Filter
              </Button>
              <Button
                size="sm"
                className="h-7 gap-1.5 bg-primary text-primary-foreground text-xs"
                onClick={() => setFormOpen(true)}
              >
                <Plus className="w-3 h-3" /> New Task
              </Button>
            </div>
          </div>
          {/* Filter tabs */}
          <div className="flex gap-1 mt-2">
            {(["all", "pending", "in-progress", "overdue", "completed"] as const).map((f) => (
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
                {f.replace("-", " ")} ({counts[f]})
              </Button>
            ))}
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground text-sm">Loading tasks...</div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm">No tasks in this category.</div>
          ) : (
            filtered.map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                onToggle={() => handleToggle(task)}
                onEdit={() => setEditingTask(task)}
                onDelete={() => setDeleteTask(task)}
              />
            ))
          )}
        </CardContent>
      </Card>

      {/* Automation info */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Zap className="w-4 h-4 text-primary" />
            Auto-Generated Tasks
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              { trigger: "New Lead Created", action: "Create follow-up task in 1 hour", status: "Active", count: 24 },
              { trigger: "Lead Score > 70", action: "Assign high-priority call task", status: "Active", count: 8 },
              { trigger: "No contact for 3 days", action: "Create re-engagement email task", status: "Active", count: 12 },
            ].map((rule) => (
              <div key={rule.trigger} className="p-3 rounded-lg bg-secondary/50 border border-border/50">
                <div className="flex items-center justify-between mb-2">
                  <Badge className="bg-primary/10 text-primary border-0 text-[10px]">Active</Badge>
                  <span className="text-xs font-bold text-foreground">{rule.count} tasks</span>
                </div>
                <p className="text-xs font-medium text-foreground mb-1">IF: {rule.trigger}</p>
                <p className="text-[11px] text-muted-foreground">THEN: {rule.action}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Create Task Form */}
      <TaskForm
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSubmit={handleCreate}
        loading={loading}
        title="New Task"
      />

      {/* Edit Task Form */}
      <TaskForm
        open={!!editingTask}
        onClose={() => setEditingTask(null)}
        onSubmit={handleUpdate}
        defaultValues={editingTask ?? undefined}
        loading={loading}
        title="Edit Task"
      />

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteTask} onOpenChange={(open) => !open && setDeleteTask(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Task</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{deleteTask?.title}&quot;? This action cannot be undone.
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
