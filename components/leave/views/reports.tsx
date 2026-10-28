'use client'

import { useEffect, useState } from 'react'
import dynamic from 'next/dynamic'
import {
  TrendingUp,
  Users,
  CalendarCheck,
  Timer,
  Printer,
  Hash,
  Download,
  Hourglass,
  Lock,
  CalendarRange,
  BarChart3,
  Gauge,
  RotateCcw,
  Wallet,
  Search,
  ChevronLeft,
  ChevronRight,
  X,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  fmtShort,
  getEmployee,
  addDays,
  TODAY,
  type LeaveRequest,
} from '@/lib/leave'
import { useLeave } from '@/components/leave/leave-context'
import { SectionHeading, Panel, StatCard, Btn, Avatar, Tabs, Modal, Pagination, usePaged } from '@/components/leave/shared'
import {
  leaveApi,
  ApiError,
  type ReportFilters,
  type ReportSummary,
  type PaymentSummary,
  type ReportPage,
  type ReportPageMeta,
  type DetailRequestRow,
  type DetailStaffRow,
  type PaymentCaseRow,
  type PaymentPairRow,
} from '@/lib/leave-api'
import { RequestDetail } from '@/components/leave/request-detail'

// Charts (and the recharts library with them) load only when the Reports view
// is opened — see reports-charts.tsx.
const ZoneUsageChart = dynamic(() => import('./reports-charts').then((m) => ({ default: m.ZoneUsageChart })), { ssr: false })
const TypeUsageChart = dynamic(() => import('./reports-charts').then((m) => ({ default: m.TypeUsageChart })), { ssr: false })
const StatusMixChart = dynamic(() => import('./reports-charts').then((m) => ({ default: m.StatusMixChart })), { ssr: false })
const MonthlyDaysChart = dynamic(() => import('./reports-charts').then((m) => ({ default: m.MonthlyDaysChart })), { ssr: false })

const STATUS_COLORS: Record<string, string> = {
  draft: '#64748b',
  submitted: '#0284c7',
  under_review: '#7c3aed',
  approved: '#10b981',
  returned: '#d97706',
  returned_for_correction: '#d97706',
  rejected: '#e11d48',
  withdrawn: '#94a3b8',
  paused_pending_handover: '#f59e0b',
  completed: '#0f766e',
}

const STATUS_LABELS: Record<string, string> = {
  draft: 'Draft',
  submitted: 'Submitted',
  under_review: 'Under review',
  approved: 'Approved',
  returned: 'Returned',
  returned_for_correction: 'Returned for correction',
  rejected: 'Rejected',
  withdrawn: 'Withdrawn',
  paused_pending_handover: 'Paused — handover',
  completed: 'Completed',
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

function readReportQuery(): URLSearchParams {
  if (typeof window === 'undefined') return new URLSearchParams()
  return new URLSearchParams(window.location.search)
}

export function ReportsView() {
  const { requests, supervisorMode, canViewEmployee, leaveTypes, can, hasPerm, employeeId, allZones, employees } = useLeave()
  // Tab + range live in the URL so a filtered view is shareable and survives
  // reloads. window.location is read lazily (no Suspense boundary needed).
  // The redesign folds the old per-topic tabs into four sections; legacy
  // deep links (?tab=zone, ?tab=bottleneck, …) map onto them.
  const LEGACY_TABS: Record<string, string> = {
    zone: 'overview',
    types: 'overview',
    status: 'overview',
    monthly: 'overview',
    snapshot: 'overview',
    bottleneck: 'workflow',
    payment: 'payments',
  }
  const [tab, setTab] = useState(() => {
    const raw = readReportQuery().get('tab') ?? 'overview'
    return LEGACY_TABS[raw] ?? raw
  })
  const [from, setFrom] = useState(() => readReportQuery().get('from') ?? '')
  const [to, setTo] = useState(() => readReportQuery().get('to') ?? '')

  useEffect(() => {
    const p = new URLSearchParams(window.location.search)
    p.set('tab', tab)
    if (from) p.set('from', from); else p.delete('from')
    if (to) p.set('to', to); else p.delete('to')
    window.history.replaceState(null, '', `${window.location.pathname}?${p.toString()}`)
  }, [tab, from, to])

  const canGender = can('reports', 'view_gender_reports')
  // Tab-level authorization. The sidebar admits anyone with a report-related
  // code; each surface below re-checks its own gate and locks otherwise, and
  // the backend stays authoritative (a locked UI never implies access).
  const canLegacyReports = hasPerm('reports.view')
  const canPayments = hasPerm('reports.view_financial') || hasPerm('leave_payments.view_cross_zone')
  const canOwnHistory = hasPerm('reports.view_own')

  const rangeParams: ReportFilters = {
    ...(from ? { from } : {}),
    ...(to ? { to } : {}),
  }

  // Server summary: card totals + zone/type/status aggregates share one
  // definition with every detail endpoint. While loading (or on network
  // failure) the client aggregates below stand in; on 403 the cards lock.
  const [summary, setSummary] = useState<ReportSummary | null>(null)
  const [summaryDenied, setSummaryDenied] = useState(false)
  useEffect(() => {
    if (!canLegacyReports) {
      setSummary(null)
      setSummaryDenied(false)
      return
    }
    let cancelled = false
    setSummaryDenied(false)
    leaveApi.reports
      .summary(rangeParams)
      .then((r) => {
        if (!cancelled) setSummary(r.data)
      })
      .catch((e) => {
        if (!cancelled && e instanceof ApiError && (e.status === 403 || e.status === 422)) setSummaryDenied(true)
      })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [from, to, employeeId, canLegacyReports])

  // Payment Overview state.
  const [paySummary, setPaySummary] = useState<PaymentSummary | null>(null)
  const [payDenied, setPayDenied] = useState(false)
  useEffect(() => {
    if (!canPayments) {
      setPaySummary(null)
      setPayDenied(false)
      return
    }
    let cancelled = false
    setPayDenied(false)
    leaveApi.reports
      .paymentSummary(rangeParams)
      .then((r) => {
        if (!cancelled) setPaySummary(r.data)
      })
      .catch((e) => {
        if (!cancelled && e instanceof ApiError && (e.status === 403 || e.status === 422)) setPayDenied(true)
      })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [from, to, employeeId, canPayments])

  // Drill-down selection. Detail tables fetch their own server pages; the
  // kind/param travels with the shared range filters.
  const [detail, setDetail] = useState<{ kind: 'approved-days' | 'pending' | 'staff' | 'requests' | 'gender' | 'zone' | 'type' | 'status'; param?: string; title: string } | null>(null)
  const [detailRequest, setDetailRequest] = useState<LeaveRequest | null>(null)
  // Payment drill-down: category table, or one employee's history.
  const [payCat, setPayCat] = useState<{ kind: 'paid' | 'eligible-unpaid' | 'without-payment-request' | 'leave-taken-unpaid' | 'eligible-no-leave' | 'pending-hr' | 'pending-accounting' | 'processing' | 'rejected'; title: string } | null>(null)
  const [payHistory, setPayHistory] = useState<{ employeeId: string; name: string } | null>(null)

  // `requests` already arrived scoped by the API; canViewEmployee keeps the
  // client-side aggregation on the same boundary the server enforced.
  const base: LeaveRequest[] = requests.filter((r) => canViewEmployee(r.employeeId))
  const visible = base.filter((r) => {
    if (from && r.endDate < from) return false
    if (to && r.startDate > to) return false
    return true
  })

  const byZone = allZones.map((z) => {
    const items = visible.filter((r) => getEmployee(r.employeeId)?.zoneId === z.id)
    return { zone: z.short, days: items.reduce((s, r) => s + r.days, 0), requests: items.length }
  }).filter((x) => x.requests > 0)

  const byType = leaveTypes.map((lt) => {
    const items = visible.filter((r) => r.leaveTypeId === lt.id && (r.status === 'approved' || r.status === 'under_review'))
    return { name: lt.short, value: items.reduce((s, r) => s + r.days, 0), color: lt.color }
  }).filter((x) => x.value > 0)

  const byGender = visible.filter((r) => r.status === 'approved').reduce<Record<string, number>>(
    (acc, r) => {
      const g = getEmployee(r.employeeId)?.gender
      if (g) acc[g] = (acc[g] || 0) + r.days
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

  // Weekly buckets for the forecast grid: busiest day per office, per week.
  const futureWeeks = (() => {
    const horizon = addDays(TODAY, 60)
    const approved = visible.filter((r) => r.status === 'approved' && r.endDate >= TODAY && r.startDate <= horizon)
    return allZones.map((z) => {
      const staffInZone = employees.filter((e) => e.zoneId === z.id)
      const out = approved.filter((r) => getEmployee(r.employeeId)?.zoneId === z.id)
      const daily: number[] = []
      for (let i = 0; i <= 60; i++) {
        const day = addDays(TODAY, i)
        daily.push(out.filter((r) => r.startDate <= day && r.endDate >= day).length)
      }
      const weeks: number[] = []
      for (let w = 0; w < 8; w++) {
        const slice = daily.slice(w * 7, w * 7 + 7)
        weeks.push(slice.length ? Math.max(...slice) : 0)
      }
      const maxOut = Math.max(...daily)
      const daysAhead = out.reduce((s, r) => s + r.days, 0)
      return {
        zone: z.short,
        staff: staffInZone.length,
        weeks,
        weekStarts: Array.from({ length: 8 }, (_, w) => addDays(TODAY, w * 7)),
        daysAhead,
        maxOut,
        coverage: staffInZone.length === 0 ? 100 : Math.round(((staffInZone.length - maxOut) / staffInZone.length) * 100),
      }
    })
  })()
  const future60 = futureWeeks

  // Server aggregates drive the charts when available (same definition as
  // every detail endpoint); client aggregates stand in while loading.
  const zoneRows = (summary?.by_zone ?? byZone.map((z) => ({ zone_id: allZones.find((s) => s.short === z.zone)?.id ?? z.zone, ...z }))).map((z) => ({
    zone_id: (z as { zone_id: string }).zone_id,
    zone: z.zone,
    requests: z.requests,
    days: z.days,
  }))
  const typeRows = (summary?.by_type ?? byType.map((t) => ({ leave_type_id: leaveTypes.find((l) => l.short === t.name)?.id ?? t.name, name: t.name, days: t.value }))).map((t, i) => ({
    leave_type_id: (t as { leave_type_id: string }).leave_type_id,
    name: t.name,
    value: (t as { value?: number }).value ?? (t as unknown as { days: number }).days,
    color: (t as { color?: string }).color ?? leaveTypes.find((l) => l.id === (t as { leave_type_id: string }).leave_type_id)?.color ?? ['#0f766e', '#10b981', '#f59e0b', '#e11d48', '#0284c7', '#7c3aed', '#64748b'][i % 7],
  }))
  const statusRows = (summary?.status_mix ?? statusMix.map((s) => ({ status: s.status, count: s.value }))).map((s) => ({
    status: s.status,
    label: STATUS_LABELS[s.status] ?? s.status,
    value: (s as { value?: number }).value ?? (s as unknown as { count: number }).count,
    color: STATUS_COLORS[s.status] ?? '#64748b',
  }))

  const COLORS = ['#0f766e', '#10b981', '#f59e0b', '#e11d48', '#0284c7', '#7c3aed', '#64748b']

  // Key findings — derived from the same aggregates the cards and tables use.
  const totalLogged = statusRows.reduce((s, r) => s + r.value, 0)
  const settledCount = statusRows.filter((r) => r.status === 'approved' || r.status === 'completed').reduce((s, r) => s + r.value, 0)
  const approvedPct = totalLogged ? Math.round((settledCount / totalLogged) * 100) : 0
  const overdueTotal = bottleneck.reduce((s, b) => s + b.overdue, 0)
  const pendingTotal = summary?.cards.pending.total ?? pending.length
  const worstZone = [...futureWeeks].filter((z) => z.staff > 0).sort((a, b) => a.coverage - b.coverage)[0]

  // Export covers the ACTIVE tab with the ACTIVE filters only — never the
  // whole report. Server aggregates feed the cards/charts tabs so the file
  // matches what the backend totals.
  const exportCSV = () => {
    const head = [
      'DPP Zanzibar Leave System — usage report',
      `Tab,${tab}`,
      `Generated,${fmtShort(TODAY)}${from || to ? ` (filtered ${from || '…'} → ${to || '…'})` : ''}`,
      '',
    ]
    const zoneLines = [
      'Leave usage by zone',
      'Zone,Requests,Leave days',
      ...zoneRows.map((z) => `${z.zone},${z.requests},${z.days}`),
      '',
    ]
    const typeLines = [
      'Leave types used (approved + in review)',
      'Type,Days',
      ...typeRows.map((t) => `${t.name},${t.value}`),
      '',
    ]
    const statusLines = [
      'Request status mix',
      'Status,Count',
      ...statusRows.map((s) => `${s.label},${s.value}`),
      '',
    ]
    const body: string[] = (() => {
      switch (tab) {
        case 'overview':
          return [
            ...zoneLines,
            ...typeLines,
            ...statusLines,
            'Approved days per month',
            'Month,Days',
            ...monthly.map((m) => `${m.month},${m.days}`),
            '',
          ]
        case 'forecast':
          return [
            `Staffing forecast — next 60 days`,
            'Zone,Staff in office,Days planned ahead,Max staff out,Coverage %',
            ...future60.map((z) => `${z.zone},${z.staff},${z.daysAhead},${z.maxOut} of ${z.staff},${z.coverage}`),
            '',
          ]
        case 'workflow':
          return [
            'Approval bottleneck',
            'Approver,Pending actions,Overdue',
            ...bottleneck.map((b) => `${getEmployee(b.assigneeId).name},${b.count},${b.overdue}`),
            '',
          ]
        case 'payments': {
          const c = paySummary?.cards
          const a = paySummary?.amounts
          return [
            'Payment Overview',
            'Category,Count',
            ...(c
              ? [
                  `Eligible,${c.total_eligible.total}`,
                  `Paid,${c.paid.total}`,
                  `Eligible unpaid,${c.eligible_unpaid.total}`,
                  `Without payment request,${c.without_payment_request.total}`,
                  `Leave taken unpaid,${c.leave_taken_unpaid.total}`,
                  `Eligible no leave,${c.eligible_no_leave.total}`,
                  `Pending HR,${c.pending_hr.total}`,
                  `Pending Accounting,${c.pending_accounting.total}`,
                  `Processing,${c.processing.total}`,
                  `Rejected,${c.rejected.total}`,
                ]
              : ['(summary not loaded)']),
            '',
            ...(a
              ? [
                  'Amounts',
                  `Eligible,${a.total_eligible_amount}`,
                  `Approved,${a.total_approved_amount}`,
                  `Paid,${a.total_paid_amount}`,
                  `Outstanding,${a.outstanding_amount} ${a.currency}`,
                  '',
                ]
              : []),
          ]
        }
        default:
          return []
      }
    })()
    const lines = [...head, ...body]
    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `dpp-zanzibar-leave-report-${tab}-${TODAY}.csv`
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
          { value: 'overview', label: 'Overview', icon: BarChart3 },
          { value: 'workflow', label: 'Approval workflow', icon: Gauge },
          { value: 'forecast', label: 'Staffing forecast', icon: TrendingUp },
          ...((canPayments || canOwnHistory) ? [{ value: 'payments', label: 'Payments', icon: Wallet }] : []),
        ]}
        value={tab}
        onChange={(v) => { setTab(v); setDetail(null); setPayCat(null); setPayHistory(null) }}
      />

      {summaryDenied && (
        <Panel title="Reports unavailable" subtitle="The server refused the summary request.">
          <p className="text-[12px] text-muted-foreground">Your capabilities changed or the report permission was revoked. Refresh; if this persists, contact HR. No totals are shown rather than wrong ones.</p>
        </Panel>
      )}

      {tab !== 'payments' && !canLegacyReports ? (
        <Panel title="Restricted" subtitle="Report data needs the reporting permission.">
          <div className="flex items-start gap-3">
            <Lock className="w-5 h-5 text-muted-foreground mt-0.5" />
            <p className="text-[12px] text-muted-foreground leading-relaxed">
              Your account cannot view office reports. The server enforces this — nothing is hidden client-side that you could otherwise fetch. Contact HR for access.
            </p>
          </div>
        </Panel>
      ) : (
      <>
      {tab === 'overview' && (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-4">
            <ClickableCard
              title="View approved-days detail"
              onOpen={() => setDetail({ kind: 'approved-days', title: 'Approved days — detail' })}
              disabled={!canLegacyReports}
            >
              <StatCard icon={CalendarCheck} label="Approved days" value={summary?.cards.approved_days.total ?? approvedDays} hint="your date filter · view detail" tone="teal" />
            </ClickableCard>
            <ClickableCard
              title="View pending-request detail"
              onOpen={() => setDetail({ kind: 'pending', title: 'Pending requests — detail' })}
              disabled={!canLegacyReports}
            >
              <StatCard icon={Timer} label="Pending" value={summary?.cards.pending.total ?? pending.length} hint="awaiting decision · view detail" tone="amber" />
            </ClickableCard>
            <ClickableCard
              title="View staff detail"
              onOpen={() => setDetail({ kind: 'staff', title: 'Staff — detail' })}
              disabled={!canLegacyReports}
            >
              <StatCard icon={Users} label="Staff" value={summary?.cards.staff.total ?? employees.length} hint={`across ${allZones.length} zones · view detail`} tone="emerald" />
            </ClickableCard>
            {canGender ? (
              <ClickableCard
                title="View gender detail"
                onOpen={() => setDetail({ kind: 'gender', param: 'F', title: 'Approved days — women' })}
                disabled={!canLegacyReports}
              >
                <StatCard icon={TrendingUp} label="Gender split" value={summary ? `${summary.cards.gender?.F ?? 0} / ${summary.cards.gender?.M ?? 0}` : `${byGender.F ?? 0} / ${byGender.M ?? 0}`} hint="approved days F / M · view detail" tone="violet" />
              </ClickableCard>
            ) : (
              <StatCard icon={Lock} label="Gender split" value="—" hint="restricted personnel data" tone="violet" />
            )}
            <ClickableCard
              title="View logged-request detail"
              onOpen={() => setDetail({ kind: 'requests', title: 'Requests logged — detail' })}
              disabled={!canLegacyReports}
            >
              <StatCard icon={Hash} label="Requests logged" value={summary?.cards.requests_logged.total ?? visible.length} hint="in filtered range · view detail" tone="sky" />
            </ClickableCard>
          </div>

          <section aria-label="Key findings" className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            <FindingCard tag="Pipeline" tone="teal" text={totalLogged ? `${approvedPct}% of logged requests approved or done` : 'No requests logged in the range'} />
            <FindingCard tag="Queue" tone="sky" text={`${pendingTotal} request${pendingTotal === 1 ? '' : 's'} awaiting a decision`} />
            <FindingCard
              tag="SLA"
              tone={overdueTotal > 0 ? 'amber' : 'emerald'}
              text={overdueTotal > 0 ? `${overdueTotal} approval step${overdueTotal === 1 ? '' : 's'} overdue — chains stalled` : 'All pending approvals within their due date'}
            />
            <FindingCard
              tag="Coverage"
              tone={worstZone && worstZone.coverage < 75 ? 'rose' : 'teal'}
              text={worstZone ? `${worstZone.zone} at ${worstZone.coverage}% staff on its busiest day (next 8 weeks)` : 'No office has approved leave planned'}
            />
          </section>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Panel title="Approved days per month" subtitle="Monthly approved days from the filtered range">
              <div className="h-[300px]">
                <MonthlyDaysChart rows={monthly} />
              </div>
            </Panel>

            <Panel title="Request status mix" subtitle={`${totalLogged} request${totalLogged === 1 ? '' : 's'} logged in the range`}>
              <div className="h-[240px]">
                <StatusMixChart rows={statusRows} />
              </div>
              <BreakdownTable
                rows={statusRows}
                rowKey={(r) => r.status}
                onRowClick={(r) => setDetail({ kind: 'status', param: r.status, title: `Requests — ${r.label}` })}
                columns={[
                  {
                    key: 'label', label: 'Status',
                    render: (r) => (
                      <span className="inline-flex items-center gap-2 font-medium">
                        <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: r.color }} />
                        {r.label}
                      </span>
                    ),
                  },
                  { key: 'value', label: 'Requests', align: 'right', render: (r) => <span className="tabular-nums font-medium">{r.value}</span> },
                  {
                    key: 'share', label: 'Share', align: 'right',
                    render: (r) => <span className="tabular-nums text-muted-foreground">{totalLogged ? Math.round((r.value / totalLogged) * 100) : 0}%</span>,
                  },
                ]}
              />
            </Panel>

            <Panel title="Leave usage by zone" subtitle="Approved & in-review days per regional office — click a row for detail">
              <div className="h-[280px]">
                <ZoneUsageChart rows={zoneRows} />
              </div>
              <BreakdownTable
                rows={zoneRows}
                rowKey={(r) => r.zone_id}
                onRowClick={(z) => setDetail({ kind: 'zone', param: z.zone_id, title: `Leave usage — ${z.zone}` })}
                columns={[
                  { key: 'zone', label: 'Zone', render: (z) => <span className="font-semibold text-foreground whitespace-nowrap">{z.zone}</span> },
                  { key: 'requests', label: 'Requests', align: 'right', render: (z) => <span className="tabular-nums">{z.requests}</span> },
                  { key: 'days', label: 'Days', align: 'right', render: (z) => <span className="tabular-nums font-medium">{z.days}</span> },
                  {
                    key: 'share', label: 'Share of days', align: 'right',
                    render: (z) => {
                      const total = zoneRows.reduce((s, r) => s + r.days, 0)
                      return <span className="tabular-nums text-muted-foreground">{total ? Math.round((z.days / total) * 100) : 0}%</span>
                    },
                  },
                ]}
              />
            </Panel>

            <Panel title="Leave types used" subtitle="Approved & in-review days by leave type — click a row for detail">
              <div className="h-[280px]">
                <TypeUsageChart rows={typeRows} colors={COLORS} />
              </div>
              <BreakdownTable
                rows={typeRows}
                rowKey={(r) => r.leave_type_id}
                onRowClick={(t) => setDetail({ kind: 'type', param: t.leave_type_id, title: `Leave type — ${t.name}` })}
                columns={[
                  {
                    key: 'name', label: 'Leave type',
                    render: (t) => (
                      <span className="inline-flex items-center gap-2 font-medium">
                        <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: t.color }} />
                        {t.name}
                      </span>
                    ),
                  },
                  { key: 'value', label: 'Days', align: 'right', render: (t) => <span className="tabular-nums font-medium">{t.value}</span> },
                  {
                    key: 'share', label: 'Share', align: 'right',
                    render: (t) => {
                      const total = typeRows.reduce((s, r) => s + r.value, 0)
                      return <span className="tabular-nums text-muted-foreground">{total ? Math.round((t.value / total) * 100) : 0}%</span>
                    },
                  },
                ]}
              />
            </Panel>
          </div>

          <ServerDetailTable
            title="Request detail"
            subtitle="Server-paged · latest first · shares the report range"
            fetchPage={(p) => leaveApi.reports.details('requests', p)}
            columns={REQUEST_COLUMNS((id) => {
              const found = requests.find((r) => String(r.id) === String(id))
              if (found) setDetailRequest(found)
            })}
            baseParams={rangeParams}
            filterKey={`overview-requests|${from ?? ''}|${to ?? ''}`}
            defaultSort="start_date"
            hideClose
            onClose={() => {}}
          />
        </>
      )}

      {tab === 'forecast' && (
        <Panel
          title="Staffing forecast — next 8 weeks"
          subtitle="Staff on approved leave on each week's busiest day, by office — cell shows headcount out"
        >
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="text-[11px] uppercase tracking-wider text-muted-foreground">
                  <th className="py-3 px-4 font-semibold">Zone</th>
                  <th className="py-3 px-3 font-semibold text-right">Staff</th>
                  {futureWeeks[0]?.weekStarts.map((start, w) => (
                    <th key={w} className="py-3 px-2 font-semibold text-center" title={`Week of ${fmtShort(start)}`}>
                      W{w + 1}
                    </th>
                  ))}
                  <th className="py-3 px-4 font-semibold">Worst-day coverage</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {futureWeeks.map((z) => (
                  <tr key={z.zone} className="text-[13px]">
                    <td className="py-2.5 px-4 font-semibold text-foreground whitespace-nowrap">{z.zone}</td>
                    <td className="py-2.5 px-3 text-right text-muted-foreground tabular-nums">{z.staff}</td>
                    {z.weeks.map((v, w) => {
                      const share = z.staff === 0 ? 0 : v / z.staff
                      return (
                        <td
                          key={w}
                          title={`Week of ${fmtShort(z.weekStarts[w])} · ${v} of ${z.staff} out`}
                          className={cn(
                            'py-2.5 px-2 text-center tabular-nums font-medium rounded-md',
                            v === 0 && 'text-muted-foreground',
                            v > 0 && share >= 0.2 && 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300',
                            v > 0 && share >= 0.12 && share < 0.2 && 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300',
                            v > 0 && share < 0.12 && 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300',
                          )}
                        >
                          {v === 0 ? '—' : v}
                        </td>
                      )
                    })}
                    <td className="py-2.5 px-4 whitespace-nowrap">
                      <span className={cn('text-[12px] font-semibold', z.coverage >= 85 ? 'text-emerald-600 dark:text-emerald-400' : z.coverage >= 75 ? 'text-amber-600 dark:text-amber-400' : 'text-rose-600 dark:text-rose-400')}>
                        {z.coverage}% · {z.coverage >= 85 ? 'Healthy' : z.coverage >= 75 ? 'Watch' : 'Risk'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex flex-wrap items-center gap-3 mt-4 text-[11px] text-muted-foreground">
            <span className="font-semibold">Share of office out:</span>
            <span className="inline-flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-emerald-100 dark:bg-emerald-950 border border-emerald-200 dark:border-emerald-900" /> under 12%</span>
            <span className="inline-flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-amber-100 dark:bg-amber-950 border border-amber-200 dark:border-amber-900" /> 12–19%</span>
            <span className="inline-flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-rose-100 dark:bg-rose-950 border border-rose-200 dark:border-rose-900" /> 20% or more</span>
            <span className="ml-auto">Coverage = staff in office on the busiest day. Healthy 85%+, watch 75–84%, risk under 75%. Generated {fmtShort(TODAY)}.</span>
          </div>
        </Panel>
      )}

      {tab === 'workflow' && (
        <Panel title="Approval bottleneck" subtitle="Pending steps per approver — overdue actions hold whole chains">
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

      {tab === 'payments' && (
        <PaymentOverviewPanel
          paySummary={paySummary}
          payDenied={payDenied}
          canPayments={canPayments}
          canOwnHistory={canOwnHistory}
          ownEmployeeId={employeeId}
          rangeParams={rangeParams}
          payCat={payCat}
          setPayCat={setPayCat}
          payHistory={payHistory}
          setPayHistory={setPayHistory}
          openRequestDetail={(id) => {
            const found = requests.find((r) => String(r.id) === String(id))
            if (found) setDetailRequest(found)
          }}
        />
      )}

      {detail && canLegacyReports && (
        <ReportDetailPanel
          detail={detail}
          onClose={() => setDetail(null)}
          rangeParams={rangeParams}
          canGender={canGender}
          setGenderParam={(g) => setDetail((d) => (d ? { ...d, param: g, title: g === 'F' ? 'Approved days — women' : 'Approved days — men' } : d))}
          openRequestDetail={(id) => {
            const found = requests.find((r) => String(r.id) === String(id))
            if (found) setDetailRequest(found)
          }}
        />
      )}

      <Modal
        open={detailRequest !== null}
        onClose={() => setDetailRequest(null)}
        title={detailRequest ? `${detailRequest.ref} — application details` : 'Request details'}
        subtitle="Full application, documents and approval chain."
        size="lg"
      >
        {detailRequest ? <RequestDetail request={detailRequest} isHr={can('documents', 'view_medical_documents')} /> : null}
      </Modal>
      </>
      )}
    </div>
  )
}

const REQUEST_COLUMNS = (
  openRequestDetail: (id: string | number) => void,
): DetailColumn[] => [
  {
    key: 'ref', label: 'Reference', sortable: true,
    render: (r: DetailRequestRow) => (
      <button type="button" onClick={() => openRequestDetail(r.id)} className="font-mono text-[12px] text-teal-700 dark:text-teal-300 hover:underline" title="Open request details">
        {r.ref}
      </button>
    ),
  },
  { key: 'employee', label: 'Employee', render: (r: DetailRequestRow) => personCell(r.employee?.full_name, r.employee?.id) },
  { key: 'type', label: 'Type', render: (r: DetailRequestRow) => <span className="whitespace-nowrap">{r.leave_type?.name ?? '—'}</span> },
  {
    key: 'start_date', label: 'Dates', sortable: true,
    render: (r: DetailRequestRow) => <span className="whitespace-nowrap text-muted-foreground">{r.start_date ? fmtShort(r.start_date) : '—'}{r.end_date ? ` → ${fmtShort(r.end_date)}` : ''}</span>,
  },
  {
    key: 'days', label: 'Days', sortable: true,
    render: (r: DetailRequestRow) => <span className="tabular-nums font-medium">{r.days ?? '—'}</span>,
  },
  {
    key: 'status', label: 'Status', sortable: true,
    render: (r: DetailRequestRow) => <span className="text-[12px]">{STATUS_LABELS[r.status] ?? r.status}</span>,
  },
]

function ReportDetailPanel(props: {
  detail: { kind: 'approved-days' | 'pending' | 'staff' | 'requests' | 'gender' | 'zone' | 'type' | 'status'; param?: string; title: string }
  onClose: () => void
  rangeParams: ReportFilters
  canGender: boolean
  setGenderParam: (g: 'M' | 'F') => void
  openRequestDetail: (id: string | number) => void
}) {
  const { detail } = props
  const filterKey = `${detail.kind}|${detail.param ?? ''}|${props.rangeParams.from ?? ''}|${props.rangeParams.to ?? ''}`
  const cols = REQUEST_COLUMNS(props.openRequestDetail)

  if (detail.kind === 'staff') {
    return (
      <ServerDetailTable
        title={detail.title}
        subtitle="Active staff in scope"
        fetchPage={(p) => leaveApi.reports.details('staff', p)}
        columns={[
          { key: 'full_name', label: 'Name', sortable: true, render: (r: DetailStaffRow) => personCell(r.full_name, r.id) },
          { key: 'department_id', label: 'Department', sortable: true, render: (r: DetailStaffRow) => <span>{r.department?.name ?? '—'}</span> },
          { key: 'zone_id', label: 'Zone', sortable: true, render: (r: DetailStaffRow) => <span className="whitespace-nowrap">{r.zone?.name ?? '—'}</span> },
          { key: 'gender', label: 'Gender', render: (r: DetailStaffRow) => <span>{r.gender ?? '—'}</span> },
          { key: 'hire_date', label: 'Hired', sortable: true, render: (r: DetailStaffRow) => <span className="whitespace-nowrap text-muted-foreground">{r.hire_date ? fmtShort(r.hire_date) : '—'}</span> },
        ]}
        baseParams={props.rangeParams}
        filterKey={filterKey}
        defaultSort="full_name"
        defaultDir="asc"
        onClose={props.onClose}
      />
    )
  }

  if (detail.kind === 'gender') {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-semibold text-muted-foreground">Group:</span>
          {(['F', 'M'] as const).map((g) => (
            <Btn key={g} variant={detail.param === g ? 'emerald' : 'outline'} onClick={() => props.setGenderParam(g)}>
              {g === 'F' ? 'Women' : 'Men'}
            </Btn>
          ))}
        </div>
        <ServerDetailTable
          title={detail.title}
          subtitle="Approved rows in range for the group"
          fetchPage={(p) => leaveApi.reports.genderDetails((detail.param ?? 'F') as 'M' | 'F', p)}
          columns={cols}
          baseParams={props.rangeParams}
          filterKey={filterKey}
          defaultSort="start_date"
          onClose={props.onClose}
        />
      </div>
    )
  }

  const fetchers: Record<string, (p: ReportFilters) => Promise<ReportPage<any>>> = {
    'approved-days': (p) => leaveApi.reports.details('approved-days', p),
    pending: (p) => leaveApi.reports.details('pending', p),
    requests: (p) => leaveApi.reports.details('requests', p),
    zone: (p) => leaveApi.reports.zoneDetails(detail.param ?? '', p),
    type: (p) => leaveApi.reports.typeDetails(detail.param ?? '', p),
    status: (p) => leaveApi.reports.statusDetails(detail.param ?? '', p),
  }

  return (
    <ServerDetailTable
      title={detail.title}
      subtitle="Rows share the card filters, scope and query definition"
      fetchPage={fetchers[detail.kind]}
      columns={cols}
      baseParams={props.rangeParams}
      filterKey={filterKey}
      defaultSort="start_date"
      onClose={props.onClose}
    />
  )
}

const PAY_CATEGORIES = [
  { kind: 'paid', label: 'Paid', hint: 'settled cases' },
  { kind: 'eligible-unpaid', label: 'Eligible but unpaid', hint: 'eligible, not settled' },
  { kind: 'without-payment-request', label: 'No payment request', hint: 'eligible, no case' },
  { kind: 'leave-taken-unpaid', label: 'Leave taken, unpaid', hint: 'arrived leave, no settlement' },
  { kind: 'eligible-no-leave', label: 'Eligible, no leave taken', hint: 'could be paid next' },
  { kind: 'pending-hr', label: 'Pending HR', hint: 'awaiting HR review' },
  { kind: 'pending-accounting', label: 'Pending Accounting', hint: 'with finance' },
  { kind: 'processing', label: 'Processing', hint: 'being settled' },
  { kind: 'rejected', label: 'Rejected', hint: 'HR or payment refusal' },
] as const

type PayCategoryKind = (typeof PAY_CATEGORIES)[number]['kind']

function paymentCaseColumns(openHistory: (employeeId: string, name: string) => void): DetailColumn[] {
  return [
    {
      key: 'id', label: 'Case', sortable: false,
      render: (r: PaymentCaseRow) => <span className="font-mono text-[12px]">#{r.id}</span>,
    },
    {
      key: 'employee', label: 'Employee',
      render: (r: PaymentCaseRow) => {
        const emp = r.employee as { id?: string; full_name?: string } | null | undefined
        return personCell(emp?.full_name, emp?.id, emp?.id ? () => openHistory(emp.id as string, emp.full_name as string) : undefined)
      },
    },
    {
      key: 'type', label: 'Type',
      render: (r: PaymentCaseRow) => {
        const lt = r.leave_type as { name?: string } | null | undefined
        return <span className="whitespace-nowrap">{lt?.name ?? String(r.payment_type ?? '—')}</span>
      },
    },
    {
      key: 'calculated_amount', label: 'Amount', sortable: true,
      render: (r: PaymentCaseRow) => <span className="tabular-nums font-medium">{money(r.calculated_amount as number | null, r.currency as string | null)}</span>,
    },
    {
      key: 'status', label: 'Status', sortable: true,
      render: (r: PaymentCaseRow) => <span className="text-[12px]">{String(r.status ?? '—').replace(/_/g, ' ')}</span>,
    },
    {
      key: 'created_at', label: 'Opened', sortable: true,
      render: (r: PaymentCaseRow) => <span className="whitespace-nowrap text-muted-foreground">{String((r as Record<string, unknown>).created_at ?? '—')}</span>,
    },
  ]
}

function paymentPairColumns(openHistory: (employeeId: string, name: string) => void): DetailColumn[] {
  return [
    {
      key: 'employee', label: 'Employee',
      render: (r: PaymentPairRow) => personCell(r.employee?.full_name, r.employee?.id, () => openHistory(r.employee.id, r.employee.full_name)),
    },
    {
      key: 'type', label: 'Leave type',
      render: (r: PaymentPairRow) => <span className="whitespace-nowrap">{r.leave_type?.name ?? r.leave_type?.id ?? '—'}</span>,
    },
    {
      key: 'leave', label: 'Leave',
      render: (r: PaymentPairRow) => (
        <span className="whitespace-nowrap text-muted-foreground">
          {r.leave_request ? `${r.leave_request.ref} · ${r.leave_request.days ?? '—'}d` : 'no approved leave'}
        </span>
      ),
    },
    {
      key: 'case', label: 'Payment case',
      render: (r: PaymentPairRow) => {
        const c = r.payment_case as { id?: number; status?: string; calculated_amount?: number | null; currency?: string | null } | null
        return c ? (
          <span className="whitespace-nowrap">#{c.id} · {String(c.status ?? '').replace(/_/g, ' ')} · {money(c.calculated_amount, c.currency)}</span>
        ) : (
          <span className="text-muted-foreground">no case</span>
        )
      },
    },
  ]
}

const PAIR_KINDS: PayCategoryKind[] = ['eligible-unpaid', 'without-payment-request', 'leave-taken-unpaid', 'eligible-no-leave']

const PAY_CATEGORY_TITLES: Record<PayCategoryKind, string> = {
  paid: 'Paid cases',
  'eligible-unpaid': 'Eligible but unpaid',
  'without-payment-request': 'Eligible without payment request',
  'leave-taken-unpaid': 'Leave taken but unpaid',
  'eligible-no-leave': 'Eligible with no leave taken',
  'pending-hr': 'Pending HR review',
  'pending-accounting': 'Pending Accounting',
  processing: 'Processing payments',
  rejected: 'Rejected payments',
}

function PaymentOverviewPanel(props: {
  paySummary: PaymentSummary | null
  payDenied: boolean
  canPayments: boolean
  canOwnHistory: boolean
  ownEmployeeId: string
  rangeParams: ReportFilters
  payCat: { kind: PayCategoryKind; title: string } | null
  setPayCat: (c: { kind: PayCategoryKind; title: string } | null) => void
  payHistory: { employeeId: string; name: string } | null
  setPayHistory: (h: { employeeId: string; name: string } | null) => void
  openRequestDetail: (id: string | number) => void
}) {
  const { paySummary, payDenied } = props
  const openHistory = (employeeId: string, name: string) => {
    props.setPayCat(null)
    props.setPayHistory({ employeeId, name })
  }
  const historyKey = props.payHistory ? `history|${props.payHistory.employeeId}` : null
  const catKey = props.payCat ? `cat|${props.payCat.kind}` : null

  if (!props.canPayments && !props.canOwnHistory) {
    return (
      <Panel title="Payment Overview" subtitle="Restricted.">
        <div className="flex items-start gap-3">
          <Lock className="w-5 h-5 text-muted-foreground mt-0.5" />
          <p className="text-[12px] text-muted-foreground leading-relaxed">Payment visibility needs a finance or payment role. Contact HR for access.</p>
        </div>
      </Panel>
    )
  }

  // Staff without finance roles see only their own history.
  if (!props.canPayments) {
    return (
      <Panel title="Payment Overview" subtitle="Your payment history">
        <ServerDetailTable
          title="My payment history"
          subtitle="Your cases only"
          fetchPage={(p) => leaveApi.reports.paymentHistory(props.ownEmployeeId, p)}
          columns={paymentCaseColumns(() => {})}
          baseParams={props.rangeParams}
          filterKey={`own-history|${props.ownEmployeeId}|${props.rangeParams.from ?? ''}|${props.rangeParams.to ?? ''}`}
          defaultSort="created_at"
          onClose={() => {}}
        />
      </Panel>
    )
  }

  if (payDenied) {
    return (
      <Panel title="Payment Overview" subtitle="Access refused by the server.">
        <div className="flex items-start gap-3">
          <Lock className="w-5 h-5 text-muted-foreground mt-0.5" />
          <p className="text-[12px] text-muted-foreground leading-relaxed">Your payment visibility was revoked or never granted. No figures are shown rather than wrong ones.</p>
        </div>
      </Panel>
    )
  }

  const cards = paySummary?.cards
  const amounts = paySummary?.amounts
  const cur = amounts?.currency ? ` ${amounts.currency}` : ''

  // Settlement funnel — derived from the same server totals as the cards.
  const eligibleCount = cards ? cards.total_eligible.total : null
  const caseOpened = cards ? Math.max(0, cards.total_eligible.total - cards.without_payment_request.total) : null
  const clearedHr = cards && caseOpened !== null ? Math.max(0, caseOpened - cards.pending_hr.total - cards.rejected.total) : null
  const paidCount = cards ? cards.paid.total : null
  const funnel = [
    { label: 'Eligible pairs', count: eligibleCount, color: '#9BB8B2' },
    { label: 'Payment case opened', count: caseOpened, color: '#5E9A90' },
    { label: 'Cleared HR review', count: clearedHr, color: '#2F7A6F' },
    { label: 'Paid', count: paidCount, color: '#0F5C54' },
  ]
  const funnelTotal = eligibleCount && eligibleCount > 0 ? eligibleCount : 1

  // Categories that still need a person to act — a list, not a wall of cards.
  // Paid stays reachable from the funnel link below.
  const ATTENTION: { kind: PayCategoryKind; label: string; hint: string; color: string }[] = [
    { kind: 'pending-hr', label: 'Pending HR', hint: 'awaiting HR review', color: '#f59e0b' },
    { kind: 'pending-accounting', label: 'Pending Accounting', hint: 'with finance', color: '#0284c7' },
    { kind: 'processing', label: 'Processing', hint: 'being settled', color: '#0f766e' },
    { kind: 'rejected', label: 'Rejected', hint: 'HR or payment refusal', color: '#e11d48' },
    { kind: 'without-payment-request', label: 'No payment request', hint: 'eligible, no case yet', color: '#7c3aed' },
    { kind: 'leave-taken-unpaid', label: 'Leave taken, unpaid', hint: 'arrived leave, no settlement', color: '#d97706' },
    { kind: 'eligible-unpaid', label: 'Eligible but unpaid', hint: 'eligible, not settled', color: '#64748b' },
    { kind: 'eligible-no-leave', label: 'Eligible, no leave taken', hint: 'could be paid next', color: '#10b981' },
  ]
  const attentionRows = (() => {
    if (!cards) return ATTENTION.map((a) => ({ ...a, count: null as number | null }))
    return ATTENTION.map((a) => {
      const key = a.kind.replace(/-/g, '_') as keyof typeof cards
      const count = (cards[key] as { total: number }).total
      return { ...a, count }
    }).filter((a) => a.count > 0)
  })()

  return (
    <div className="space-y-6">
      <section aria-label="Payment amounts" className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard icon={Wallet} label="Eligible amount" value={amounts ? `${Number(amounts.total_eligible_amount).toLocaleString()}${cur}` : '…'} hint="ever deemed eligible" tone="teal" />
        <StatCard icon={Wallet} label="Approved amount" value={amounts ? `${Number(amounts.total_approved_amount).toLocaleString()}${cur}` : '…'} hint="HR-approved" tone="emerald" />
        <StatCard icon={Wallet} label="Paid amount" value={amounts ? `${Number(amounts.total_paid_amount).toLocaleString()}${cur}` : '…'} hint="settled" tone="sky" />
        <StatCard icon={Wallet} label="Outstanding" value={amounts ? `${Number(amounts.outstanding_amount).toLocaleString()}${cur}` : '…'} hint="eligible, not yet paid" tone="amber" />
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Panel title="Settlement funnel" subtitle="Where eligible employee × leave-type pairs drop out before payment">
          {!cards ? (
            <p className="text-[12px] text-muted-foreground">Loading payment summary…</p>
          ) : (
            <div className="space-y-4">
              {funnel.map((f) => {
                const pct = f.count === null ? 0 : Math.round((f.count / funnelTotal) * 100)
                return (
                  <div key={f.label}>
                    <div className="flex justify-between items-baseline text-[13px] mb-1.5">
                      <span className="font-semibold text-foreground">{f.label}</span>
                      <span className="tabular-nums"><strong>{f.count ?? '—'}</strong> <span className="text-muted-foreground">· {pct}%</span></span>
                    </div>
                    <div className="h-5 rounded-md bg-muted overflow-hidden">
                      <div className="h-full rounded-md transition-[width]" style={{ width: `${pct}%`, background: f.color }} />
                    </div>
                  </div>
                )
              })}
              <div className="pt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-[12px]">
                <button
                  type="button"
                  onClick={() => { props.setPayHistory(null); props.setPayCat({ kind: 'paid', title: PAY_CATEGORY_TITLES.paid }) }}
                  className="font-semibold text-teal-700 dark:text-teal-300 hover:underline"
                >
                  View paid cases →
                </button>
                <span className="text-muted-foreground">{paidCount ?? 0} settled</span>
              </div>
            </div>
          )}
        </Panel>

        <Panel title="Needs attention" subtitle="Categories that still need a person to act — click a row to open it">
          {!cards ? (
            <p className="text-[12px] text-muted-foreground">Loading payment summary…</p>
          ) : attentionRows.length === 0 ? (
            <p className="text-[12px] text-muted-foreground">Nothing needs attention — every eligible category is clear.</p>
          ) : (
            <div className="divide-y divide-border -mt-1">
              {attentionRows.map((a) => {
                const active = props.payCat?.kind === a.kind
                return (
                  <div
                    key={a.kind}
                    role="button"
                    tabIndex={0}
                    onClick={() => { props.setPayHistory(null); props.setPayCat({ kind: a.kind, title: PAY_CATEGORY_TITLES[a.kind] }) }}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { props.setPayHistory(null); props.setPayCat({ kind: a.kind, title: PAY_CATEGORY_TITLES[a.kind] }) } }}
                    className={cn(
                      'flex items-center gap-3 py-3 px-2 -mx-2 rounded-xl cursor-pointer transition',
                      active ? 'bg-teal-700/10 ring-1 ring-teal-700/30' : 'hover:bg-accent/60',
                    )}
                  >
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: a.color }} />
                    <span className="flex-1 min-w-0">
                      <span className="block text-[13px] font-semibold text-foreground">{a.label}</span>
                      <span className="block text-[12px] text-muted-foreground">{a.hint}</span>
                    </span>
                    <span className="text-[20px] font-bold tabular-nums text-foreground">{a.count ?? '…'}</span>
                    <span className={cn('text-[12px] font-semibold shrink-0', active ? 'text-teal-700 dark:text-teal-300' : 'text-teal-700/80 dark:text-teal-300/80')}>
                      {active ? 'Open ↓' : 'View →'}
                    </span>
                  </div>
                )
              })}
            </div>
          )}
        </Panel>
      </div>

      {props.payHistory && (
        <PaymentHistoryTable
          employeeId={props.payHistory.employeeId}
          name={props.payHistory.name}
          rangeParams={props.rangeParams}
          filterKey={historyKey ?? 'history'}
          openHistory={openHistory}
          onClose={() => props.setPayHistory(null)}
        />
      )}

      {!props.payHistory && props.payCat && (
        <PaymentCategoryTable
          kind={props.payCat.kind}
          title={props.payCat.title}
          rangeParams={props.rangeParams}
          filterKey={catKey ?? 'cat'}
          openHistory={openHistory}
          onClose={() => props.setPayCat(null)}
        />
      )}
    </div>
  )
}

function PaymentHistoryTable(props: {
  employeeId: string
  name: string
  rangeParams: ReportFilters
  filterKey: string
  openHistory: (employeeId: string, name: string) => void
  onClose: () => void
}) {
  return (
    <ServerDetailTable
      title={`Payment history — ${props.name}`}
      subtitle="Cases for one employee"
      fetchPage={(p) => leaveApi.reports.paymentHistory(props.employeeId, p)}
      columns={paymentCaseColumns(props.openHistory)}
      baseParams={props.rangeParams}
      filterKey={props.filterKey}
      defaultSort="created_at"
      onClose={props.onClose}
    />
  )
}

function PaymentCategoryTable(props: {
  kind: PayCategoryKind
  title: string
  rangeParams: ReportFilters
  filterKey: string
  openHistory: (employeeId: string, name: string) => void
  onClose: () => void
}) {
  const isPair = PAIR_KINDS.includes(props.kind)
  return (
    <ServerDetailTable
      title={props.title}
      subtitle="Rows share the overview filters, scope and definitions"
      fetchPage={(p) => leaveApi.reports.paymentCategory(props.kind, p)}
      columns={isPair ? paymentPairColumns(props.openHistory) : paymentCaseColumns(props.openHistory)}
      baseParams={props.rangeParams}
      filterKey={props.filterKey}
      defaultSort={isPair ? undefined : 'created_at'}
      onClose={props.onClose}
    />
  )
}

function ClickableCard({ title, onOpen, disabled, children }: { title: string; onOpen: () => void; disabled?: boolean; children: React.ReactNode }) {
  if (disabled) return <>{children}</>
  return (
    <div onClick={onOpen} title={title} className="cursor-pointer rounded-2xl transition hover:ring-2 hover:ring-teal-600/40 focus:outline-none" role="button" tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onOpen() }}>
      {children}
    </div>
  )
}

/**
 * Statistic breakdown as a real table: share columns, optional row
 * drill-down, and pagination for longer lists (mockup requirement —
 * these lists used to be rows of ghost buttons under the chart).
 */
function BreakdownTable(props: {
  rows: any[]
  rowKey: (row: any) => string
  columns: { key: string; label: string; align?: 'right'; render: (row: any) => React.ReactNode }[]
  onRowClick?: (row: any) => void
  pageSize?: number
}) {
  const pageSize = props.pageSize ?? 5
  const pg = usePaged(props.rows, pageSize)
  return (
    <div className="mt-3 rounded-xl border border-border overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="text-[11px] uppercase tracking-wider text-muted-foreground bg-muted/50">
              {props.columns.map((c) => (
                <th key={c.key} className={cn('py-2.5 px-3 font-semibold', c.align === 'right' && 'text-right')}>{c.label}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {pg.items.length === 0 ? (
              <tr>
                <td colSpan={props.columns.length} className="py-5 px-3 text-[12px] text-muted-foreground">
                  No rows in the active range.
                </td>
              </tr>
            ) : pg.items.map((row) => (
              <tr
                key={props.rowKey(row)}
                onClick={props.onRowClick ? () => props.onRowClick?.(row) : undefined}
                className={cn('text-[13px]', props.onRowClick && 'cursor-pointer hover:bg-accent/60 transition')}
              >
                {props.columns.map((c) => (
                  <td key={c.key} className={cn('py-2.5 px-3', c.align === 'right' && 'text-right')}>{c.render(row)}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {props.rows.length > pageSize && (
        <Pagination page={pg.page} pageSize={pg.size} total={pg.total} onPage={pg.setPage} onPageSize={pg.setSize} pageSizeOptions={[5, 10, 20]} />
      )}
    </div>
  )
}

function FindingCard({ tag, text, tone }: { tag: string; text: string; tone: 'teal' | 'amber' | 'emerald' | 'rose' | 'sky' }) {
  const tones = {
    teal: 'bg-teal-700/10 text-teal-700 dark:text-teal-300',
    amber: 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300',
    emerald: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300',
    rose: 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300',
    sky: 'bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300',
  }
  return (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
      <span className={cn('inline-block rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide', tones[tone])}>{tag}</span>
      <p className="mt-2 text-[13px] text-foreground leading-snug">{text}</p>
    </div>
  )
}

interface DetailColumn {
  key: string
  label: string
  sortable?: boolean
  render: (row: any) => React.ReactNode
}

/**
 * Server-driven detail table: search, whitelisted sorting and pagination all
 * execute on the backend. Totals come from response meta, never from the
 * loaded page. A 403/422 renders a locked panel instead of toast-spam.
 */
function ServerDetailTable(props: {
  title: string
  subtitle?: string
  fetchPage: (params: ReportFilters) => Promise<ReportPage<any>>
  columns: DetailColumn[]
  baseParams: ReportFilters
  filterKey: string
  defaultSort?: string
  defaultDir?: 'asc' | 'desc'
  onClose: () => void
  /** Inline usage (e.g. Overview request detail) hides the close button. */
  hideClose?: boolean
}) {
  const [page, setPage] = useState(1)
  const [perPage, setPerPage] = useState(10)
  const [search, setSearch] = useState('')
  const [appliedSearch, setAppliedSearch] = useState('')
  const [sort, setSort] = useState<string | undefined>(props.defaultSort)
  const [dir, setDir] = useState<'asc' | 'desc'>(props.defaultDir ?? 'desc')
  const [rows, setRows] = useState<any[]>([])
  const [meta, setMeta] = useState<ReportPageMeta | null>(null)
  const [loading, setLoading] = useState(true)
  const [denied, setDenied] = useState(false)

  useEffect(() => {
    setPage(1)
    setAppliedSearch('')
  }, [props.filterKey])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setDenied(false)
    props
      .fetchPage({ ...props.baseParams, page, per_page: perPage, ...(appliedSearch ? { search: appliedSearch } : {}), ...(sort ? { sort, direction: dir } : {}) })
      .then((r) => {
        if (cancelled) return
        setRows(r.data)
        setMeta(r.meta)
        setLoading(false)
      })
      .catch((e) => {
        if (cancelled) return
        setLoading(false)
        if (e instanceof ApiError && (e.status === 403 || e.status === 422)) setDenied(true)
      })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, perPage, appliedSearch, sort, dir, props.filterKey])

  const toggleSort = (key: string) => {
    if (sort === key) {
      setDir(dir === 'asc' ? 'desc' : 'asc')
    } else {
      setSort(key)
      setDir('desc')
    }
    setPage(1)
  }

  if (denied) {
    return (
      <Panel title={props.title} subtitle="Access refused by the server.">
        <div className="flex items-start gap-3">
          <Lock className="w-5 h-5 text-muted-foreground mt-0.5" />
          <div className="min-w-0 flex-1">
            <p className="text-[12px] text-muted-foreground leading-relaxed">Your capabilities do not cover this detail view. Nothing is shown rather than partial data.</p>
            <div className="mt-3"><Btn variant="outline" onClick={props.onClose}>Back to summary</Btn></div>
          </div>
        </div>
      </Panel>
    )
  }

  return (
    <Panel
      title={props.title}
      subtitle={`${props.subtitle ?? ''}${meta ? ` · ${meta.total} row${meta.total === 1 ? '' : 's'} total` : ''}`}
      actions={
        props.hideClose ? undefined : (
          <Btn variant="outline" onClick={props.onClose}>
            <X className="w-3.5 h-3.5" /> Close detail
          </Btn>
        )
      }
    >
      <form
        className="flex flex-wrap items-center gap-2 mb-3"
        onSubmit={(e) => {
          e.preventDefault()
          setAppliedSearch(search.trim())
          setPage(1)
        }}
      >
        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search reference or name…"
            className="h-8 rounded-lg border border-input bg-card pl-8 pr-2 text-[12px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/40"
          />
        </div>
        <Btn variant="outline" onClick={() => { setAppliedSearch(search.trim()); setPage(1) }}>Search</Btn>
        {appliedSearch && (
          <Btn variant="ghost" onClick={() => { setSearch(''); setAppliedSearch(''); setPage(1) }}>Clear</Btn>
        )}
        <span className="ml-auto flex items-center gap-2 text-[11px] text-muted-foreground">
          Rows
          <select
            value={perPage}
            onChange={(e) => { setPerPage(Number(e.target.value)); setPage(1) }}
            className="h-8 rounded-lg border border-input bg-card px-2 text-[12px] text-foreground"
          >
            {[10, 20, 50].map((n) => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
        </span>
      </form>
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="text-[11px] uppercase tracking-wider text-muted-foreground">
              {props.columns.map((c) => (
                <th key={c.key} className="py-3 px-3 font-semibold">
                  {c.sortable ? (
                    <button
                      type="button"
                      onClick={() => toggleSort(c.key)}
                      className="inline-flex items-center gap-1 hover:text-foreground"
                      title={`Sort by ${c.label}`}
                    >
                      {c.label}
                      <span className="text-[10px]">{sort === c.key ? (dir === 'asc' ? '▲' : '▼') : '△'}</span>
                    </button>
                  ) : (
                    c.label
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {loading ? (
              <tr><td colSpan={props.columns.length} className="py-6 px-3 text-[12px] text-muted-foreground">Loading detail rows…</td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={props.columns.length} className="py-6 px-3 text-[12px] text-muted-foreground">No rows match the active filters.</td></tr>
            ) : (
              rows.map((row, i) => (
                <tr key={row.id ?? row.ref ?? i} className="text-[13px] align-middle">
                  {props.columns.map((c) => (
                    <td key={c.key} className="py-3 px-3">{c.render(row)}</td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      {meta && (
        <div className="flex flex-wrap items-center gap-2 mt-3 text-[12px] text-muted-foreground">
          <span>
            Page {meta.current_page} of {meta.last_page} · {meta.total} row{meta.total === 1 ? '' : 's'}
            {meta.from != null && meta.to != null ? ` (showing ${meta.from}–${meta.to})` : ''}
          </span>
          <span className="ml-auto flex items-center gap-2">
            <Btn variant="outline" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={meta.current_page <= 1}>
              <ChevronLeft className="w-3.5 h-3.5" /> Prev
            </Btn>
            <Btn variant="outline" onClick={() => setPage((p) => Math.min(meta.last_page, p + 1))} disabled={meta.current_page >= meta.last_page}>
              Next <ChevronRight className="w-3.5 h-3.5" />
            </Btn>
          </span>
        </div>
      )}
    </Panel>
  )
}

function personCell(name: string | undefined, id: string | undefined, onOpen?: () => void) {
  return (
    <div className="flex items-center gap-2">
      {id ? <Avatar id={id} size="sm" /> : null}
      {onOpen && id ? (
        <button type="button" onClick={onOpen} className="font-medium text-foreground hover:underline text-left" title="Open history">
          {name ?? id}
        </button>
      ) : (
        <span className="font-medium text-foreground whitespace-nowrap">{name ?? id ?? '—'}</span>
      )}
    </div>
  )
}

function money(n: number | null | undefined, currency?: string | null): string {
  if (n === null || n === undefined) return '—'
  return `${Number(n).toLocaleString()}${currency ? ` ${currency}` : ''}`
}