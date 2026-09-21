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
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import type { Deal, DealCreate } from "@/lib/api";

const STAGES = ["Lead", "Qualified", "Proposal Sent", "In Negotiation", "Closed Won", "Closed Lost"];
const CHANNELS = ["Email", "LinkedIn", "WhatsApp", "Phone", "Referral", "Website", "Event", "SMS"];

const schema = z.object({
  title: z.string().min(1, "Title is required"),
  contact_name: z.string().optional(),
  value: z.coerce.number().min(0, "Value must be >= 0"),
  stage: z.string().default("Lead"),
  probability: z.coerce.number().min(0).max(100).default(10),
  assigned_agent: z.string().optional(),
  close_date: z.string().optional(),
  channel: z.string().default("Email"),
});

type FormValues = z.infer<typeof schema>;

interface DealFormProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: DealCreate) => Promise<void>;
  defaultValues?: Partial<Deal>;
  defaultStage?: string;
  title?: string;
  loading?: boolean;
}

export function DealForm({
  open,
  onClose,
  onSubmit,
  defaultValues,
  defaultStage,
  title = "New Deal",
  loading = false,
}: DealFormProps) {
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
      value: 0,
      stage: defaultStage ?? "Lead",
      probability: 10,
      channel: "Email",
    },
  });

  useEffect(() => {
    if (defaultValues) {
      reset({
        title: defaultValues.title ?? "",
        contact_name: defaultValues.contact_name ?? "",
        value: defaultValues.value ?? 0,
        stage: defaultValues.stage ?? defaultStage ?? "Lead",
        probability: defaultValues.probability ?? 10,
        assigned_agent: defaultValues.assigned_agent ?? "",
        close_date: defaultValues.close_date?.slice(0, 10) ?? "",
        channel: defaultValues.channel ?? "Email",
      });
    }
  }, [defaultValues, defaultStage, reset]);

  const handleClose = () => {
    reset();
    onClose();
  };

  const onValid = async (values: FormValues) => {
    await onSubmit({
      ...values,
      contact_id: defaultValues?.contact_id,
    } as DealCreate);
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
              <Label htmlFor="title">Deal Title *</Label>
              <Input id="title" {...register("title")} placeholder="Enterprise Platform License" />
              {errors.title && <p className="text-xs text-destructive">{errors.title.message}</p>}
            </div>

            <div className="col-span-2 space-y-1">
              <Label htmlFor="contact_name">Contact Name</Label>
              <Input id="contact_name" {...register("contact_name")} placeholder="Alexandra Rhodes" />
            </div>

            <div className="space-y-1">
              <Label htmlFor="value">Deal Value ($)</Label>
              <Input id="value" type="number" min={0} step={500} {...register("value")} />
              {errors.value && <p className="text-xs text-destructive">{errors.value.message}</p>}
            </div>

            <div className="space-y-1">
              <Label htmlFor="probability">Probability (%)</Label>
              <Input id="probability" type="number" min={0} max={100} {...register("probability")} />
            </div>

            <div className="space-y-1">
              <Label>Stage</Label>
              <Select value={watch("stage")} onValueChange={(v) => setValue("stage", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {STAGES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label>Channel</Label>
              <Select value={watch("channel")} onValueChange={(v) => setValue("channel", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CHANNELS.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label htmlFor="close_date">Expected Close Date</Label>
              <Input id="close_date" type="date" {...register("close_date")} />
            </div>

            <div className="space-y-1">
              <Label htmlFor="assigned_agent">Assigned Agent</Label>
              <Input id="assigned_agent" {...register("assigned_agent")} placeholder="Sarah Chen" />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose}>Cancel</Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Saving..." : "Save Deal"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
