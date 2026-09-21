"use client";

import { useState } from "react";
import { Target, TrendingUp, TrendingDown, Users, Zap, Plus, Filter } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { segments, contacts } from "@/lib/crm-data";
import { cn } from "@/lib/utils";

const segmentColors = [
  "oklch(0.6 0.22 27)",
  "oklch(0.6 0.22 250)",
  "oklch(0.6 0.18 150)",
  "oklch(0.55 0.01 240)",
  "oklch(0.72 0.18 60)",
  "oklch(0.65 0.18 210)",
];

const lifecycleData = [
  { stage: "New Lead", count: contacts.filter(c => c.lifecycle === "New Lead").length },
  { stage: "Engaged", count: 3 },
  { stage: "Qualified", count: contacts.filter(c => c.lifecycle === "Qualified").length },
  { stage: "Customer", count: contacts.filter(c => c.lifecycle === "Customer").length },
  { stage: "Repeat Buyer", count: contacts.filter(c => c.lifecycle === "Repeat Buyer").length },
  { stage: "VIP", count: contacts.filter(c => c.lifecycle === "VIP").length },
];

const pieData = segments.map((s, i) => ({ name: s.name, value: s.count, color: segmentColors[i] }));

export function SegmentationView() {
  const [activeSegment, setActiveSegment] = useState<string | null>(null);

  return (
    <div className="p-6 space-y-6 overflow-y-auto">
      {/* Header actions */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-muted-foreground">
            {segments.reduce((s, seg) => s + seg.count, 0).toLocaleString()} contacts across {segments.length} segments
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="h-8 gap-1.5 border-border text-muted-foreground text-xs">
            <Filter className="w-3.5 h-3.5" /> Filter
          </Button>
          <Button size="sm" className="h-8 gap-1.5 bg-primary text-primary-foreground text-xs">
            <Plus className="w-3.5 h-3.5" /> New Segment
          </Button>
        </div>
      </div>

      {/* Segment cards grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {segments.map((seg, i) => (
          <Card
            key={seg.id}
            onClick={() => setActiveSegment(activeSegment === seg.id ? null : seg.id)}
            className={cn(
              "bg-card border-border cursor-pointer transition-all duration-150 hover:border-primary/30",
              activeSegment === seg.id && "border-primary/50 bg-primary/5"
            )}
          >
            <CardContent className="p-4">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `${segmentColors[i]}20` }}>
                    <Target className="w-4 h-4" style={{ color: segmentColors[i] }} />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">{seg.name}</p>
                    <p className="text-[10px] text-muted-foreground">{seg.criteria}</p>
                  </div>
                </div>
                <div className={cn("flex items-center gap-0.5 text-xs font-medium", seg.trend > 0 ? "text-green-400" : "text-red-400")}>
                  {seg.trend > 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                  {Math.abs(seg.trend)}%
                </div>
              </div>

              <div className="flex items-end justify-between">
                <div>
                  <p className="text-3xl font-bold text-foreground">{seg.count.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground">contacts</p>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 text-xs text-primary hover:bg-primary/10"
                >
                  <Zap className="w-3 h-3 mr-1" /> Automate
                </Button>
              </div>

              <div className="mt-3 h-1 bg-secondary rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{ width: `${(seg.count / 500) * 100}%`, background: segmentColors[i] }}
                />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Pie chart */}
        <Card className="bg-card border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Segment Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-6">
              <ResponsiveContainer width={160} height={160}>
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={40} outerRadius={70} paddingAngle={2} dataKey="value">
                    {pieData.map((entry, index) => (
                      <Cell key={index} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ background: "oklch(0.16 0.006 240)", border: "1px solid oklch(0.25 0.008 240)", borderRadius: 8, fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex-1 space-y-2">
                {pieData.map((item) => (
                  <div key={item.name} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ background: item.color }} />
                      <span className="text-muted-foreground truncate max-w-28">{item.name}</span>
                    </div>
                    <span className="font-medium text-foreground">{item.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Lifecycle stages */}
        <Card className="bg-card border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Customer Lifecycle Stages</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={lifecycleData}>
                <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.25 0.008 240)" />
                <XAxis dataKey="stage" tick={{ fill: "oklch(0.55 0.01 240)", fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "oklch(0.55 0.01 240)", fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ background: "oklch(0.16 0.006 240)", border: "1px solid oklch(0.25 0.008 240)", borderRadius: 8, fontSize: 12 }} />
                <Bar dataKey="count" fill="oklch(0.6 0.22 250)" radius={[4, 4, 0, 0]} name="Contacts" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Automation rules */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Zap className="w-4 h-4 text-primary" /> Segment Automation Rules
            </CardTitle>
            <Button size="sm" className="h-7 bg-primary text-primary-foreground text-xs gap-1">
              <Plus className="w-3 h-3" /> Add Rule
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {[
              { trigger: "Score crosses 71", segment: "Hot Leads", action: "Instant agent assignment", active: true },
              { trigger: "No activity for 30 days", segment: "Dormant Leads", action: "Start re-engagement campaign", active: true },
              { trigger: "Purchase > $10,000", segment: "High-Value Customers", action: "Assign VIP agent + perks", active: true },
              { trigger: "3+ purchases in 90 days", segment: "Active Buyers", action: "Upsell workflow trigger", active: false },
              { trigger: "Source = Instagram", segment: "Instagram Audience", action: "Tag + social campaign", active: true },
            ].map((rule, i) => (
              <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-secondary/50">
                <div className={cn("w-2 h-2 rounded-full flex-shrink-0", rule.active ? "bg-green-400" : "bg-muted-foreground")} />
                <div className="flex-1 min-w-0 grid grid-cols-3 gap-2 text-xs">
                  <span className="text-muted-foreground">IF: <span className="text-foreground">{rule.trigger}</span></span>
                  <span className="text-muted-foreground">Segment: <span className="text-primary">{rule.segment}</span></span>
                  <span className="text-muted-foreground">THEN: <span className="text-foreground">{rule.action}</span></span>
                </div>
                <Badge className={cn("text-[10px] border-0 flex-shrink-0", rule.active ? "bg-green-400/10 text-green-400" : "bg-secondary text-muted-foreground")}>
                  {rule.active ? "Active" : "Paused"}
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
