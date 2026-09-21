'use client'

import { useMemo, useState } from 'react'
import React from 'react'
import {
  Check,
  X,
  RotateCcw,
  ChevronDown,
  ChevronRight,
  Timer,
  Eye,
  ListChecks,
  ShieldCheck,
  Workflow,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  TODAY,
  fmtShort,
  fmt,
  getEmployee,
  dayCount,
  caseFor,
  pendingHandoversFor,
  type LeaveRequest,
  type Status,
  type StepStatus,
} from '@/lib/leave'
import { useLeave } from '@/components/leave/leave-context'
import {
  Avatar,
  StatusPill,
  TypePill,
  SectionHeading,
  Panel,
  EmptyState,
  DateChip,
  TableToolbar,
  RowMenu,
  Modal,
  StatCard,
  Btn,
  TextInput,
  TextArea,
  Pagination,
  usePaged,
  Tabs,
  type RowMenuItem,
} from '@/components/leave/shared'
import { RequestDetail } from '@/components/leave/request-detail'

const STEP_STYLE: Record<StepStatus, string> = {
  pending: 'border-border bg-warm dark:bg-muted/30',
  approved: 'border-emerald-200 bg-emerald-50 dark:bg-emerald-950 dark:border-emerald-900',
  rejected: 'border-rose-200 bg-rose-50 dark:bg-rose-950 dark:border-rose-900',
  returned: 'border-orange-200 bg-orange-50 dark:bg-orange-950 dark:border-orange-900',
  escalated: 'border-amber-200 bg-amber-50 dark:bg-amber-950 dark:border-amber-900',
  skipped: 'border-border bg-muted/40 opacity-60',
}

export function ApprovalsView({ onNavigate }: { onNavigate?: (v: string) => void }) {
  const { employee, employeeId, supervisorMode, requests, leaveTypes, cases, handovers, decide, typeOf, acceptHandover, can } = useLeave()
  const [openId, setOpenId] = useState<string | null>(null)
  const [tab, setTab] = useState('queue')
  const [comments, setComments] = useState<Record<string, string>>({})
  const [detail, setDetail] = useState<LeaveRequest | null>(null)
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('all')
  const [approveTarget, setApproveTarget] = useState<{ request: LeaveRequest; stepOrder: number } | null>(null)
  const [approveReturnDate, setApproveReturnDate] = useState(TODAY)
  const [approveComment, setApproveComment] = useState('')

  const nextStep = (r: LeaveRequest) => r.steps.find((s) => s.status === 'pending')
  const canApproveAny = can('requests', 'approve') || can('requests', 'approve_zone')
  const canApproveZone = can('requests', 'approve_zone')
  const canAct = (r: LeaveRequest) => {
    const assigned = r.steps.some((s) => s.status === 'pending' && s.assigneeId === employeeId)
    if (assigned) return true
    if (!supervisorMode || !canApproveAny) return false
    const sameZone = getEmployee(r.employeeId).zoneId === employee.zoneId
    return sameZone || canApproveZone
  }
  const pendingHoFor = (r: LeaveRequest) => {
    const c = caseFor(r.id, cases)
    return c ? pendingHandoversFor(c.id, handovers).find((h) => h.toOwnerId === employeeId) : undefined
  }

  const inFlight = useMemo(
    () =>
      requests.filter(
        (r) => r.status === 'submitted' || r.status === 'under_review' || r.status === 'returned_for_correction',
      ),
    [requests],
  )

  const myQueue = useMemo(() => {
    const q = inFlight.filter(
      (r) => supervisorMode || r.steps.some((s) => s.status === 'pending' && s.assigneeId === employeeId),
    )
    const filtered = q.filter((r) => {
      if (typeFilter !== 'all' && r.leaveTypeId !== typeFilter) return false
      const name = employeeName(r.employeeId).toLowerCase()
      const qs = search.trim().toLowerCase()
      return !qs || r.ref.toLowerCase().includes(qs) || name.includes(qs)
    })
    return filtered.sort((a, b) =>
      nextStep(a)!.dueAt.localeCompare(nextStep(b)!.dueAt),
    )
  }, [inFlight, supervisorMode, employeeId, typeFilter, search])

  const myQueueItems = usePaged(myQueue, 8)

  const filteredInFlight = inFlight.filter((r) => {
    if (typeFilter !== 'all' && r.leaveTypeId !== typeFilter) return false
    const q = search.trim().toLowerCase()
    if (!q) return true
    return r.ref.toLowerCase().includes(q) || employeeName(r.employeeId).toLowerCase().includes(q)
  })
  const pagedInFlight = usePaged(filteredInFlight, 8)

  const overdue = inFlight.filter((r) => (nextStep(r)?.dueAt ?? '9999-99-99') < TODAY).length
  const decided = requests.filter((r) => r.steps.some((s) => s.actedAt)).length

  const doDecide = (r: LeaveRequest, decision: 'approved' | 'rejected' | 'returned', endDate?: string, comment?: string) => {
    const step = nextStep(r)
    if (!step) return
    decide(r.id, step.order, decision, comment || comments[r.id] || '(no comment)', endDate)
    setComments((c) => ({ ...c, [r.id]: '' }))
  }

  const buildMenu = (r: LeaveRequest): RowMenuItem[] => {
    const items: RowMenuItem[] = []
    const ho = pendingHoFor(r)
    if (ho) {
      items.push({ icon: Check, label: 'Accept docket', onClick: () => acceptHandover(ho.id) })
    }
    items.push({ icon: Eye, label: 'View full details', onClick: () => setDetail(r) })
    if (canAct(r) && nextStep(r)) {
      items.push({ icon: Check, label: 'Approve', onClick: () => { const step = nextStep(r)!; setApproveTarget({ request: r, stepOrder: step.order }); setApproveReturnDate(r.startDate >= TODAY ? r.startDate : TODAY); setApproveComment('') } })
      items.push({ icon: RotateCcw, label: 'Return for correction', onClick: () => doDecide(r, 'returned') })
      items.push({ icon: X, label: 'Reject', tone: 'danger', onClick: () => doDecide(r, 'rejected') })
    }
    return items
  }

  return (
    <div className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      <SectionHeading
        title="Approvals"
        subtitle="Dynamic chains resolved from zone, department, role, leave type and duration. Every action is recorded with rule, role and timestamp."
        actions={
          <Btn variant="outline" onClick={() => onNavigate?.('workflows')}>
            <Workflow className="w-4 h-4" /> Configure workflows
          </Btn>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard icon={ListChecks} label="Awaiting my decision" value={myQueue.length} hint={supervisorMode ? 'All office steps' : 'Assigned to you'} tone="amber" />
        <StatCard icon={Timer} label="SLA overdue" value={overdue} hint="Escalating to next authority" tone="rose" />
        <StatCard icon={ShieldCheck} label="Steps acted so far" value={decided} hint="Across current requests" tone="teal" />
        <StatCard icon={Check} label="Deciding as" value={employee.name.split(' ')[0]} hint={supervisorMode ? `${employee.title} · supervisor mode` : employee.title} tone="emerald" />
      </div>

      <Tabs
        tabs={[
          { value: 'queue', label: 'Your approval queue', icon: ListChecks, badge: myQueue.length },
          { value: 'inflight', label: 'All in-flight chains', icon: ShieldCheck, badge: inFlight.length },
        ]}
        value={tab}
        onChange={setTab}
      />

      {tab === 'queue' && (
      <Panel
        title={supervisorMode ? 'All pending actions' : 'Your approval queue'}
        subtitle={`${myQueue.length} action${myQueue.length === 1 ? '' : 's'} awaiting a decision`}
      >
        <TableToolbar
          search={search}
          onSearch={setSearch}
          placeholder="Search reference or applicant…"
          count={myQueueItems.total}
          filters={[
            {
              label: 'Leave type',
              value: typeFilter,
              onChange: setTypeFilter,
              options: [{ value: 'all', label: 'All types' }, ...leaveTypes.map((lt) => ({ value: lt.id, label: lt.name }))],
            },
          ]}
        />
        {myQueueItems.items.length === 0 ? (
          <EmptyState title="You are all caught up" hint="Incoming submissions or escalated steps will appear here." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="text-[11px] uppercase tracking-wider text-muted-foreground">
                  <th className="py-3 px-5 font-semibold">Applicant</th>
                  <th className="py-3 px-3 font-semibold">Reference</th>
                  <th className="py-3 px-3 font-semibold">Leave type</th>
                  <th className="py-3 px-3 font-semibold">Start</th>
                  <th className="py-3 px-3 font-semibold">Proposed return</th>
                  <th className="py-3 px-3 font-semibold hidden lg:table-cell">Step</th>
                  <th className="py-3 px-3 font-semibold">SLA due</th>
                  <th className="py-3 px-3 font-semibold">Status</th>
                  <th className="py-3 px-3 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {myQueueItems.items.map((r) => {
                  const step = nextStep(r)!
                  const late = step.dueAt < TODAY
                  const ho = pendingHoFor(r)
                  return (
                    <tr key={r.id} className={cn('text-[13px] align-middle', late && 'bg-amber-50/40 dark:bg-amber-950/20')}>
                      <td className="py-3 px-5">
                        <div className="flex items-center gap-2.5">
                          <Avatar id={r.employeeId} size="sm" />
                          <span className="font-medium text-foreground">{employeeName(r.employeeId)}</span>
                        </div>
                      </td>
                      <td className="py-3 px-3 font-mono text-muted-foreground whitespace-nowrap">{r.ref}</td>
                      <td className="py-3 px-3"><TypePill leaveTypeId={r.leaveTypeId} showName /></td>
                      <td className="py-3 px-3 text-muted-foreground whitespace-nowrap">{fmtShort(r.startDate)}</td>
                      <td className="py-3 px-3 text-muted-foreground whitespace-nowrap">{r.endDate ? fmtShort(r.endDate) : <span className="text-[11px] text-sky-600 dark:text-sky-400 font-semibold">to be set on approval</span>}</td>
                      <td className="py-3 px-3 hidden lg:table-cell">
                        <div className="min-w-0">
                          <p className="text-[12px] font-semibold text-foreground truncate">{step.roleLabel}</p>
                          <p className="text-[10px] text-muted-foreground truncate">{step.assigneeName}{step.via === 'delegation' ? ' · delegated' : ''}</p>
                        </div>
                      </td>
                      <td className="py-3 px-3 whitespace-nowrap">
                        <span className={cn('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold border', late ? 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-900' : 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-900')}>
                          {late && <Timer className="w-2.5 h-2.5" />} {late ? `overdue (${fmtShort(step.dueAt)})` : fmtShort(step.dueAt)}
                        </span>
                      </td>
                      <td className="py-3 px-3"><StatusPill status={r.status as Status} /></td>
                      <td className="py-3 px-3 text-right whitespace-nowrap">
                        {ho ? (
                          <Btn variant="soft" onClick={() => acceptHandover(ho.id)}><Check className="w-3.5 h-3.5" /> Accept docket</Btn>
                        ) : (
                          <RowMenu items={buildMenu(r)} align="right" label="Decision" />
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
        <Pagination page={myQueueItems.page} pageSize={myQueueItems.size} total={myQueueItems.total} onPage={myQueueItems.setPage} onPageSize={myQueueItems.setSize} />
      </Panel>
      )}

      {tab === 'inflight' && (
      <Panel title="All in-flight chains" subtitle="Every request currently routed for approval — click a row to inspect its step history.">
        <TableToolbar
          search={search}
          onSearch={setSearch}
          placeholder="Search reference or applicant…"
          count={pagedInFlight.total}
          filters={[
            {
              label: 'Leave type',
              value: typeFilter,
              onChange: setTypeFilter,
              options: [{ value: 'all', label: 'All types' }, ...leaveTypes.map((lt) => ({ value: lt.id, label: lt.name }))],
            },
          ]}
        />
        {pagedInFlight.items.length === 0 ? (
          <EmptyState title="No in-flight chains" hint="Nothing is pending approval right now." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="text-[11px] uppercase tracking-wider text-muted-foreground">
                  <th className="py-3 px-5 font-semibold">Applicant</th>
                  <th className="py-3 px-3 font-semibold">Reference</th>
                  <th className="py-3 px-3 font-semibold">Leave type</th>
                  <th className="py-3 px-3 font-semibold">Start</th>
                  <th className="py-3 px-3 font-semibold">Current step</th>
                  <th className="py-3 px-3 font-semibold">Status</th>
                  <th className="py-3 px-3 font-semibold text-right">Chain</th>
                  <th className="py-3 px-3 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {pagedInFlight.items.map((r) => {
                  const open = openId === r.id
                  const current = nextStep(r)
                  return (
                    <React.Fragment key={r.id}>
                      <tr className={cn('text-[13px] align-middle cursor-pointer', open && 'bg-accent/40')} onClick={() => setOpenId(open ? null : r.id)}>
                        <td className="py-3 px-5">
                          <div className="flex items-center gap-2.5">
                            {open ? <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" /> : <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />}
                            <Avatar id={r.employeeId} size="sm" />
                            <span className="font-medium text-foreground">{employeeName(r.employeeId)}</span>
                          </div>
                        </td>
                        <td className="py-3 px-3 font-mono text-muted-foreground whitespace-nowrap">{r.ref}</td>
                        <td className="py-3 px-3"><TypePill leaveTypeId={r.leaveTypeId} showName /></td>
                        <td className="py-3 px-3 text-muted-foreground whitespace-nowrap">{fmtShort(r.startDate)}{r.endDate ? ` → ${fmtShort(r.endDate)}` : ''} · {r.days || 'TBD'}d</td>
                        <td className="py-3 px-3">
                          {current ? (
                            <div className="min-w-0">
                              <p className="text-[12px] font-semibold text-foreground truncate">{current.roleLabel}</p>
                              <p className="text-[10px] text-muted-foreground truncate">step {current.order}/{r.steps.length} · {fmtShort(current.dueAt)}</p>
                            </div>
                          ) : (
                            <span className="text-[12px] text-muted-foreground">resolving…</span>
                          )}
                        </td>
                        <td className="py-3 px-3"><StatusPill status={r.status as Status} /></td>
                        <td className="py-3 px-3 text-right text-[11px] font-mono text-muted-foreground whitespace-nowrap">{r.steps.filter((s) => s.status === 'approved').length}/{r.steps.length} approved</td>
                        <td className="py-3 px-3 text-right" onClick={(e) => e.stopPropagation()}>
                          <RowMenu items={buildMenu(r)} align="right" label="Manage" />
                        </td>
                      </tr>
                      {open && (
                        <tr className="align-top">
                          <td colSpan={8} className="px-5 pb-4 border-t border-border">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-3">
                              {r.steps.map((s, i) => (
                                <div key={i} className={cn('rounded-xl border px-3 py-2.5', STEP_STYLE[s.status])}>
                                  <div className="flex items-center gap-2 mb-1.5">
                                    <span className="text-[11px] font-mono text-muted-foreground">{i + 1}</span>
                                    <Avatar id={s.assigneeId} size="sm" />
                                    <div className="min-w-0 flex-1">
                                      <p className="text-[12px] font-semibold text-foreground truncate">{s.assigneeName}</p>
                                      <p className="text-[10px] text-muted-foreground truncate">
                                        {s.roleLabel}{s.via === 'delegation' ? ' · via delegation' : ''}
                                      </p>
                                    </div>
                                    <span className={cn('text-[10px] font-bold uppercase tracking-wide', stepTokenColor(s.status))}>{s.status}</span>
                                  </div>
                                  <p className="text-[11px] text-muted-foreground leading-snug">{s.comments}</p>
                                  <div className="flex items-center gap-2 mt-1.5 text-[10px] text-muted-foreground">
                                    <DateChip date={s.dueAt} />
                                    {s.actedAt && <span>acted {fmt(s.actedAt)}</span>}
                                    {s.dueAt < TODAY && s.status === 'pending' && <span className="text-amber-600 font-semibold">SLA exceeded</span>}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
        <Pagination page={pagedInFlight.page} pageSize={pagedInFlight.size} total={pagedInFlight.total} onPage={pagedInFlight.setPage} onPageSize={pagedInFlight.setSize} />
      </Panel>
      )}

      <Modal
        open={detail !== null}
        onClose={() => setDetail(null)}
        title={detail ? `${detail.ref} — full approval chain` : 'Request details'}
        subtitle="Documents, decision history and SLA per step."
        size="lg"
      >
        {detail ? <RequestDetail request={detail} isHr={can('documents', 'view_medical_documents')} /> : null}
      </Modal>

      <Modal
        open={approveTarget !== null}
        onClose={() => setApproveTarget(null)}
        title={approveTarget ? `Approve ${approveTarget.request.ref}` : 'Approve request'}
        subtitle="Grant the leave and set the return date — this fixes the number of days and records your decision."
        size="md"
        footer={
          <div className="flex items-center gap-2">
            <Btn
              variant="emerald"
              disabled={!approveReturnDate}
              onClick={() => {
                if (!approveTarget) return
                doDecide(approveTarget.request, 'approved', approveReturnDate, approveComment.trim() || undefined)
                setApproveTarget(null)
              }}
            >
              <Check className="w-3.5 h-3.5" /> Grant leave
            </Btn>
            <Btn variant="outline" onClick={() => setApproveTarget(null)}>Cancel</Btn>
          </div>
        }
      >
        {approveTarget && (
          <div className="space-y-4">
            <div className="rounded-xl border border-border bg-warm dark:bg-muted/30 px-3 py-2.5">
              <p className="text-[12px] font-semibold text-foreground">
                {typeOf(approveTarget.request.leaveTypeId)?.name ?? 'Leave'} · proposed from {fmtShort(approveTarget.request.startDate)}
              </p>
              <p className="text-[11px] text-muted-foreground mt-0.5">{approveTarget.request.reason || 'No reason given.'}</p>
            </div>
            <TextInput
              type="date"
              label="Return to work date"
              hint="The day the employee resumes duty; leave days are counted up to the day before."
              value={approveReturnDate}
              onChange={(e) => setApproveReturnDate(e.target.value)}
            />
            <p className="text-[12px] font-mono text-foreground">
              {approveReturnDate ? `≈ ${fmtShort(approveTarget.request.startDate)} → ${fmtShort(approveReturnDate)} · ${dayCount(approveTarget.request.startDate, approveReturnDate)} day${dayCount(approveTarget.request.startDate, approveReturnDate) === 1 ? '' : 's'}` : 'Set the return date to grant leave.'}
            </p>
            <TextArea
              label="Decision comment (recorded)"
              value={approveComment}
              onChange={(e) => setApproveComment(e.target.value)}
              rows={2}
              placeholder="Optional comment for the applicant…"
            />
          </div>
        )}
      </Modal>
    </div>
  )
}

function stepTokenColor(s: StepStatus): string {
  switch (s) {
    case 'approved': return 'text-emerald-600 dark:text-emerald-400'
    case 'rejected': return 'text-rose-600 dark:text-rose-400'
    case 'returned': return 'text-orange-600 dark:text-orange-400'
    case 'escalated': return 'text-amber-600 dark:text-amber-400'
    default: return 'text-muted-foreground'
  }
}

function employeeName(id: string): string {
  return getEmployee(id)?.name ?? id
}