'use client'

import { useState, type ComponentType } from 'react'
import {
  ArrowRight,
  Check,
  Lock,
  Wallet,
  FileText,
  Users,
  Clock,
  AlertTriangle,
  Shield,
  Plus,
  Info,
  Eye,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  EMPLOYEES,
  TODAY,
  addDays,
  fmtShort,
  balanceOf,
  policyEffectiveAt,
  recommendationsFor,
  getLeaveType,
  type Status,
  type LeaveRequest,
} from '@/lib/leave'
import { useLeave } from '@/components/leave/leave-context'
import { StatusPill, Avatar, TypePill, SectionHeading, Panel, EmptyState, RowMenu, Modal, Pagination, usePaged } from '@/components/leave/shared'
import { RequestDetail } from '@/components/leave/request-detail'

const TIP_ICONS: Record<string, ComponentType<{ className?: string }>> = {
  check: Check,
  lock: Lock,
  wallet: Wallet,
  file: FileText,
  users: Users,
  clock: Clock,
  alert: AlertTriangle,
  shield: Shield,
}

const TIP_TONE: Record<string, string> = {
  ok: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-900',
  warn: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-900',
  info: 'bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950 dark:text-sky-300 dark:border-sky-900',
  danger: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950 dark:text-rose-300 dark:border-rose-900',
}

export function DashboardView({ onNavigate }: { onNavigate?: (v: string) => void }) {
  const { employee, employeeId, requests, supervisorMode, can, policies } = useLeave()
  const [detail, setDetail] = useState<LeaveRequest | null>(null)

  const zoneName = employee.zoneId === 'z4' ? 'Pemba Coordination' : employee.zoneId === 'z1' ? 'Headquarters' : 'Regional'
  const monthly = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ][new Date('2026-09-09').getMonth()]

  const starred = ['lt1', 'lt2', 'lt5', 'lt3']
  const balances = starred.map((id) => ({ id, bal: balanceOf(employeeId, id, requests) }))

  const myRequests = requests
    .filter((r) => r.employeeId === employeeId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))

  const historyPaged = usePaged(myRequests, 6)

  const active = myRequests.filter((r) => r.status === 'approved' || r.status === 'under_review')
  const tips = recommendationsFor(employee, 'lt1', requests)
  const taskCount = requests.filter(
    (r) => supervisorMode || r.steps.some((s) => s.status === 'pending' && s.assigneeId === employeeId),
  ).length

  const annualPolicy = policyEffectiveAt('lt1', TODAY, policies)
  const annualBal = balanceOf(employeeId, 'lt1', requests)
  const minNotice = annualPolicy?.minNoticeDays ?? 14
  const earliestEligible = addDays(TODAY, minNotice)

  return (
    <div className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-[13px] text-muted-foreground">
            {monthly} 2026 · {zoneName} · {supervisorMode ? 'Supervisor view' : 'Employee view'}
          </p>
          <h1 className="font-serif text-[26px] font-semibold tracking-tight text-foreground leading-tight mt-1">
            Karibu, {employee.name.split(' ')[0]} 👋
          </h1>
        </div>
        <button
          onClick={() => onNavigate?.('requests')}
          className="inline-flex items-center gap-1.5 rounded-full bg-teal-700 text-white text-[13px] font-semibold px-4 py-2 shadow-sm shadow-teal-700/20 hover:bg-teal-800 transition"
        >
          <Plus className="w-3.5 h-3.5" />
          New Leave Request
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 space-y-5">
          <div>
            <SectionHeading title="Leave balances" subtitle="Your entitlements for the 2026 leave year — updated automatically from policy and approvals." />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {balances.map(({ id, bal }) => {
                const lt = getLeaveType(id)
                return (
                  <div key={id} className="rounded-2xl border border-border bg-card p-4 shadow-sm hover:border-teal-200 transition-colors">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <span className={cn('h-2.5 w-2.5 rounded-full', lt.color)} />
                        <div>
                          <p className="text-[14px] font-semibold text-foreground leading-none">{lt.swahili}</p>
                          <p className="text-[11px] text-muted-foreground mt-0.5">{lt.name}</p>
                        </div>
                      </div>
                      <span className={cn('text-[11px] font-semibold rounded-full border px-2 py-0.5', lt.paid ? 'text-emerald-600 border-emerald-200 bg-emerald-50 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-900' : 'text-zinc-500 border-zinc-200 bg-zinc-50 dark:bg-zinc-800 dark:text-zinc-400 dark:border-zinc-700')}>
                        {lt.paid ? 'Paid' : 'Unpaid'}
                      </span>
                    </div>
                    <div className="flex items-end gap-2 mb-2">
                      <span className="font-serif text-[32px] font-semibold leading-none text-foreground">
                        {bal.remaining}
                      </span>
                      <span className="text-[12px] text-muted-foreground mb-0.5">
                        of {bal.accrued} days · {bal.used} used
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-muted overflow-hidden">
                      <div
                        className={cn('h-full rounded-full', lt.color)}
                        style={{ width: `${Math.max(4, bal.pct)}%` }}
                      />
                    </div>
                    {bal.remaining === 0 && bal.accrued > 0 && (
                      <p className="text-[11px] text-rose-600 dark:text-rose-400 mt-2 font-medium">Balance exhausted — apply after next accrual.</p>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          <Panel
            title={supervisorMode ? 'Active requests across the office' : 'Your active requests'}
            subtitle="Approved or in review — auto-updated as new decisions land"
            actions={
              <button onClick={() => onNavigate?.('requests')} className="inline-flex items-center gap-1 text-[12px] font-semibold text-teal-700 dark:text-teal-300 hover:underline">
                View all <ArrowRight className="w-3 h-3" />
              </button>
            }
          >
            {active.length === 0 ? (
              <EmptyState title="No active leave requests" hint="New submissions will appear here with their live approval status." />
            ) : (
              <div className="space-y-3">
                {active.slice(0, 4).map((r) => (
                  <div key={r.id} className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-warm dark:bg-muted/30 px-4 py-3">
                    <Avatar id={r.employeeId} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <TypePill leaveTypeId={r.leaveTypeId} showName />
                        <StatusPill status={r.status as Status} />
                      </div>
                      <p className="text-[12px] text-muted-foreground mt-1 truncate">
                        {fmtShort(r.startDate)} → {fmtShort(r.endDate)} · {r.days} day{r.days === 1 ? '' : 's'} · {r.ref}
                      </p>
                    </div>
                    <div className="flex -space-x-1.5">
                      {r.steps
                        .filter((s) => s.status === 'pending')
                        .slice(0, 3)
                        .map((s) => (
                          <span key={s.order} title={s.roleLabel} className="rounded-full border-2 border-card">
                            <Avatar id={s.assigneeId} size="sm" />
                          </span>
                        ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Panel>

          <div>
            <SectionHeading title="Request history" subtitle="Immutable records — corrections create new versions, never deletions." />
            <Panel>
              <div className="overflow-x-auto">
                <table className="w-full text-left min-w-[640px]">
                  <thead>
                    <tr className="text-[11px] uppercase tracking-wider text-muted-foreground">
                      <th className="py-3 px-5 font-semibold">Reference</th>
                      <th className="py-3 px-3 font-semibold">Type</th>
                      <th className="py-3 px-3 font-semibold">Dates</th>
                      <th className="py-3 px-3 font-semibold">Days</th>
                      <th className="py-3 px-3 font-semibold">Status</th>
                      <th className="py-3 px-3 font-semibold">Submitted</th>
                      <th className="py-3 px-3 font-semibold w-10"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {historyPaged.items.map((r) => (
                      <tr key={r.id} className="text-[13px]">
                        <td className="py-2.5 px-5 font-mono text-muted-foreground">{r.ref}</td>
                        <td className="py-2.5 px-3"><TypePill leaveTypeId={r.leaveTypeId} /></td>
                        <td className="py-2.5 px-3 text-muted-foreground tabular-nums">{fmtShort(r.startDate)} → {fmtShort(r.endDate)}</td>
                        <td className="py-2.5 px-3 font-semibold tabular-nums">{r.days}</td>
                        <td className="py-2.5 px-3"><StatusPill status={r.status as Status} /></td>
                        <td className="py-2.5 px-3 text-muted-foreground">{fmtShort(r.createdAt)}</td>
                        <td className="py-2.5 px-3">
                          <RowMenu items={[{ icon: Eye, label: 'View request', onClick: () => setDetail(r) }]} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <Pagination page={historyPaged.page} pageSize={historyPaged.size} total={historyPaged.total} onPage={historyPaged.setPage} onPageSize={historyPaged.setSize} />
            </Panel>
          </div>
        </div>

        <div className="space-y-5">
          <div className={cn('rounded-2xl p-5 shadow-lg', annualBal.remaining > 0 ? 'bg-gradient-to-br from-teal-700 to-emerald-700 text-white shadow-teal-700/20' : 'bg-gradient-to-br from-amber-600 to-orange-600 text-white shadow-amber-700/20')}>
            <div className="flex items-center gap-2 mb-3">
              <span className={cn('h-2 w-2 rounded-full animate-pulse', annualBal.remaining > 0 ? 'bg-emerald-300' : 'bg-amber-200')} />
              <p className="text-[11px] uppercase tracking-[0.14em] text-white/80 font-semibold">Suggested next leave</p>
            </div>
            {annualBal.remaining > 0 ? (
              <>
                <p className="font-serif text-[20px] font-semibold leading-snug">
                  You are eligible to apply for annual leave from <span className={cn(annualBal.remaining > 0 ? 'text-emerald-200' : 'text-amber-100')}>{fmtShort(earliestEligible)}</span>.
                </p>
                <p className="text-[12px] text-white/85 mt-2 leading-relaxed">
                  Minimum notice is {minNotice} days. Your remaining balance: {annualBal.remaining} days.
                </p>
              </>
            ) : annualBal.accrued > 0 ? (
              <>
                <p className="font-serif text-[20px] font-semibold leading-snug">
                  Annual balance for this service year is fully used.
                </p>
                <p className="text-[12px] text-white/85 mt-2 leading-relaxed">
                  You have used {annualBal.used} of {annualBal.accrued} accrued days. Your entitlement accrues again on your next service-year anniversary.
                </p>
              </>
            ) : (
              <>
                <p className="font-serif text-[20px] font-semibold leading-snug">
                  No accrued annual leave yet.
                </p>
                <p className="text-[12px] text-white/85 mt-2 leading-relaxed">
                  Leave accrues proportionally across each service year. Track progress on the My Leave view.
                </p>
              </>
            )}
            <button
              onClick={() => onNavigate?.('requests')}
              className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white text-[12px] font-semibold px-3.5 py-2 backdrop-blur transition"
            >
              Start an application <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <Panel
            title="Policy recommendations"
            subtitle="Transparent, rule-based guidance — no decisions are made automatically"
          >
            <div className="space-y-2.5">
              {tips.map((tip, i) => {
                const Icon = TIP_ICONS[tip.icon] || Info
                return (
                  <div key={i} className={cn('flex items-start gap-2.5 rounded-xl border px-3 py-2.5', TIP_TONE[tip.tone])}>
                    <Icon className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    <p className="text-[12px] leading-snug text-foreground/90">{tip.text}</p>
                  </div>
                )
              })}
            </div>
          </Panel>

          <Panel title="Office watch" subtitle={`${EMPLOYEES.length} staff across zones · ${taskCount} action${taskCount === 1 ? '' : 's'} pending`}>
            <div className="space-y-2.5">
              {requests
                .filter((r) => r.status === 'under_review' || r.status === 'submitted')
                .slice(0, 5)
                .map((r) => (
                  <button
                    key={r.id}
                    onClick={() => onNavigate?.('approvals')}
                    className="w-full flex items-center gap-3 rounded-xl border border-border bg-warm dark:bg-muted/30 px-3 py-2.5 hover:border-teal-300 transition"
                  >
                    <Avatar id={r.employeeId} size="sm" />
                    <div className="min-w-0 flex-1 text-left">
                      <p className="text-[12px] font-semibold text-foreground truncate">
                        {r.employeeId === employeeId ? 'You' : getEmployeeName(r.employeeId)} — {getLeaveType(r.leaveTypeId).short}
                      </p>
                      <p className="text-[11px] text-muted-foreground truncate">{fmtShort(r.startDate)} → {fmtShort(r.endDate)}</p>
                    </div>
                    <StatusPill status={r.status as Status} />
                  </button>
                ))}
            </div>
          </Panel>
        </div>
      </div>

      <Modal
        open={detail !== null}
        onClose={() => setDetail(null)}
        title={detail ? `${detail.ref} — application details` : 'Request details'}
        subtitle="Full application, documents and approval chain."
        size="lg"
      >
        {detail ? <RequestDetail request={detail} isHr={can('documents', 'view_medical_documents')} /> : null}
      </Modal>
    </div>
  )
}

function getEmployeeName(id: string): string {
  return EMPLOYEES.find((e) => e.id === id)?.name.split(' ')[0] ?? id
}