'use client'

// Recharts lives HERE and only here: the Reports view lazy-loads this module,
// so the ~640 KB charting chunk never ships with the first paint of the app.
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts'

export type ZoneChartRow = { zone_id: string; zone: string; requests: number; days: number }
export type TypeChartRow = { leave_type_id: string; name: string; value: number; color?: string }
export type StatusChartRow = { status: string; label: string; value: number; color: string }
export type MonthlyChartRow = { month: string; days: number }

const TOOLTIP = { background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, fontSize: 12 }

export function ZoneUsageChart({ rows }: { rows: ZoneChartRow[] }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={rows} layout="vertical" margin={{ left: 8, right: 8 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
        <XAxis type="number" stroke="var(--muted-foreground)" tick={{ fontSize: 11 }} />
        <YAxis type="category" dataKey="zone" width={100} stroke="var(--muted-foreground)" tick={{ fontSize: 12 }} />
        <Tooltip contentStyle={TOOLTIP} />
        <Bar dataKey="days" name="leave days" fill="#0f766e" radius={[0, 6, 6, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}

export function TypeUsageChart({ rows, colors }: { rows: TypeChartRow[]; colors: string[] }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <PieChart>
        <Pie data={rows} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={70} outerRadius={120} paddingAngle={2}>
          {rows.map((t, i) => (
            <Cell key={i} fill={t.color ?? colors[i % colors.length]} />
          ))}
        </Pie>
        <Tooltip contentStyle={TOOLTIP} />
        <Legend wrapperStyle={{ fontSize: 11 }} />
      </PieChart>
    </ResponsiveContainer>
  )
}

export function StatusMixChart({ rows }: { rows: StatusChartRow[] }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={rows} margin={{ top: 12, left: 8, right: 8 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
        <XAxis dataKey="label" stroke="var(--muted-foreground)" tick={{ fontSize: 10 }} interval={0} />
        <YAxis allowDecimals={false} stroke="var(--muted-foreground)" tick={{ fontSize: 11 }} />
        <Tooltip contentStyle={TOOLTIP} />
        <Bar dataKey="value" name="requests" radius={[6, 6, 0, 0]}>
          {rows.map((s, i) => (
            <Cell key={i} fill={s.color} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}

export function MonthlyDaysChart({ rows }: { rows: MonthlyChartRow[] }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={rows} margin={{ top: 12, left: 8, right: 8 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
        <XAxis dataKey="month" stroke="var(--muted-foreground)" tick={{ fontSize: 11 }} />
        <YAxis allowDecimals={false} stroke="var(--muted-foreground)" tick={{ fontSize: 11 }} />
        <Tooltip contentStyle={TOOLTIP} />
        <Bar dataKey="days" name="days off" fill="#059669" radius={[6, 6, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}
