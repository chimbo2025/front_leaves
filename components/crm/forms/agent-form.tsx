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
import type { Agent, AgentCreate } from "@/lib/api";

const STATUSES = ["Online", "Away", "Offline"];

const schema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email"),
  status: z.string().default("Online"),
  leads_assigned: z.coerce.number().min(0).default(0),
  response_time: z.coerce.number().min(0).default(0),
  conversion_rate: z.coerce.number().min(0).max(100).default(0),
  revenue: z.coerce.number().min(0).default(0),
  follow_up_rate: z.coerce.number().min(0).max(100).default(0),
});

type FormValues = z.infer<typeof schema>;

interface AgentFormProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: AgentCreate) => Promise<void>;
  defaultValues?: Partial<Agent>;
  title?: string;
  loading?: boolean;
}

export function AgentForm({
  open,
  onClose,
  onSubmit,
  defaultValues,
  title = "New Agent",
  loading = false,
}: AgentFormProps) {
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
      name: "",
      email: "",
      status: "Online",
      leads_assigned: 0,
      response_time: 0,
      conversion_rate: 0,
      revenue: 0,
      follow_up_rate: 0,
    },
  });

  useEffect(() => {
    if (defaultValues) {
      reset({
        name: defaultValues.name ?? "",
        email: defaultValues.email ?? "",
        status: defaultValues.status ?? "Online",
        leads_assigned: defaultValues.leads_assigned ?? 0,
        response_time: defaultValues.response_time ?? 0,
        conversion_rate: defaultValues.conversion_rate ?? 0,
        revenue: defaultValues.revenue ?? 0,
        follow_up_rate: defaultValues.follow_up_rate ?? 0,
      });
    }
  }, [defaultValues, reset]);

  const handleClose = () => {
    reset();
    onClose();
  };

  const onValid = async (values: FormValues) => {
    await onSubmit({ ...values, badges: defaultValues?.badges ?? [] } as AgentCreate);
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
              <Label htmlFor="name">Full Name *</Label>
              <Input id="name" {...register("name")} placeholder="Sarah Chen" />
              {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
            </div>

            <div className="space-y-1">
              <Label htmlFor="email">Email *</Label>
              <Input id="email" type="email" {...register("email")} placeholder="agent@crm.io" />
              {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
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
              <Label htmlFor="leads_assigned">Leads Assigned</Label>
              <Input id="leads_assigned" type="number" min={0} {...register("leads_assigned")} />
            </div>

            <div className="space-y-1">
              <Label htmlFor="response_time">Avg Response Time (hrs)</Label>
              <Input id="response_time" type="number" min={0} step={0.1} {...register("response_time")} />
            </div>

            <div className="space-y-1">
              <Label htmlFor="conversion_rate">Conversion Rate (%)</Label>
              <Input id="conversion_rate" type="number" min={0} max={100} step={0.1} {...register("conversion_rate")} />
            </div>

            <div className="space-y-1">
              <Label htmlFor="follow_up_rate">Follow-up Rate (%)</Label>
              <Input id="follow_up_rate" type="number" min={0} max={100} step={0.1} {...register("follow_up_rate")} />
            </div>

            <div className="space-y-1">
              <Label htmlFor="revenue">Revenue Generated ($)</Label>
              <Input id="revenue" type="number" min={0} step={1000} {...register("revenue")} />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose}>Cancel</Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Saving..." : "Save Agent"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
