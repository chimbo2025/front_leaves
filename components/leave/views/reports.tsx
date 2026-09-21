'use client'

import { useState } from 'react'
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
import {
  TrendingUp,
  Users,
  CalendarCheck,
  Timer,
  Printer,
  Hash,
  Route,
  Download,
  Hourglass,
  Lock,
  CalendarRange,
  BarChart3,
  PieChart as PieChartIcon,
  ListChecks,
  FileText,
  Gauge,
  RotateCcw,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  ZONES,
  EMPLOYEES,
  fmtShort,
  getEmployee,
  addDays,
  TODAY,
  type LeaveRequest,
} from '@/lib/leave'
import { useLeave } from '@/components/leave/leave-context'
import { SectionHeading, Panel, StatCard, Btn, Avatar, Tabs } from '@/components/leave/shared'

const STATUS_COLORS: Record<string, string> = {
  draft: '#64748b',
  submitted: '#0284c7',
  under_review: '#7c3aed',
  approved: '#10b981',
  returned: '#d97706',
  rejected: '#e11d48',
  completed: '#0f766e',
}

const STATUS_LABELS: Record<string, string> = {
  draft: 'Draft',
  submitted: 'Submitted',
  under_review: 'Under review',
  approved: 'Approved',
  returned: 'Returned',
  rejected: 'Rejected',
  completed: 'Completed',
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

export function ReportsView() {
  const { requests, supervisorMode, leaveTypes, can } = useLeave()
  const [tab, setTab] = useState('zone')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')

  const canGender = can('reports', 'view_gender_reports')

  const base: LeaveRequest[] = supervisorMode ? requests : requests
  const visible = base.filter((r) => {
    if (from && r.endDate < from) return false
    if (to && r.startDate > to) return false
    return true
  })

  const byZone = ZONES.map((z) => {
    const items = visible.filter((r) => getEmployee(r.employeeId).zoneId === z.id)
    return { zone: z.short, days: items.reduce((s, r) => s + r.days, 0), requests: items.length }
  }).filter((x) => x.requests > 0)

  const byType = leaveTypes.map((lt) => {
    const items = visible.filter((r) => r.leaveTypeId === lt.id && (r.status === 'approved' || r.status === 'under_review'))
    return { name: lt.short, value: items.reduce((s, r) => s + r.days, 0), color: lt.color }
  }).filter((x) => x.value > 0)

  const byGender = visible.filter((r) => r.status === 'approved').reduce<Record<string, number>>(
    (acc, r) => {
      const g = getEmployee(r.employeeId).gender
      acc[g] = (acc[g] || 0) + r.days
      return acc
    },
    {},
  )

  const pending = visible.filter((r) => r.status === 'submitted' || r.status === 'under_review')
  const approvedDays = visible.filter((r) => r.status === 'approved').reduce((s, r) => s + r.days, 0)

  const statusMix = Object.entries(STATUS_LABELS).map(([status, label]) => ({
    status,
    label,
    value: visible.filter((r) => r.status === status).length,
    color: STATUS_COLORS[status],
  })).filter((x) => x.value > 0)

  const monthly = (() => {
    const acc: Record<string, number> = {}
    visible.filter((r) => r.status === 'approved').forEach((r) => {
      const key = r.startDate.slice(0, 7)
      acc[key] = (acc[key] || 0) + r.days
    })
    return Object.entries(acc).sort((a, b) => a[0].localeCompare(b[0])).map(([k, days]) => ({
      month: MONTHS[Number(k.slice(5)) - 1],
      days,
    }))
  })()

  const future60 = (() => {
    const horizon = addDays(TODAY, 60)
    const approved = visible.filter((r) => r.status === 'approved' && r.endDate >= TODAY && r.startDate <= horizon)
    const perZone = ZONES.map((z) => {
      const staffInZone = EMPLOYEES.filter((e) => e.zoneId === z.id)
      const out = approved.filter((r) => getEmployee(r.employeeId).zoneId === z.id)
      const maxDay = (() => {
        let max = 0
        for (let i = 0; i <= 60; i++) {
          const day = addDays(TODAY, i)
          const count = out.filter((r) => r.startDate <= day && r.endDate >= day).length
          if (count > max) max = count
        }
        return max
      })()
      const daysAhead = out.reduce((s, r) => s + r.days, 0)
      return {
        zone: z.short,
        staff: staffInZone.length,
        daysAhead,
        maxOut: maxDay,
        coverage: staffInZone.length === 0 ? 100 : Math.round(((staffInZone.length - maxDay) / staffInZone.length) * 100),
      }
    })
    return perZone
  })()

  const bottleneck = (() => {
    const map = new Map<string, { assigneeId: string; count: number; overdue: number }>()
    for (const r of visible) {
      if (r.status !== 'submitted' && r.status !== 'under_review' && r.status !== 'returned_for_correction') continue
      for (const s of r.steps) {
        if (s.status !== 'pending') continue
        const cur = map.get(s.assigneeId) ?? { assigneeId: s.assigneeId, count: 0, overdue: 0 }
        cur.count++
        if (s.dueAt < TODAY) cur.overdue++
        map.set(s.assigneeId, cur)
      }
    }
    return [...map.values()].sort((a, b) => b.count - a.count || b.overdue - a.overdue)
  })()

  const COLORS = ['#0f766e', '#10b981', '#f59e0b', '#e11d48', '#0284c7', '#7c3aed', '#64748b']

  const exportCSV = () => {
    const lines: string[] = [
      'DPP Zanzibar Leave System — usage report',
      `Generated,${fmtShort(TODAY)}${from || to ? ` (filtered ${from || '…'} → ${to || '…'})` : ''}`,
      '',
      'Leave usage by zone',
      'Zone,Requests,Leave days',
      ...byZone.map((z) => `${z.zone},${z.requests},${z.days}`),
      '',
      'Leave types used (approved + in review)',
      'Type,Days',
      ...byType.map((t) => `${t.name},${t.value}`),
      '',
      'Request status mix',
      'Status,Count',
      ...statusMix.map((s) => `${s.label},${s.value}`),
      '',
      'Approved days per month',
      'Month,Days',
      ...monthly.map((m) => `${m.month},${m.days}`),
      '',
      `Staffing forecast — next 60 days`,
      'Zone,Staff in office,Days planned ahead,Max staff out,Coverage %',
      ...future60.map((z) => `${z.zone},${z.staff},${z.daysAhead},${z.maxOut} of ${z.staff},${z.coverage}`),
      '',
      'Approval bottleneck',
      'Approver,Pending actions,Overdue',
      ...bottleneck.map((b) => `${getEmployee(b.assigneeId).name},${b.count},${b.overdue}`),
      '',
      'Snapshot',
      `Staff on file,${EMPLOYEES.length} (${ZONES.length} zones)`,
      `Leave requests logged,${visible.length} requests, ${approvedDays} approved days`,
      `Requests in workflow,${pending.length} awaiting a decision`,
      ...(canGender ? [`Gender split of approved days,${byGender.F ?? 0} female / ${byGender.M ?? 0} male`] : []),
    ]
    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `dpp-zanzibar-leave-report-${TODAY}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      <SectionHeading
        title="Reports"
        subtitle={supervisorMode ? 'Office-wide usage, availability and staffing analysis — printable' : 'Usage and availability analytics — printable'}
        actions={
          <div className="flex items-center gap-2">
            <Btn variant="outline" onClick={exportCSV}>
              <Download className="w-4 h-4" /> Export CSV
            </Btn>
            <Btn variant="outline" onClick={() => window.print()}>
              <Printer className="w-4 h-4" /> Print / export PDF
            </Btn>
          </div>
        }
      />

      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-4">
        <StatCard icon={CalendarCheck} label="Approved days" value={approvedDays} hint="your date filter" tone="teal" />
        <StatCard icon={Timer} label="Pending" value={pending.length} hint="awaiting decision" tone="amber" />
        <StatCard icon={Users} label="Staff" value={EMPLOYEES.length} hint={`across ${ZONES.length} zones`} tone="emerald" />
        {canGender ? (
          <StatCard icon={TrendingUp} label="Gender split" value={`${byGender.F ?? 0} / ${byGender.M ?? 0}`} hint="approved days F / M" tone="violet" />
        ) : (
          <StatCard icon={Lock} label="Gender split" value="—" hint="restricted personnel data" tone="violet" />
        )}
        <StatCard icon={Hash} label="Requests logged" value={visible.length} hint="in filtered range" tone="sky" />
      </div>

      <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-border bg-card px-4 py-3">
        <span className="flex items-center gap-2 text-[12px] font-semibold text-foreground">
          <CalendarRange className="w-4 h-4 text-teal-700" /> Report range
        </span>
        <label className="flex items-center gap-2 text-[11px] font-semibold text-muted-foreground">
          From
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="h-8 rounded-lg border border-input bg-card px-2 text-[12px] text-foreground focus:outline-none focus:ring-2 focus:ring-ring/40"
          />
        </label>
        <label className="flex items-center gap-2 text-[11px] font-semibold text-muted-foreground">
          To
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="h-8 rounded-lg border border-input bg-card px-2 text-[12px] text-foreground focus:outline-none focus:ring-2 focus:ring-ring/40"
          />
        </label>
        {(from || to) && (
          <Btn variant="ghost" onClick={() => { setFrom(''); setTo('') }}>
            <RotateCcw className="w-3.5 h-3.5" /> Reset range
          </Btn>
        )}
        <span className="text-[11px] text-muted-foreground ml-auto">
          Every tab uses this range · Print/PDF exports the active tab only.
          {from || to ? ` Showing ${from || 'start'} → ${to || 'today'}.` : ' Showing the full leave year.'}
        </span>
      </div>

      <Tabs
        tabs={[
          { value: 'zone', label: 'Leave usage by zone', icon: BarChart3 },
          { value: 'types', label: 'Leave types used', icon: PieChartIcon },
          { value: 'status', label: 'Request status mix', icon: ListChecks },
          { value: 'monthly', label: 'Approved days per month', icon: CalendarRange },
          { value: 'forecast', label: 'Staffing forecast — next 60 days', icon: TrendingUp },
          { value: 'bottleneck', label: 'Approval bottleneck', icon: Gauge },
          { value: 'snapshot', label: 'Snapshot report', icon: FileText },
        ]}
        value={tab}
        onChange={setTab}
      />

      {tab === 'zone' && (
        <Panel title="Leave usage by zone" subtitle="Total approved & in-review days per regional office">
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={byZone} layout="vertical" margin={{ left: 8, right: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis type="number" stroke="var(--muted-foreground)" tick={{ fontSize: 11 }} />
                <YAxis type="category" dataKey="zone" width={100} stroke="var(--muted-foreground)" tick={{ fontSize: 12 }} />
                <Tooltip contentStyle={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, fontSize: 12 }} />
                <Bar dataKey="days" name="leave days" fill="#0f766e" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Panel>
      )}

      {tab === 'types' && (
        <Panel title="Leave types used" subtitle="Distribution of approved & in-review days by leave type">
          <div className="h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={byType} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={70} outerRadius={120} paddingAngle={2}>
                  {byType.map((t, i) => (
                    <Cell key={i} fill={t.color ?? COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, fontSize: 12 }} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Panel>
      )}

      {tab === 'status' && (
        <Panel title="Request status mix" subtitle="Workflow state across all logged requests in the range">
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={statusMix} margin={{ top: 12, left: 8, right: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="label" stroke="var(--muted-foreground)" tick={{ fontSize: 10 }} interval={0} />
                <YAxis allowDecimals={false} stroke="var(--muted-foreground)" tick={{ fontSize: 11 }} />
                <Tooltip contentStyle={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, fontSize: 12 }} />
                <Bar dataKey="value" name="requests" radius={[6, 6, 0, 0]}>
                  {statusMix.map((s, i) => (
                    <Cell key={i} fill={s.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Panel>
      )}

      {tab === 'monthly' && (
        <Panel title="Approved days per month" subtitle="Monthly load from the filtered range">
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthly} margin={{ top: 12, left: 8, right: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="month" stroke="var(--muted-foreground)" tick={{ fontSize: 11 }} />
                <YAxis allowDecimals={false} stroke="var(--muted-foreground)" tick={{ fontSize: 11 }} />
                <Tooltip contentStyle={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, fontSize: 12 }} />
                <Bar dataKey="days" name="days off" fill="#059669" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Panel>
      )}

      {tab === 'forecast' && (
        <Panel title="Staffing forecast — next 60 days" subtitle="Timeline of planned absences and the worst-case staff-out day per office">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="text-[11px] uppercase tracking-wider text-muted-foreground">
                  <th className="py-3 px-5 font-semibold">Zone</th>
                  <th className="py-3 px-3 font-semibold hidden sm:table-cell">Staff in office</th>
                  <th className="py-3 px-3 font-semibold">Days planned ahead</th>
                  <th className="py-3 px-3 font-semibold hidden md:table-cell">Max staff out on one day</th>
                  <th className="py-3 px-3 font-semibold">Coverage</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {future60.map((z) => (
                  <tr key={z.zone} className="text-[13px]">
                    <td className="py-3 px-5 font-semibold text-foreground whitespace-nowrap">{z.zone}</td>
                    <td className="py-3 px-3 text-muted-foreground hidden sm:table-cell tabular-nums">{z.staff}</td>
                    <td className="py-3 px-3 tabular-nums font-medium">{z.daysAhead}</td>
                    <td className="py-3 px-3 text-muted-foreground hidden md:table-cell tabular-nums">{z.maxOut} of {z.staff}</td>
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 w-24 rounded-full bg-border overflow-hidden">
                          <div
                            className={z.coverage >= 85 ? 'bg-emerald-500' : z.coverage >= 70 ? 'bg-amber-500' : 'bg-rose-500'}
                            style={{ width: `${Math.max(z.coverage, 4)}%`, height: '100%' }}
                          />
                        </div>
                        <span className={cn('text-[11px] font-semibold', z.coverage >= 85 ? 'text-emerald-600 dark:text-emerald-400' : z.coverage >= 70 ? 'text-amber-600 dark:text-amber-400' : 'text-rose-600 dark:text-rose-400')}>
                          {z.coverage}%
                        </span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-[11px] text-muted-foreground mt-3">Coverage = staff not on approved leave on the office&apos;s busiest day of the forecast window. Generated {fmtShort(TODAY)}.</p>
        </Panel>
      )}

      {tab === 'bottleneck' && (
        <Panel title="Approval bottleneck" subtitle="Pending steps per approver — overdue actions hold chains hostage">
          {bottleneck.length === 0 ? (
            <p className="text-[12px] text-muted-foreground">No pending approvals anywhere — the pipeline is clear.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="text-[11px] uppercase tracking-wider text-muted-foreground">
                    <th className="py-3 px-5 font-semibold">Approver</th>
                    <th className="py-3 px-3 font-semibold">Pending actions</th>
                    <th className="py-3 px-3 font-semibold">Overdue</th>
                    <th className="py-3 px-3 font-semibold hidden sm:table-cell">Load</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {bottleneck.map((b) => (
                    <tr key={b.assigneeId} className="text-[13px]">
                      <td className="py-3 px-5">
                        <div className="flex items-center gap-2">
                          <Avatar id={b.assigneeId} size="sm" />
                          <span className="font-semibold text-foreground whitespace-nowrap">{getEmployee(b.assigneeId).name}</span>
                        </div>
                      </td>
                      <td className="py-3 px-3 tabular-nums font-medium">{b.count}</td>
                      <td className="py-3 px-3">
                        {b.overdue > 0 ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950 dark:text-rose-300 dark:border-rose-900 px-2 py-0.5 text-[10px] font-bold">
                            <Hourglass className="w-2.5 h-2.5" /> {b.overdue} overdue
                          </span>
                        ) : (
                          <span className="text-[11px] text-muted-foreground">within SLA</span>
                        )}
                      </td>
                      <td className="py-3 px-3 hidden sm:table-cell">
                        <div className="h-1.5 w-24 rounded-full bg-border overflow-hidden">
                          <div
                            className={b.overdue > 0 ? 'bg-rose-500' : b.count >= 3 ? 'bg-amber-500' : 'bg-emerald-500'}
                            style={{ width: `${Math.min(100, b.count * 18)}%`, height: '100%' }}
                          />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Panel>
      )}

      {tab === 'snapshot' && (
        <Panel title="Snapshot report" subtitle="Printable summary for the record — use the print button above">
          <div className="space-y-1.5">
            <ReportRow label="Report generated" value={`${fmtShort(TODAY)} — DPP Zanzibar Leave System${from || to ? ` (range ${from || '…'} → ${to || 'today'})` : ''}`} />
            <ReportRow label="Staff on file" value={`${EMPLOYEES.length} (${ZONES.length} zones)`} />
            <ReportRow label="Leave requests logged" value={`${visible.length} requests, ${approvedDays} approved days`} />
            <ReportRow label="Requests in workflow" value={`${pending.length} awaiting a decision`} />
            {canGender && <ReportRow label="Gender split of approved days" value={`${byGender.F ?? 0} female / ${byGender.M ?? 0} male`} />}
            <div className="flex flex-wrap gap-2 pt-1">
              {visible.slice(0, 6).map((r) => (
                <span key={r.id} className="inline-flex items-center gap-1.5 rounded-full border border-border bg-secondary px-2.5 py-1 text-[11px] text-muted-foreground">
                  <Avatar id={r.employeeId} size="sm" /> {getEmployee(r.employeeId).name.split(' ')[0]} • {fmtShort(r.startDate)} ({r.days}d)
                </span>
              ))}
              {visible.length > 6 && (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-secondary px-2.5 py-1 text-[11px] text-muted-foreground">
                  <Route className="w-3 h-3" /> +{visible.length - 6} more
                </span>
              )}
            </div>
          </div>
        </Panel>
      )}
    </div>
  )
}

function ReportRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 py-1.5 border-b border-border last:border-0">
      <span className="text-[12px] text-muted-foreground">{label}</span>
      <span className="text-[13px] font-semibold text-foreground">{value}</span>
    </div>
  )
}