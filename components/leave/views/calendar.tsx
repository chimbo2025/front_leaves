'use client'

import { useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight, CalendarCheck, LogIn, LogOut, X, CalendarDays, ListChecks, CalendarRange } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  iso,
  TODAY,
  toDate,
  fmtShort,
  fmt,
  getEmployee,
  holidaysOn,
  staffingCheck,
  type LeaveRequest,
} from '@/lib/leave'
import { useLeave } from '@/components/leave/leave-context'
import {
  SectionHeading,
  Panel,
  EmptyState,
  TableToolbar,
  Modal,
  StatCard,
  Btn,
  Pagination,
  usePaged,
  Tabs,
} from '@/components/leave/shared'
import { RequestDetail } from '@/components/leave/request-detail'

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const WEEKDAY = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

export function CalendarView() {
  const { requests, leaveTypes, typeOf, canViewEmployee, allZones } = useLeave()
  // The calendar opens on the CURRENT month and follows the clock — no
  // pinned month anywhere. Everything "today" below derives from TODAY.
  const [cursor, setCursor] = useState(() => {
    const d = toDate(TODAY)
    return { y: d.getFullYear(), m: d.getMonth() }
  })
  const [tab, setTab] = useState('calendar')
  const [zoneFilter, setZoneFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('all')
  const [from, setFrom] = useState('2026-09-01')
  const [to, setTo] = useState('2026-09-30')
  const [detail, setDetail] = useState<LeaveRequest | null>(null)
  const [dayEvents, setDayEvents] = useState<{ date: string; events: LeaveRequest[] } | null>(null)

  const absences = requests.filter((r) => r.status === 'approved' || r.status === 'under_review')

  const cells = useMemo(() => {
    const first = new Date(cursor.y, cursor.m, 1)
    const startDow = (first.getDay() + 6) % 7
    const daysInMonth = new Date(cursor.y, cursor.m + 1, 0).getDate()
    const out: ({ date: string; dow: number } | null)[] = []
    for (let i = 0; i < startDow; i++) out.push(null)
    for (let d = 1; d <= daysInMonth; d++) {
      const date = new Date(cursor.y, cursor.m, d)
      out.push({ date: iso(date), dow: (date.getDay() + 6) % 7 })
    }
    return out
  }, [cursor])

  const move = (dir: -1 | 1) => {
    setCursor(({ y, m }) => {
      const next = new Date(y, m + dir, 1)
      return { y: next.getFullYear(), m: next.getMonth() }
    })
  }

  const eventsOn = (date: string): LeaveRequest[] =>
    absences.filter((r) => {
      if (zoneFilter !== 'all' && getEmployee(r.employeeId)?.zoneId !== zoneFilter) return false
      return r.startDate <= date && r.endDate >= date
    })

  const monthLabel = `${MONTHS[cursor.m]} ${cursor.y}`
  const monthStart = `${cursor.y}-${String(cursor.m + 1).padStart(2, '0')}-01`
  const monthEnd = `${cursor.y}-${String(cursor.m + 1).padStart(2, '0')}-31`

  const todayAbsences = eventsOn(TODAY)

  const approvedRecently = absences
    .filter((r) => r.status === 'approved')
    .sort((a, b) => (b.decidedAt ?? '').localeCompare(a.decidedAt ?? ''))
    .slice(0, 4)

  const startedToday = absences.filter((r) => r.startDate === '2026-09-09').slice(0, 4)
  const returnedToday = absences.filter((r) => r.endDate === '2026-09-09').slice(0, 4)

  const closestUpcoming = absences
    .filter((r) => r.status === 'approved' && r.endDate >= '2026-09-09')
    .sort((a, b) => a.startDate.localeCompare(b.startDate))[0]

  const filteredAbsences = absences.filter((r) => {
    if (typeFilter !== 'all' && r.leaveTypeId !== typeFilter) return false
    if (r.startDate > to) return false
    if (r.endDate < from) return false
    const q = search.trim().toLowerCase()
    if (!q) return true
        return getEmployee(r.employeeId)?.name.toLowerCase().includes(q) ?? false
  }).sort((a, b) => a.startDate.localeCompare(b.startDate))
  const paged = usePaged(filteredAbsences, 8)

  const dayCount = cursor.m === 8 ? 30 : 31
  const monthEvents = absences.filter((r) => r.startDate <= monthEnd && r.endDate >= monthStart)

  return (
    <div className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      <SectionHeading
        title="Leave calendar"
        subtitle="Absences by department and zone across the organisation. Click any day to see its events."
        actions={
          <select
            value={zoneFilter}
            onChange={(e) => setZoneFilter(e.target.value)}
            className="h-9 rounded-full border border-input bg-card px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring/40"
          >
            <option value="all">All zones</option>
            {allZones.map((z) => (
              <option key={z.id} value={z.id}>{z.name}</option>
            ))}
          </select>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard icon={CalendarCheck} label="Absences this month" value={monthEvents.length} hint={monthLabel} tone="teal" />
        <StatCard icon={LogIn} label="On leave today" value={todayAbsences.length} hint="Approved or in-review today" tone="amber" />
        <StatCard icon={LogOut} label="Returning today" value={returnedToday.length} hint="Back on duty" tone="emerald" />
        <StatCard icon={CalendarCheck} label="Days in month" value={dayCount} hint="Planning window" tone="sky" />
      </div>

      <Tabs
        tabs={[
          { value: 'calendar', label: 'Calendar', icon: CalendarDays, badge: monthEvents.length },
          { value: 'activity', label: 'Leave activity', icon: ListChecks },
          { value: 'selected', label: 'Selected absences', icon: CalendarRange, badge: filteredAbsences.length },
        ]}
        value={tab}
        onChange={setTab}
      />

      {tab === 'calendar' && (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <button onClick={() => move(-1)} className="h-9 w-9 rounded-full border border-border bg-card flex items-center justify-center hover:bg-accent transition">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <p className="font-serif text-[20px] font-semibold text-foreground">{monthLabel}</p>
              <button onClick={() => move(1)} className="h-9 w-9 rounded-full border border-border bg-card flex items-center justify-center hover:bg-accent transition">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              {leaveTypes.map((lt) => (
                <span key={lt.id} className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground">
                  <span className={cn('h-2 w-2 rounded-full', lt.color)} /> {lt.short}
                </span>
              ))}
            </div>
          </div>

          <Panel className="p-0 overflow-hidden rounded-2xl">
            <div className="grid grid-cols-7 border-b border-border bg-secondary/40">
              {WEEKDAY.map((d) => (
                <div key={d} className="py-2 text-center text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {d}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7 auto-rows-[minmax(72px,auto)]">
              {cells.map((cell, i) =>
                cell === null ? (
                  <div key={i} className="border-r border-b border-border bg-muted/20 min-h-[72px]" />
                ) : (
                  <button
                    key={i}
                    onClick={() => {
                      const evts = eventsOn(cell.date)
                      if (evts.length > 0) setDayEvents({ date: cell.date, events: evts })
                    }}
                    className={cn(
                      'border-r border-b border-border p-1.5 text-left transition hover:bg-accent/40',
                      (cell.dow === 5 || cell.dow === 6) && 'bg-muted/25',
                      eventsOn(cell.date).length > 0 && 'cursor-pointer',
                    )}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className={cn('text-[12px] font-semibold tabular-nums', holidaysOn(cell.date) ? 'text-rose-500' : 'text-foreground')}>
                        {Number(cell.date.slice(8))}
                        {cell.date === '2026-09-09' && (
                          <span className="ml-1 inline-block h-1.5 w-1.5 rounded-full bg-teal-600 align-middle" />
                        )}
                      </span>
                    </div>
                    {holidaysOn(cell.date) && (
                      <span className="block text-[9px] font-semibold text-rose-500 leading-tight mb-1 truncate">{holidaysOn(cell.date)}</span>
                    )}
                    <div className="flex flex-wrap gap-1">
                      {eventsOn(cell.date).slice(0, 4).map((r) => (
                        <span
                          key={r.id}
                          title={`${getEmployee(r.employeeId)?.name ?? r.employeeId} · ${typeOf(r.leaveTypeId)?.name}`}
                          className={cn('h-1.5 w-1.5 rounded-full', typeOf(r.leaveTypeId)?.color ?? 'bg-zinc-400')}
                        />
                      ))}
                      {eventsOn(cell.date).length > 4 && (
                        <span className="text-[8px] font-bold text-muted-foreground leading-3">+{eventsOn(cell.date).length - 4}</span>
                      )}
                    </div>
                    {staffingOn(cell.date).length > 0 && (
                      <span className="mt-1 inline-block rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 text-[8px] font-bold px-1.5 py-0.5">
                        Low cover
                      </span>
                    )}
                  </button>
                ),
              )}
            </div>
          </Panel>

          {closestUpcoming ? (
            <div className="rounded-2xl bg-gradient-to-br from-teal-700 to-emerald-700 text-white p-5 shadow-lg shadow-teal-700/20">
              <p className="text-[11px] uppercase tracking-[0.14em] text-teal-100 font-semibold mb-1">Closest upcoming leave</p>
              <p className="font-serif text-[18px] font-semibold leading-snug">
                {getEmployee(closestUpcoming.employeeId).name.split(' ')[0]} — {typeOf(closestUpcoming.leaveTypeId)?.short}
              </p>
              <p className="text-[12px] text-teal-100 mt-1.5 leading-relaxed">
                {fmtShort(closestUpcoming.startDate)} → {fmtShort(closestUpcoming.endDate)} · {closestUpcoming.days} days
              </p>
              <button
                type="button"
                onClick={() => setDetail(closestUpcoming)}
                className="mt-3 inline-flex items-center gap-1 rounded-full bg-white/10 hover:bg-white/20 text-white text-[11px] font-semibold px-3 py-1.5 backdrop-blur transition"
              >
                View absence
              </button>
            </div>
          ) : (
            <div className="rounded-2xl border border-border bg-card p-5">
              <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground font-semibold mb-1">Closest upcoming leave</p>
              <p className="text-[13px] text-muted-foreground">No approved future absences on the calendar yet.</p>
            </div>
          )}
        </>
      )}

      {tab === 'activity' && (
        <Panel title="Leave activity" subtitle="What just happened, who is off today, and who is back on duty" className="overflow-visible">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <ActivityColumn
              title="Just approved"
              icon={CalendarCheck}
              tone="teal"
              requests={approvedRecently}
              typeOf={typeOf}
              onOpen={setDetail}
              empty="No recent approvals."
            />
            <ActivityColumn
              title="Went on leave today"
              icon={LogIn}
              tone="amber"
              requests={startedToday}
              typeOf={typeOf}
              onOpen={setDetail}
              empty="No-one started leave today."
            />
            <ActivityColumn
              title="Returning today"
              icon={LogOut}
              tone="emerald"
              requests={returnedToday}
              typeOf={typeOf}
              onOpen={setDetail}
              empty="No-one returns to duty today."
            />
          </div>
        </Panel>
      )}

      {tab === 'selected' && (
        <Panel title="Selected absences" subtitle="Filter by an exact start/end range to plan coverage.">
          <TableToolbar
            search={search}
            onSearch={setSearch}
            placeholder="Search employee…"
            count={filteredAbsences.length}
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
              <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="h-8 rounded-lg border border-input bg-card px-2 text-[12px] text-foreground focus:outline-none focus:ring-2 focus:ring-ring/40" />
            </label>
            <label className="flex items-center gap-2 text-[11px] font-semibold text-muted-foreground">
              Ends by
              <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="h-8 rounded-lg border border-input bg-card px-2 text-[12px] text-foreground focus:outline-none focus:ring-2 focus:ring-ring/40" />
            </label>
            <Btn variant="ghost" onClick={() => { setFrom('2026-09-01'); setTo('2026-09-30'); setTypeFilter('all'); setSearch('') }}>
              Reset
            </Btn>
          </div>
          <div className="px-5 py-2">
            {paged.items.length === 0 ? (
              <EmptyState title="No absences in range" hint="Adjust the date range or filters." />
            ) : (
              <ul className="space-y-2">
                {paged.items.map((r) => (
                  <li key={r.id} className="flex items-center gap-3 rounded-xl border border-border bg-warm dark:bg-muted/30 px-3 py-2.5">
                    <span className={cn('h-2.5 w-2.5 rounded-full flex-shrink-0', typeOf(r.leaveTypeId)?.color ?? 'bg-zinc-400')} />
                    <div className="min-w-0 flex-1">
                      <p className="text-[13px] font-semibold text-foreground truncate">{getEmployee(r.employeeId)?.name ?? r.employeeId}</p>
                      <p className="text-[11px] text-muted-foreground">{typeOf(r.leaveTypeId)?.name} · {fmt(r.startDate)} → {fmt(r.endDate)} · {r.days}d</p>
                    </div>
                    <Btn variant="outline" onClick={() => setDetail(r)}>Details</Btn>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <Pagination page={paged.page} pageSize={paged.size} total={paged.total} onPage={paged.setPage} onPageSize={paged.setSize} />
        </Panel>
      )}

      <Modal
        open={detail !== null}
        onClose={() => setDetail(null)}
        title={detail ? `${detail.ref} — absence details` : 'Absence detail'}
        subtitle="Approved or in-review leave with approval chain."
        size="lg"
      >
        {detail ? <RequestDetail request={detail} isHr={false} /> : null}
      </Modal>

      <Modal
        open={dayEvents !== null}
        onClose={() => setDayEvents(null)}
        title={dayEvents ? `Absences on ${fmt(dayEvents.date)}` : 'Day events'}
        subtitle="Everyone on approved or in-review leave this day."
        size="md"
      >
        {dayEvents && (
          <div className="space-y-2">
            {dayEvents.events.map((r) => (
              <div key={r.id} className="flex items-center gap-3 rounded-xl border border-border bg-warm dark:bg-muted/30 px-3 py-2.5">
                <span className={cn('h-2.5 w-2.5 rounded-full flex-shrink-0', typeOf(r.leaveTypeId)?.color ?? 'bg-zinc-400')} />
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-semibold text-foreground truncate">{getEmployee(r.employeeId)?.name ?? r.employeeId}</p>
                  <p className="text-[11px] text-muted-foreground">{typeOf(r.leaveTypeId)?.name} · {fmtShort(r.startDate)} → {fmtShort(r.endDate)}</p>
                </div>
                <Btn variant="outline" onClick={() => { setDayEvents(null); setDetail(r) }}>
                  View
                </Btn>
              </div>
            ))}
          </div>
        )}
      </Modal>
    </div>
  )

  function staffingOn(date: string) {
    const zones = zoneFilter === 'all' ? allZones.filter((z) => z.isHQ || !z.isPemba) : allZones.filter((z) => z.id === zoneFilter)
    return zones
      .map((z) => ({ zone: z, ratio: staffingCheck(z.id, date, absences) }))
      .filter((z) => z.ratio < 0.55)
  }
}

function ActivityColumn({
  title,
  icon: Icon,
  tone,
  requests,
  typeOf,
  onOpen,
  empty,
}: {
  title: string
  icon: typeof CalendarCheck
  tone: 'teal' | 'amber' | 'emerald'
  requests: LeaveRequest[]
  typeOf: (id: string) => { name?: string; color?: string; short?: string } | undefined
  onOpen: (r: LeaveRequest) => void
  empty: string
}) {
  const iconTone = {
    teal: 'bg-teal-700/10 text-teal-700 dark:text-teal-300',
    amber: 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300',
    emerald: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300',
  }
  return (
    <div className="flex flex-col rounded-xl border border-border bg-warm dark:bg-muted/30 p-3">
      <div className="flex items-center gap-2 mb-3">
        <span className={cn('h-7 w-7 rounded-lg grid place-items-center', iconTone[tone])}>
          <Icon className="w-3.5 h-3.5" />
        </span>
        <p className="text-[12px] font-semibold text-foreground">{title}</p>
      </div>
      {requests.length === 0 ? (
        <p className="text-[11px] text-muted-foreground leading-snug">{empty}</p>
      ) : (
        <ul className="space-y-2">
          {requests.map((r) => (
            <li key={r.id} className="flex items-center gap-2.5 rounded-lg border border-border bg-card px-2.5 py-2">
              <span className={cn('h-2 w-2 rounded-full flex-shrink-0', typeOf(r.leaveTypeId)?.color ?? 'bg-zinc-400')} />
              <div className="min-w-0 flex-1">
                <p className="text-[12px] font-semibold text-foreground truncate">{getEmployee(r.employeeId)?.name.split(' ')[0] ?? r.employeeId} - {typeOf(r.leaveTypeId)?.short}</p>
                <p className="text-[10px] text-muted-foreground truncate">
                  {fmtShort(r.startDate)} → {fmtShort(r.endDate)}
                  {r.status === 'approved' && r.decidedAt && <span className="text-emerald-600"> · decided {fmtShort(r.decidedAt)}</span>}
                </p>
              </div>
              <button
                type="button"
                onClick={() => onOpen(r)}
                className="text-[11px] font-semibold text-teal-700 dark:text-teal-300 hover:underline shrink-0"
              >
                Open
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}