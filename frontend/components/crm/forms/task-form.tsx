"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import type { Task, TaskCreate } from "@/lib/api";

const PRIORITIES = ["Low", "Medium", "High", "Critical"];
const STATUSES = ["Pending", "In Progress", "Done", "Overdue"];
const TYPES = ["Follow-up", "Demo", "Proposal", "Call", "Email", "Contract Review"];

const schema = z.object({
  title: z.string().min(1, "Title is required"),
  contact_name: z.string().optional(),
  assigned_agent: z.string().optional(),
  due_date: z.string().optional(),
  priority: z.string().default("Medium"),
  status: z.string().default("Pending"),
  type: z.string().default("Follow-up"),
  automated: z.boolean().default(false),
});

type FormValues = z.infer<typeof schema>;

interface TaskFormProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: TaskCreate) => Promise<void>;
  defaultValues?: Partial<Task>;
  title?: string;
  loading?: boolean;
}

export function TaskForm({
  open,
  onClose,
  onSubmit,
  defaultValues,
  title = "New Task",
  loading = false,
}: TaskFormProps) {
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: "",
      priority: "Medium",
      status: "Pending",
      type: "Follow-up",
      automated: false,
    },
  });

  useEffect(() => {
    if (defaultValues) {
      reset({
        title: defaultValues.title ?? "",
        contact_name: defaultValues.contact_name ?? "",
        assigned_agent: defaultValues.assigned_agent ?? "",
        due_date: defaultValues.due_date?.slice(0, 10) ?? "",
        priority: defaultValues.priority ?? "Medium",
        status: defaultValues.status ?? "Pending",
        type: defaultValues.type ?? "Follow-up",
        automated: defaultValues.automated ?? false,
      });
    }
  }, [defaultValues, reset]);

  const handleClose = () => {
    reset();
    onClose();
  };

  const onValid = async (values: FormValues) => {
    await onSubmit({
      ...values,
      contact_id: defaultValues?.contact_id,
    } as TaskCreate);
    reset();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onValid)} className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2 space-y-1">
              <Label htmlFor="title">Task Title *</Label>
              <Input id="title" {...register("title")} placeholder="Follow up on enterprise proposal" />
              {errors.title && <p className="text-xs text-destructive">{errors.title.message}</p>}
            </div>

            <div className="col-span-2 space-y-1">
              <Label htmlFor="contact_name">Contact</Label>
              <Input id="contact_name" {...register("contact_name")} placeholder="Alexandra Rhodes" />
            </div>

            <div className="space-y-1">
              <Label>Type</Label>
              <Select value={watch("type")} onValueChange={(v) => setValue("type", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label>Priority</Label>
              <Select value={watch("priority")} onValueChange={(v) => setValue("priority", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PRIORITIES.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label>Status</Label>
              <Select value={watch("status")} onValueChange={(v) => setValue("status", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label htmlFor="due_date">Due Date</Label>
              <Input id="due_date" type="date" {...register("due_date")} />
            </div>

            <div className="col-span-2 space-y-1">
              <Label htmlFor="assigned_agent">Assigned Agent</Label>
              <Input id="assigned_agent" {...register("assigned_agent")} placeholder="Sarah Chen" />
            </div>

            <div className="col-span-2 flex items-center gap-2">
              <Checkbox
                id="automated"
                checked={watch("automated")}
                onCheckedChange={(v) => setValue("automated", !!v)}
              />
              <Label htmlFor="automated" className="cursor-pointer">
                Automated task (triggered by workflow)
              </Label>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose}>Cancel</Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Saving..." : "Save Task"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
