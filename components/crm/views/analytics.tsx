"use client";

import {
  AreaChart, Area, BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from "recharts";
import { TrendingUp, DollarSign, Target, ArrowUpRight, ArrowDownRight, Zap } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { revenueData, pipelineData, channelData, contacts, agents } from "@/lib/crm-data";

const conversionTrend = [
  { week: "W1", rate: 24, leads: 80 },
  { week: "W2", rate: 28, leads: 95 },
  { week: "W3", rate: 22, leads: 72 },
  { week: "W4", rate: 31, leads: 110 },
  { week: "W5", rate: 29, leads: 98 },
  { week: "W6", rate: 35, leads: 125 },
  { week: "W7", rate: 33, leads: 118 },
  { week: "W8", rate: 38, leads: 142 },
];

const agentRevenue = agents.map((a) => ({
  name: a.name.split(" ")[0],
  revenue: a.revenue / 1000,
  rate: a.conversionRate,
}));

const funnelData = [
  { name: "Total Leads", value: 1847, fill: "oklch(0.6 0.22 250)" },
  { name: "Contacted", value: 1204, fill: "oklch(0.65 0.18 210)" },
  { name: "Qualified", value: 687, fill: "oklch(0.72 0.18 60)" },
  { name: "Proposal Sent", value: 312, fill: "oklch(0.6 0.18 150)" },
  { name: "Converted", value: 148, fill: "oklch(0.6 0.22 27)" },
];

const attributionData = [
  { source: "Instagram", revenue: 48200, leads: 487, rate: 31 },
  { source: "WhatsApp", revenue: 36800, leads: 342, rate: 28 },
  { source: "Ads", revenue: 29400, leads: 218, rate: 38 },
  { source: "Facebook", revenue: 18600, leads: 189, rate: 22 },
  { source: "Email", revenue: 9200, leads: 98, rate: 19 },
];

export function AnalyticsView() {
  const totalRevenue = 142000;
  const previousRevenue = 120000;
  const revenueGrowth = Math.round(((totalRevenue - previousRevenue) / previousRevenue) * 100);

  return (
    <div className="p-6 space-y-6 overflow-y-auto">
      {/* KPI Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { title: "Monthly Revenue", value: "$142k", change: revenueGrowth, icon: DollarSign, color: "text-primary", bg: "bg-primary/10" },
          { title: "Forecast (Apr)", value: "$165k", change: 16.2, icon: TrendingUp, color: "text-green-400", bg: "bg-green-400/10" },
          { title: "Avg Deal Size", value: "$8,400", change: 12.5, icon: Target, color: "text-yellow-400", bg: "bg-yellow-400/10" },
          { title: "Conversion Rate", value: "31.8%", change: 5.7, icon: Zap, color: "text-orange-400", bg: "bg-orange-400/10" },
        ].map((kpi) => {
          const Icon = kpi.icon;
          return (
            <Card key={kpi.title} className="bg-card border-border">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className={`w-8 h-8 rounded-lg ${kpi.bg} flex items-center justify-center`}>
                    <Icon className={`w-4 h-4 ${kpi.color}`} />
                  </div>
                  <span className={`flex items-center gap-0.5 text-xs font-medium ${kpi.change > 0 ? "text-green-400" : "text-red-400"}`}>
                    {kpi.change > 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                    {Math.abs(kpi.change)}%
                  </span>
                </div>
                <p className="text-2xl font-bold text-foreground">{kpi.value}</p>
                <p className="text-xs text-muted-foreground">{kpi.title}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Revenue & Conversion Trend */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="bg-card border-border">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold">Revenue Trend (6 Months)</CardTitle>
              <Badge className="bg-primary/10 text-primary border-0 text-xs">+{revenueGrowth}% MoM</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={revenueData}>
                <defs>
                  <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="oklch(0.6 0.22 250)" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="oklch(0.6 0.22 250)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.25 0.008 240)" />
                <XAxis dataKey="month" tick={{ fill: "oklch(0.55 0.01 240)", fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "oklch(0.55 0.01 240)", fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${v / 1000}k`} />
                <Tooltip contentStyle={{ background: "oklch(0.16 0.006 240)", border: "1px solid oklch(0.25 0.008 240)", borderRadius: 8, fontSize: 12 }} />
                <Area type="monotone" dataKey="revenue" stroke="oklch(0.6 0.22 250)" strokeWidth={2} fill="url(#rev)" name="Revenue" />
                <Line type="monotone" dataKey="forecast" stroke="oklch(0.6 0.18 150)" strokeWidth={2} strokeDasharray="4 4" dot={false} name="Forecast" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Conversion Rate Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={conversionTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.25 0.008 240)" />
                <XAxis dataKey="week" tick={{ fill: "oklch(0.55 0.01 240)", fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "oklch(0.55 0.01 240)", fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v}%`} />
                <Tooltip contentStyle={{ background: "oklch(0.16 0.006 240)", border: "1px solid oklch(0.25 0.008 240)", borderRadius: 8, fontSize: 12 }} />
                <Line type="monotone" dataKey="rate" stroke="oklch(0.6 0.18 150)" strokeWidth={2.5} dot={{ r: 4, fill: "oklch(0.6 0.18 150)" }} name="Conv. Rate %" />
                <Line type="monotone" dataKey="leads" stroke="oklch(0.72 0.18 60)" strokeWidth={2} strokeDasharray="4 4" dot={false} name="New Leads" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Funnel & Agent Revenue */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Sales Funnel */}
        <Card className="bg-card border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Sales Funnel</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {funnelData.map((item, i) => {
              const pct = Math.round((item.value / funnelData[0].value) * 100);
              return (
                <div key={item.name}>
                  <div className="flex items-center justify-between mb-1 text-xs">
                    <span className="text-muted-foreground">{item.name}</span>
                    <div className="flex items-center gap-3">
                      <span className="text-foreground font-semibold">{item.value.toLocaleString()}</span>
                      <span className="text-muted-foreground w-10 text-right">{pct}%</span>
                    </div>
                  </div>
                  <div className="w-full h-8 bg-secondary/50 rounded overflow-hidden flex items-center">
                    <div
                      className="h-full rounded flex items-center justify-center transition-all duration-700"
                      style={{ width: `${pct}%`, background: item.fill }}
                    />
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>

        {/* Agent Revenue */}
        <Card className="bg-card border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Revenue by Agent</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={agentRevenue}>
                <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.25 0.008 240)" />
                <XAxis dataKey="name" tick={{ fill: "oklch(0.55 0.01 240)", fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "oklch(0.55 0.01 240)", fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${v}k`} />
                <Tooltip contentStyle={{ background: "oklch(0.16 0.006 240)", border: "1px solid oklch(0.25 0.008 240)", borderRadius: 8, fontSize: 12 }} />
                <Bar dataKey="revenue" fill="oklch(0.6 0.22 250)" radius={[4, 4, 0, 0]} name="Revenue ($k)" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Revenue Attribution Table */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold">Revenue Attribution by Channel</CardTitle>
            <Badge className="bg-secondary text-muted-foreground border-0 text-xs">Multi-touch</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                {["Channel", "Revenue", "Leads", "Conv. Rate", "Revenue Share"].map((h) => (
                  <th key={h} className="text-left text-xs font-semibold text-muted-foreground pb-2 pr-4">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {attributionData.map((row) => {
                const totalRev = attributionData.reduce((s, r) => s + r.revenue, 0);
                const share = Math.round((row.revenue / totalRev) * 100);
                return (
                  <tr key={row.source} className="hover:bg-secondary/30 transition-colors">
                    <td className="py-2.5 pr-4 text-xs font-medium text-foreground">{row.source}</td>
                    <td className="py-2.5 pr-4 text-xs text-primary font-semibold">${row.revenue.toLocaleString()}</td>
                    <td className="py-2.5 pr-4 text-xs text-muted-foreground">{row.leads}</td>
                    <td className="py-2.5 pr-4">
                      <span className={`text-xs font-medium ${row.rate >= 30 ? "text-green-400" : row.rate >= 25 ? "text-yellow-400" : "text-muted-foreground"}`}>
                        {row.rate}%
                      </span>
                    </td>
                    <td className="py-2.5 pr-4">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-1.5 bg-secondary rounded-full overflow-hidden">
                          <div className="h-full bg-primary rounded-full" style={{ width: `${share}%` }} />
                        </div>
                        <span className="text-xs text-muted-foreground w-8">{share}%</span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
