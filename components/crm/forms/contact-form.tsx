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
import type { Contact, ContactCreate } from "@/lib/api";

const schema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email"),
  phone: z.string().optional(),
  company: z.string().optional(),
  source: z.string().default("Manual"),
  score: z.coerce.number().min(0).max(100).default(50),
  stage: z.string().default("New Lead"),
  lifecycle: z.string().default("Lead"),
  assigned_agent: z.string().optional(),
  revenue: z.coerce.number().min(0).default(0),
  location: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

const SOURCES = ["Manual", "LinkedIn", "Website", "Referral", "Cold Email", "Event", "Social Media", "Webinar"];
const STAGES = ["New Lead", "Qualified", "Proposal", "Negotiation", "Closed Won", "Closed Lost"];
const LIFECYCLES = ["Lead", "MQL", "SQL", "Opportunity", "Customer", "Churned"];

interface ContactFormProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: ContactCreate) => Promise<void>;
  defaultValues?: Partial<Contact>;
  title?: string;
  loading?: boolean;
}

export function ContactForm({
  open,
  onClose,
  onSubmit,
  defaultValues,
  title = "New Contact",
  loading = false,
}: ContactFormProps) {
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
      source: "Manual",
      score: 50,
      stage: "New Lead",
      lifecycle: "Lead",
      revenue: 0,
    },
  });

  useEffect(() => {
    if (defaultValues) {
      reset({
        name: defaultValues.name ?? "",
        email: defaultValues.email ?? "",
        phone: defaultValues.phone ?? "",
        company: defaultValues.company ?? "",
        source: defaultValues.source ?? "Manual",
        score: defaultValues.score ?? 50,
        stage: defaultValues.stage ?? "New Lead",
        lifecycle: defaultValues.lifecycle ?? "Lead",
        assigned_agent: defaultValues.assigned_agent ?? "",
        revenue: defaultValues.revenue ?? 0,
        location: defaultValues.location ?? "",
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
      tags: (defaultValues?.tags ?? []),
      last_contact: new Date().toISOString(),
    } as ContactCreate);
    reset();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onValid)} className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2 space-y-1">
              <Label htmlFor="name">Full Name *</Label>
              <Input id="name" {...register("name")} placeholder="Alexandra Rhodes" />
              {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
            </div>

            <div className="space-y-1">
              <Label htmlFor="email">Email *</Label>
              <Input id="email" type="email" {...register("email")} placeholder="alex@company.com" />
              {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
            </div>

            <div className="space-y-1">
              <Label htmlFor="phone">Phone</Label>
              <Input id="phone" {...register("phone")} placeholder="+1-555-0101" />
            </div>

            <div className="space-y-1">
              <Label htmlFor="company">Company</Label>
              <Input id="company" {...register("company")} placeholder="Acme Corp" />
            </div>

            <div className="space-y-1">
              <Label htmlFor="location">Location</Label>
              <Input id="location" {...register("location")} placeholder="New York, NY" />
            </div>

            <div className="space-y-1">
              <Label>Source</Label>
              <Select value={watch("source")} onValueChange={(v) => setValue("source", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {SOURCES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
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
              <Label>Lifecycle</Label>
              <Select value={watch("lifecycle")} onValueChange={(v) => setValue("lifecycle", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {LIFECYCLES.map((l) => <SelectItem key={l} value={l}>{l}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label htmlFor="score">Lead Score (0–100)</Label>
              <Input id="score" type="number" min={0} max={100} {...register("score")} />
              {errors.score && <p className="text-xs text-destructive">{errors.score.message}</p>}
            </div>

            <div className="space-y-1">
              <Label htmlFor="revenue">Revenue ($)</Label>
              <Input id="revenue" type="number" min={0} step={100} {...register("revenue")} />
            </div>

            <div className="col-span-2 space-y-1">
              <Label htmlFor="assigned_agent">Assigned Agent</Label>
              <Input id="assigned_agent" {...register("assigned_agent")} placeholder="Sarah Chen" />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose}>Cancel</Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Saving..." : "Save Contact"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
