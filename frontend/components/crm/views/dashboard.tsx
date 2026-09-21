"use client";

import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from "recharts";
import { TrendingUp, Users, DollarSign, MessageSquare, Zap, Target, ArrowUpRight, ArrowDownRight, Clock, Star } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { revenueData, pipelineData, channelData, contacts, deals, notifications, agents } from "@/lib/crm-data";
import { getScoreColor } from "@/lib/crm-data";

const kpis = [
  { title: "Total Revenue", value: "$1.24M", change: 18.4, icon: DollarSign, color: "text-primary", bg: "bg-primary/10" },
  { title: "Active Leads", value: "1,847", change: 12.1, icon: Users, color: "text-green-400", bg: "bg-green-400/10" },
  { title: "Conversations", value: "342", change: -3.2, icon: MessageSquare, color: "text-yellow-400", bg: "bg-yellow-400/10" },
  { title: "Conversion Rate", value: "31.8%", change: 5.7, icon: Target, color: "text-orange-400", bg: "bg-orange-400/10" },
  { title: "Deals in Pipeline", value: "$2.86M", change: 22.3, icon: TrendingUp, color: "text-blue-400", bg: "bg-blue-400/10" },
  { title: "Avg Response Time", value: "6.2 min", change: -18.5, icon: Clock, color: "text-purple-400", bg: "bg-purple-400/10" },
];

export function DashboardView() {
  const hotLeads = contacts.filter((c) => c.score >= 71).length;
  const warmLeads = contacts.filter((c) => c.score >= 31 && c.score < 71).length;
  const coldLeads = contacts.filter((c) => c.score < 31).length;

  return (
    <div className="p-6 space-y-6">
      {/* KPI Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3">
        {kpis.map((kpi) => {
          const Icon = kpi.icon;
          const positive = kpi.change > 0;
          return (
            <Card key={kpi.title} className="bg-card border-border">
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className={`w-8 h-8 rounded-lg ${kpi.bg} flex items-center justify-center`}>
                    <Icon className={`w-4 h-4 ${kpi.color}`} />
                  </div>
                  <span className={`flex items-center gap-0.5 text-xs font-medium ${positive ? "text-green-400" : "text-red-400"}`}>
                    {positive ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                    {Math.abs(kpi.change)}%
                  </span>
                </div>
                <p className="text-2xl font-bold text-foreground">{kpi.value}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{kpi.title}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Charts row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Revenue Trend */}
        <Card className="lg:col-span-2 bg-card border-border">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold">Revenue vs Forecast</CardTitle>
              <Badge className="bg-primary/10 text-primary border-0 text-xs">+18.4% MoM</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={revenueData}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="oklch(0.6 0.22 250)" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="oklch(0.6 0.22 250)" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorForecast" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="oklch(0.6 0.18 150)" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="oklch(0.6 0.18 150)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.25 0.008 240)" />
                <XAxis dataKey="month" tick={{ fill: "oklch(0.55 0.01 240)", fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "oklch(0.55 0.01 240)", fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${v / 1000}k`} />
                <Tooltip contentStyle={{ background: "oklch(0.16 0.006 240)", border: "1px solid oklch(0.25 0.008 240)", borderRadius: 8, fontSize: 12 }} labelStyle={{ color: "oklch(0.94 0.005 240)" }} />
                <Area type="monotone" dataKey="revenue" stroke="oklch(0.6 0.22 250)" strokeWidth={2} fill="url(#colorRevenue)" name="Revenue" />
                <Area type="monotone" dataKey="forecast" stroke="oklch(0.6 0.18 150)" strokeWidth={2} strokeDasharray="4 4" fill="url(#colorForecast)" name="Forecast" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Channel Mix */}
        <Card className="bg-card border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Lead Sources</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={140}>
              <PieChart>
                <Pie data={channelData} cx="50%" cy="50%" innerRadius={40} outerRadius={65} paddingAngle={3} dataKey="value">
                  {channelData.map((entry, index) => (
                    <Cell key={index} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ background: "oklch(0.16 0.006 240)", border: "1px solid oklch(0.25 0.008 240)", borderRadius: 8, fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
            <div className="space-y-1.5 mt-2">
              {channelData.map((ch) => (
                <div key={ch.name} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ background: ch.color }} />
                    <span className="text-muted-foreground">{ch.name}</span>
                  </div>
                  <span className="font-medium text-foreground">{ch.value}%</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Pipeline Funnel */}
        <Card className="lg:col-span-2 bg-card border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Pipeline Funnel</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={pipelineData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.25 0.008 240)" horizontal={false} />
                <XAxis type="number" tick={{ fill: "oklch(0.55 0.01 240)", fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${v / 1000}k`} />
                <YAxis type="category" dataKey="stage" tick={{ fill: "oklch(0.55 0.01 240)", fontSize: 11 }} axisLine={false} tickLine={false} width={75} />
                <Tooltip contentStyle={{ background: "oklch(0.16 0.006 240)", border: "1px solid oklch(0.25 0.008 240)", borderRadius: 8, fontSize: 12 }} />
                <Bar dataKey="value" fill="oklch(0.6 0.22 250)" radius={[0, 4, 4, 0]} name="Pipeline Value" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Lead Score Distribution */}
        <Card className="bg-card border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Lead Temperature</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {[
              { label: "Hot Leads", count: hotLeads, total: contacts.length, color: "bg-orange-400", textColor: "text-orange-400" },
              { label: "Warm Leads", count: warmLeads, total: contacts.length, color: "bg-yellow-400", textColor: "text-yellow-400" },
              { label: "Cold Leads", count: coldLeads, total: contacts.length, color: "bg-blue-400", textColor: "text-blue-400" },
            ].map((item) => (
              <div key={item.label}>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs text-muted-foreground">{item.label}</span>
                  <span className={`text-xs font-semibold ${item.textColor}`}>{item.count}</span>
                </div>
                <div className="w-full h-2 bg-secondary rounded-full overflow-hidden">
                  <div
                    className={`h-full ${item.color} rounded-full transition-all duration-700`}
                    style={{ width: `${(item.count / contacts.length) * 100}%` }}
                  />
                </div>
              </div>
            ))}

            {/* AI Insight */}
            <div className="mt-4 p-3 rounded-lg bg-primary/10 border border-primary/20">
              <div className="flex items-start gap-2">
                <Zap className="w-3.5 h-3.5 text-primary mt-0.5 flex-shrink-0" />
                <p className="text-xs text-foreground/80 leading-relaxed">
                  <span className="font-semibold text-primary">AI Insight:</span> Emily Chen (score 95) is 87% likely to convert. Recommend sending discount offer now.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Row 3 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Recent Hot Leads */}
        <Card className="bg-card border-border">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold">Hot Leads</CardTitle>
              <Badge className="bg-orange-400/10 text-orange-400 border-0 text-xs">
                {hotLeads} Active
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {contacts.filter((c) => c.score >= 71).slice(0, 4).map((contact) => (
              <div key={contact.id} className="flex items-center justify-between p-2 rounded-lg bg-secondary/50 hover:bg-secondary transition-colors cursor-pointer">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary">
                    {contact.name.charAt(0)}
                  </div>
                  <div>
                    <p className="text-xs font-medium text-foreground">{contact.name}</p>
                    <p className="text-[10px] text-muted-foreground">{contact.company} · {contact.source}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${getScoreColor(contact.score)}`}>
                    {contact.score}
                  </span>
                  <span className="text-[10px] text-muted-foreground">{contact.lastContact}</span>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Notifications */}
        <Card className="bg-card border-border">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold">Live Alerts</CardTitle>
              <Badge className="bg-red-500/10 text-red-400 border-0 text-xs">
                {notifications.filter((n) => !n.read).length} New
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {notifications.map((notif) => (
              <div key={notif.id} className={`flex items-start gap-3 p-2 rounded-lg transition-colors ${!notif.read ? "bg-primary/5 border border-primary/10" : "bg-secondary/30"}`}>
                <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${notif.type === "hot_lead" ? "bg-orange-400" : notif.type === "sla_breach" ? "bg-red-400" : notif.type === "deal_won" ? "bg-green-400" : "bg-blue-400"}`} />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-foreground">{notif.title}</p>
                  <p className="text-[10px] text-muted-foreground truncate">{notif.description}</p>
                </div>
                <span className="text-[10px] text-muted-foreground flex-shrink-0">{notif.timestamp}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Top Agents Strip */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold">Agent Leaderboard</CardTitle>
            <Badge className="bg-yellow-400/10 text-yellow-400 border-0 text-xs flex items-center gap-1">
              <Star className="w-3 h-3" /> Live Rankings
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
            {agents.map((agent) => (
              <div key={agent.id} className="flex flex-col items-center p-3 rounded-lg bg-secondary/50 hover:bg-secondary transition-colors">
                <div className="relative mb-2">
                  <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-sm font-bold text-primary">
                    {agent.name.split(" ").map((n) => n[0]).join("")}
                  </div>
                  <span className={`absolute -top-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${agent.rank === 1 ? "bg-yellow-400 text-yellow-900" : agent.rank === 2 ? "bg-slate-400 text-slate-900" : "bg-amber-600 text-amber-100"}`}>
                    {agent.rank}
                  </span>
                </div>
                <p className="text-xs font-medium text-foreground text-center">{agent.name.split(" ")[0]}</p>
                <p className="text-sm font-bold text-primary mt-1">{agent.conversionRate}%</p>
                <p className="text-[10px] text-muted-foreground">conversion</p>
                <div className={`w-2 h-2 rounded-full mt-2 ${agent.status === "online" ? "bg-green-400" : agent.status === "busy" ? "bg-yellow-400" : "bg-muted-foreground"}`} />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
