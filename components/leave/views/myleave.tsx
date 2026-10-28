'use client'

import { useState } from 'react'
import { CalendarClock, CalendarRange, Wallet, Sparkles, Sun, Snowflake, TrendingUp, History } from 'lucide-react'
import { cn } from '@/lib/utils'
import { TODAY, addDays, fmtShort, fmt, statusLabel, policyEffectiveAt, tenureMonths, type LeaveRequest, type Status } from '@/lib/leave'
import { useLeave } from '@/components/leave/leave-context'
import {
  Avatar,
  StatusPill,
  TypePill,
  SectionHeading,
  Panel,
  EmptyState,
  TableToolbar,
  StatCard,
  Pagination,
  usePaged,
  Tabs,
  Modal,
} from '@/components/leave/shared'
import { RequestDetail } from '@/components/leave/request-detail'

export function MyLeaveView() {
  const { employee, employeeId, requests, leaveTypes, policies, typeOf, balanceFor, eligibility, orgEligibility, annualTypeId } = useLeave()
  const [tab, setTab] = useState('upcoming')
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('all')
  const [from, setFrom] = useState(TODAY)
  const [to, setTo] = useState(addDays(TODAY, 365))
  const [selected, setSelected] = useState<LeaveRequest | null>(null)

  const mine = requests.filter((r) => r.employeeId === employeeId)

  const upcoming = mine
    .filter((r) => r.status === 'approved' && r.endDate >= TODAY)
    .sort((a, b) => a.startDate.localeCompare(b.startDate))

  const filtered = upcoming.filter((r) => {
    if (typeFilter !== 'all' && r.leaveTypeId !== typeFilter) return false
    if (r.startDate > to) return false
    if (r.endDate < from) return false
    const q = search.trim().toLowerCase()
    if (!q) return true
    return r.ref.toLowerCase().includes(q) || (typeOf(r.leaveTypeId)?.name.toLowerCase().includes(q) ?? false)
  })
  const paged = usePaged(filtered, 8)

  const pastLeaves = mine
    .filter((r) => r.status === 'approved' && r.endDate < TODAY)
    .sort((a, b) => b.endDate.localeCompare(a.endDate))
  const pastPaged = usePaged(pastLeaves, 5)

  const bookedDays = upcoming.reduce((s, r) => s + r.days, 0)
  const next = upcoming[0]

  const history = pastLeaves
  const histFrom = history.reduce((s, r) => s + r.days, 0)

  return (
    <div className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      <SectionHeading
        title="My leave plan"
        subtitle={`${employee.name} — upcoming approved leave, eligibility and history.`}
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard icon={CalendarRange} label="Upcoming leaves" value={upcoming.length} hint="Approved future absences" tone="teal" />
        <StatCard icon={Sun} label="Days booked ahead" value={bookedDays} hint="Across all upcoming leaves" tone="amber" />
        <StatCard icon={Snowflake} label="Closest leave" value={next ? fmtShort(next.startDate) : '—'} hint={next ? `${typeOf(next.leaveTypeId)?.name ?? 'Leave'}` : 'Nothing planned'} tone="sky" />
        <StatCard icon={Wallet} label="Annual balance" value={`${balanceFor(employeeId, annualTypeId).remaining}d`} hint="Annual leave remaining" tone="emerald" />
      </div>

      <Tabs
        tabs={[
          { value: 'upcoming', label: 'Upcoming approved leave', icon: CalendarRange, badge: upcoming.length },
          { value: 'plan', label: 'Eligibility & balances', icon: Wallet },
          { value: 'history', label: 'Leave history', icon: History, badge: pastLeaves.length },
        ]}
        value={tab}
        onChange={setTab}
      />

      {tab === 'upcoming' && (
        <Panel>
          <TableToolbar
            search={search}
            onSearch={setSearch}
            placeholder="Search reference or leave type…"
            count={filtered.length}
            filters={[
              {
                label: 'Leave type',
                value: typeFilter,
                onChange: setTypeFilter,
                options: [{ value: 'all', label: 'All types' }, ...leaveTypes.map((lt) => ({ value: lt.id, label: lt.name }))],
              },
            ]}
          />
          <div className="flex flex-wrap items-center gap-3 px-5 pt-3">
            <label className="flex items-center gap-2 text-[11px] font-semibold text-muted-foreground">
              Starts from
              <input
                type="date"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
                className="h-8 rounded-lg border border-input bg-card px-2 text-[12px] text-foreground focus:outline-none focus:ring-2 focus:ring-ring/40"
              />
            </label>
            <label className="flex items-center gap-2 text-[11px] font-semibold text-muted-foreground">
              Ends by
              <input
                type="date"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                className="h-8 rounded-lg border border-input bg-card px-2 text-[12px] text-foreground focus:outline-none focus:ring-2 focus:ring-ring/40"
              />
            </label>
            {(from !== TODAY || to !== addDays(TODAY, 365)) && (
              <button
                type="button"
                onClick={() => { setFrom(TODAY); setTo(addDays(TODAY, 365)) }}
                className="text-[11px] font-semibold text-teal-700 dark:text-teal-300 hover:underline"
              >
                Reset range
              </button>
            )}
          </div>
          {paged.items.length === 0 ? (
            <EmptyState title="No upcoming leave" hint="Approved leaves starting before the To date will appear here." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="text-[11px] uppercase tracking-wider text-muted-foreground">
                    <th className="py-3 px-5 font-semibold">Leave type</th>
                    <th className="py-3 px-3 font-semibold">Reference</th>
                    <th className="py-3 px-3 font-semibold">Period</th>
                    <th className="py-3 px-3 font-semibold">Days</th>
                    <th className="py-3 px-3 font-semibold">Status</th>
                    <th className="py-3 px-3 font-semibold hidden md:table-cell">Reason</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {paged.items.map((r) => (
                    <tr
                      key={r.id}
                      onClick={() => setSelected(r)}
                      title={`${r.ref} — view detail and letter`}
                      className="text-[13px] align-middle cursor-pointer hover:bg-accent/40"
                    >
                      <td className="py-2.5 px-5"><TypePill leaveTypeId={r.leaveTypeId} showName /></td>
                      <td className="py-2.5 px-3 font-mono text-muted-foreground whitespace-nowrap">{r.ref}</td>
                      <td className="py-2.5 px-3 text-muted-foreground whitespace-nowrap">{fmt(r.startDate)} → {fmt(r.endDate)}</td>
                      <td className="py-2.5 px-3 font-semibold tabular-nums">{r.days}</td>
                      <td className="py-2.5 px-3"><StatusPill status={r.status as Status} /></td>
                      <td className="py-2.5 px-3 text-muted-foreground hidden md:table-cell max-w-[220px] truncate">{r.reason}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <Pagination page={paged.page} pageSize={paged.size} total={paged.total} onPage={paged.setPage} onPageSize={paged.setSize} />
        </Panel>
      )}

      {tab === 'plan' && (
        <Panel title="Eligibility & balances" subtitle={`${employee.name} — ${employee.title}`} icon={Sparkles}>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
            <div className="rounded-xl border border-border bg-warm dark:bg-muted/30 px-3 py-2">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Eligible leave types</p>
              <p className="text-[18px] font-bold text-foreground">{eligibility.filter((e) => e.eligible).length}<span className="text-[12px] font-normal text-muted-foreground"> / {eligibility.length}</span></p>
            </div>
            <div className="rounded-xl border border-border bg-warm dark:bg-muted/30 px-3 py-2">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Organisation-wide</p>
              <p className="text-[18px] font-bold text-foreground">{orgEligibility?.total_eligible ?? '—'}<span className="text-[12px] font-normal text-muted-foreground"> / {orgEligibility?.total_employees ?? '—'} employees</span></p>
            </div>
            <div className="rounded-xl border border-border bg-warm dark:bg-muted/30 px-3 py-2">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Your tenure</p>
              <p className="text-[18px] font-bold text-foreground">{tenureMonths(employee.hireDate)} months</p>
            </div>
          </div>
          <ul className="space-y-2">
            {leaveTypes.map((lt) => {
              const srv = eligibility.find((e) => e.leave_type_id === lt.id)
              const pol = policyEffectiveAt(lt.id, TODAY, policies)
              const bal = balanceFor(employeeId, lt.id)
              return (
                <li key={lt.id} className={cn('rounded-xl border px-3 py-2.5', srv?.eligible ? 'border-border' : 'border-dashed border-amber-300 dark:border-amber-800')}>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[12px] font-semibold text-foreground flex items-center gap-2">
                      <span className={cn('h-2 w-2 rounded-full', lt.color)} />
                      {lt.short} {srv && !srv.eligible && <span className="text-[9px] uppercase tracking-wider font-bold text-amber-600 dark:text-amber-400">ineligible</span>}
                    </span>
                    <span className="text-[10px] font-mono text-muted-foreground tabular-nums">{bal.used}/{bal.accrued} used</span>
                  </div>
                  <div className="mt-1.5">
                    <div className="h-1.5 rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden">
                      <div className={cn('h-full rounded-full', lt.color)} style={{ width: `${Math.min(100, bal.pct)}%` }} />
                    </div>
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-1.5">
                    {srv?.eligible
                      ? `${bal.remaining} day${bal.remaining === 1 ? '' : 's'} remaining · max ${srv.max_days_per_request}d per request · notice ${srv.min_notice_days}d`
                      : srv?.blockers?.length
                        ? srv.blockers.join('; ')
                        : `Needs ${pol?.minTenureMonths ?? '—'} months tenure`}
                  </p>
                </li>
              )
            })}
          </ul>
          <p className="text-[11px] text-muted-foreground mt-3 flex items-center gap-1.5">
            <TrendingUp className="w-3.5 h-3.5" /> Balances update automatically as approvals pass. Return dates are set by the approver when leave is granted.
          </p>
        </Panel>
      )}

      {tab === 'history' && (
        <Panel title="Leave history" subtitle={`${pastLeaves.length} completed leave(s) · ${histFrom} days taken`}>
          {pastPaged.items.length === 0 ? (
            <EmptyState compact title="No past leaves on record" hint="Completed and approved leaves will appear here." />
          ) : (
            <>
              <ul className="space-y-2">
                {pastPaged.items.map((r) => (
                  <li
                    key={r.id}
                    onClick={() => setSelected(r)}
                    title={`${r.ref} — view detail and letter`}
                    className="flex items-center gap-3 rounded-xl border border-border bg-warm dark:bg-muted/30 px-3 py-2.5 cursor-pointer hover:bg-accent/40"
                  >
                    <span className={cn('h-2.5 w-2.5 rounded-full shrink-0', typeOf(r.leaveTypeId)?.color ?? 'bg-zinc-400')} />
                    <div className="min-w-0 flex-1">
                      <p className="text-[12px] font-semibold text-foreground truncate">{typeOf(r.leaveTypeId)?.name}</p>
                      <p className="text-[10px] text-muted-foreground truncate">{fmt(r.startDate)} → {fmt(r.endDate)} · {r.days}d · {r.ref}</p>
                    </div>
                    <StatusPill status={r.status as Status} />
                  </li>
                ))}
              </ul>
              <Pagination page={pastPaged.page} pageSize={pastPaged.size} total={pastPaged.total} onPage={pastPaged.setPage} onPageSize={pastPaged.setSize} />
            </>
          )}
        </Panel>
      )}

      <Modal
        open={selected !== null}
        onClose={() => setSelected(null)}
        title={selected ? `Ombi — ${selected.ref}` : 'Ombi'}
        subtitle={
          selected
            ? `${typeOf(selected.leaveTypeId)?.name ?? ''} · ${selected.days ?? '—'} siku · hali: ${selected.status.replace(/_/g, ' ')}`
            : ''
        }
        size="xl"
      >
        {selected && <RequestDetail request={selected} />}
      </Modal>
    </div>
  )
}