'use client'

import { useMemo, useState, useEffect } from 'react'
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
  Shield,
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
  type LetterData,
  type LeaveRequestData,
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
import { ApprovalModal } from '@/components/leave/approval-modal'
import { HrProcessingModal } from '@/components/leave/hr-processing-modal'
import { PreviousDecisions } from '@/components/leave/previous-decisions'
import { ApprovalInsightBoxes } from '@/components/leave/approval-insight-boxes'
import { leaveApi, type ApprovalInsight } from '@/lib/leave-api'

const STEP_STYLE: Record<StepStatus, string> = {
  pending: 'border-border bg-warm dark:bg-muted/30',
  queued: 'border-sky-200 bg-sky-50/60 dark:bg-sky-950/30 dark:border-sky-900',
  approved: 'border-emerald-200 bg-emerald-50 dark:bg-emerald-950 dark:border-emerald-900',
  rejected: 'border-rose-200 bg-rose-50 dark:bg-rose-950 dark:border-rose-900',
  returned: 'border-orange-200 bg-orange-50 dark:bg-orange-950 dark:border-orange-900',
  escalated: 'border-amber-200 bg-amber-50 dark:bg-amber-950 dark:border-amber-900',
  skipped: 'border-border bg-muted/40 opacity-60',
}

export function ApprovalsView({ onNavigate }: { onNavigate?: (v: string) => void }) {
  const { employee, employeeId, supervisorMode, requests, leaveTypes, cases, handovers, decide, typeOf, acceptHandover, can, balanceFor, annualTypeId } = useLeave()
  const [openId, setOpenId] = useState<string | null>(null)
  const [tab, setTab] = useState('queue')
  const [detail, setDetail] = useState<LeaveRequest | null>(null)
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('all')
  const [approveTarget, setApproveTarget] = useState<{ request: LeaveRequest; stepOrder: number; isFinalStep: boolean } | null>(null)
  const [approveReturnDate, setApproveReturnDate] = useState(TODAY)
  const [approveComment, setApproveComment] = useState('')
  // The signature ceremony is the LAST step of an approval, not the first:
  // the approver reads the file, writes their comment, presses "Grant leave"
  // and only then is asked to sign.
  const [signatureOpen, setSignatureOpen] = useState(false)
  // Return/Reject always collect a written reason, which the requester sees.
  const [decisionTarget, setDecisionTarget] = useState<{ request: LeaveRequest; decision: 'returned' | 'rejected' } | null>(null)
  const [decisionReason, setDecisionReason] = useState('')
  const [approveIsPaid, setApproveIsPaid] = useState(true)
  // HR is the final processing step: they write and dispatch the response
  // letter before the signature ceremony records the approval.
  const [hrOpen, setHrOpen] = useState(false)
  const [pendingLetter, setPendingLetter] = useState<LetterData | null>(null)
  const [approvalInsight, setApprovalInsight] = useState<ApprovalInsight | null>(null)
  const [approvalInsightLoading, setApprovalInsightLoading] = useState(false)

  useEffect(() => {
    if (!approveTarget) {
      setApprovalInsight(null)
      setApprovalInsightLoading(false)
      return
    }
    let cancelled = false
    setApprovalInsight(null)
    setApprovalInsightLoading(true)
    leaveApi.requests.approvalInsight(approveTarget.request.id)
      .then((response) => { if (!cancelled) setApprovalInsight(response.data) })
      .catch(() => { if (!cancelled) setApprovalInsight(null) })
      .finally(() => { if (!cancelled) setApprovalInsightLoading(false) })
    return () => { cancelled = true }
  }, [approveTarget?.request.id])

  const nextStep = (r: LeaveRequest) => r.steps.find((s) => s.status === 'pending')
  // Later steps stay `queued` until their turn, so counting pending steps made
  // every intermediate approver look final. The current step is final only
  // when nothing actionable remains after it (optional steps may be skipped).
  const isFinalStep = (r: LeaveRequest) => {
    const index = r.steps.findIndex((s) => s.status === 'pending')
    return index >= 0 && r.steps.slice(index + 1).every((s) => s.status === 'skipped')
  }
  const canApproveAny = can('requests', 'approve') || can('requests', 'approve_zone')
  // Only the current owner may act. Scope-wide visibility belongs on the
  // all-in-flight tab; the actionable queue must not offer decisions that the
  // server will reject as "not assigned".
  const canAct = (r: LeaveRequest) => Boolean(canApproveAny && nextStep(r)?.assigneeId === employeeId)
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
    // A row is only actionable when a pending step exists. In-flight requests
    // whose steps are still resolving (or whose final decision has not landed
    // yet) have no pending step — they must not enter the queue, otherwise
    // the sort and row render below crash on `undefined.dueAt`.
    const q = inFlight.filter(
      (r) => nextStep(r)?.assigneeId === employeeId,
    )
    const filtered = q.filter((r) => {
      if (typeFilter !== 'all' && r.leaveTypeId !== typeFilter) return false
      const name = employeeName(r.employeeId).toLowerCase()
      const qs = search.trim().toLowerCase()
      return !qs || r.ref.toLowerCase().includes(qs) || name.includes(qs)
    })
    return filtered.sort((a, b) =>
      (nextStep(a)?.dueAt ?? '').localeCompare(nextStep(b)?.dueAt ?? ''),
    )
  }, [inFlight, employeeId, typeFilter, search])

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
  const annualBalance = approveTarget ? balanceFor(approveTarget.request.employeeId, annualTypeId) : null
  const proposedDays = approveTarget && approveReturnDate
    ? dayCount(approveTarget.request.startDate, approveReturnDate)
    : 0

  // The chain step currently waiting. HR's step is the response-letter step.
  const currentApprovalStep = approveTarget ? nextStep(approveTarget.request) : undefined
  const hrFinal = Boolean(approveTarget?.isFinalStep && currentApprovalStep?.role === 'HR')

  const toHrRequestData = (r: LeaveRequest): LeaveRequestData => ({
    id: r.id,
    employeeName: employeeName(r.employeeId),
    leaveType: typeOf(r.leaveTypeId)?.name ?? r.leaveTypeId,
    startDate: r.startDate,
    endDate: approveReturnDate || r.endDate,
    returnDate: approveReturnDate,
    requestedDays: proposedDays || r.days,
    isPaidLeave: approveIsPaid,
    approvers: r.steps
      .filter((step) => Boolean(step.assigneeId))
      .map((step) => ({
        name: step.assigneeName || '—',
        role: step.roleLabel || String(step.role ?? ''),
      })),
  })

  const doDecide = (r: LeaveRequest, decision: 'approved' | 'rejected' | 'returned', endDate?: string, comment?: string, sig?: { path?: string | null; hash?: string | null }, isPaid?: boolean | null, letter?: LetterData | null) => {
    const step = nextStep(r)
    if (!step) return
    // Approvals always go through the signature ceremony; the collected
    // attestation travels with the decision so the API can enforce it.
    // Return/Reject carry no ceremony and the backend seals them unsigned.
    decide(r.id, step.order, decision, comment, endDate, sig?.path ?? undefined, sig?.hash ?? undefined, isPaid, letter)
  }

  // Return and Reject open a reason dialog first - the API now refuses either
  // without a written explanation, and the requester is shown that text.
  const requestDecision = (r: LeaveRequest, decision: 'returned' | 'rejected') => {
    if (!nextStep(r)) return
    setDecisionReason('')
    setDecisionTarget({ request: r, decision })
  }

  const submitDecision = () => {
    if (!decisionTarget) return
    const reason = decisionReason.trim()
    if (reason.length < 3) return
    doDecide(decisionTarget.request, decisionTarget.decision, undefined, reason)
    setDecisionTarget(null)
    setDecisionReason('')
  }

  const startApprove = (r: LeaveRequest) => {
    const step = nextStep(r)
    if (!step) return
    setApproveTarget({ request: r, stepOrder: step.order, isFinalStep: isFinalStep(r) })
    setApproveReturnDate(r.startDate >= TODAY ? r.startDate : TODAY)
    setApproveComment('')
    setSignatureOpen(false)
    setHrOpen(false)
    setPendingLetter(null)
  }

  const buildMenu = (r: LeaveRequest): RowMenuItem[] => {
    const items: RowMenuItem[] = []
    const ho = pendingHoFor(r)
    if (ho) {
      items.push({ icon: Check, label: 'Accept docket', onClick: () => acceptHandover(ho.id) })
    }
    items.push({ icon: Eye, label: 'View full details', onClick: () => setDetail(r) })
    if (canAct(r) && nextStep(r)) {
      items.push({ icon: Check, label: 'Approve', onClick: () => startApprove(r) })
      items.push({ icon: RotateCcw, label: 'Return for correction', onClick: () => requestDecision(r, 'returned') })
      items.push({ icon: X, label: 'Reject', tone: 'danger', onClick: () => requestDecision(r, 'rejected') })
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
        <StatCard icon={ListChecks} label="Awaiting my decision" value={myQueue.length} hint="Assigned to you" tone="amber" />
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
        title="Your approval queue"
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
                  const step = nextStep(r)
                  if (!step) return null
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
                        <td className="py-3 px-3 text-right text-[11px] font-mono text-muted-foreground whitespace-nowrap">{r.steps.filter((s) => (s.decision ?? s.status) === 'approved').length}/{r.steps.length} approved</td>
                        <td className="py-3 px-3 text-right" onClick={(e) => e.stopPropagation()}>
                          <RowMenu items={buildMenu(r)} align="right" label="Manage" />
                        </td>
                      </tr>
                      {open && (
                        <tr className="align-top">
                          <td colSpan={8} className="px-5 pb-4 border-t border-border">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-3">
                              {r.steps.map((s, i) => {
                                // `done` assignments are mapped to "approved";
                                // the real outcome is on the decision, so use it
                                // for the token and colour (a rejection must not
                                // read as an approval).
                                const state = s.decision === 'rejected' || s.decision === 'returned' || s.decision === 'approved'
                                  ? s.decision
                                  : s.status
                                return (
                                <div key={i} className={cn('rounded-xl border px-3 py-2.5', STEP_STYLE[state])}>
                                  <div className="flex items-center gap-2 mb-1.5">
                                    <span className="text-[11px] font-mono text-muted-foreground">{i + 1}</span>
                                    <Avatar id={s.assigneeId} size="sm" />
                                    <div className="min-w-0 flex-1">
                                      <p className="text-[12px] font-semibold text-foreground truncate">{s.assigneeName}</p>
                                      <p className="text-[10px] text-muted-foreground truncate">
                                        {s.roleLabel}{s.via === 'delegation' ? ' · via delegation' : ''}
                                      </p>
                                    </div>
                                    <span className={cn('text-[10px] font-bold uppercase tracking-wide', stepTokenColor(state))}>{state}</span>
                                  </div>
                                  <p className="text-[11px] text-muted-foreground leading-snug">{s.comments}</p>
                                  <div className="flex items-center gap-2 mt-1.5 text-[10px] text-muted-foreground">
                                    <DateChip date={s.dueAt} />
                                    {s.actedAt && <span>acted {fmt(s.actedAt)}</span>}
                                    {s.dueAt < TODAY && state === 'pending' && <span className="text-amber-600 font-semibold">SLA exceeded</span>}
                                  </div>
                                </div>
                                )
                              })}
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
        title={detail ? `${detail.ref} — mfululizo kamili wa kuidhinisha` : 'Request details'}
        subtitle="Nyaraka, historia ya maamuzi na SLA kwa kila hatua. / Documents, decision history and SLA per step."
        size="lg"
      >
        {detail ? (
          <RequestDetail
            request={detail}
            isHr={can('documents', 'view_medical_documents')}
            actions={
              canAct(detail) && nextStep(detail) ? (
                <>
                  <Btn variant="emerald" onClick={() => { setDetail(null); startApprove(detail) }}>
                    <Check className="w-3.5 h-3.5" /> Kubali / Approve
                  </Btn>
                  <Btn variant="outline" onClick={() => { const d = detail; setDetail(null); requestDecision(d, 'returned') }}>
                    <RotateCcw className="w-3.5 h-3.5" /> Irudishe / Return
                  </Btn>
                  <Btn variant="danger" onClick={() => { const d = detail; setDetail(null); requestDecision(d, 'rejected') }}>
                    <X className="w-3.5 h-3.5" /> Kataa / Reject
                  </Btn>
                </>
              ) : undefined
            }
          />
        ) : null}
      </Modal>

      <Modal
        open={approveTarget !== null}
        onClose={() => { setApproveTarget(null); setSignatureOpen(false); setHrOpen(false); setPendingLetter(null) }}
        title={approveTarget ? `Idhinisha / Approve ${approveTarget.request.ref}` : 'Approve request'}
        subtitle={approveTarget?.isFinalStep ? 'Mwidhinishaji wa mwisho huweka tarehe ya kurudi kazini na muda wa likizo. / The final approver sets the return date and granted duration.' : 'Rekodi uamuzi wako — tarehe ya kurudi na muda zinahifadhiwa kwa mwidhinishaji wa mwisho. / Record your decision.'}
        size="md"
      >
        {approveTarget && (
          <>
            <div className="space-y-4">
              <PreviousDecisions steps={approveTarget.request.steps} />
              <div className="rounded-xl border border-border bg-warm dark:bg-muted/30 px-3 py-2.5">
                <p className="text-[12px] font-semibold text-foreground">
                  {typeOf(approveTarget.request.leaveTypeId)?.name ?? 'Leave'} · imependekezwa kuanzia {fmtShort(approveTarget.request.startDate)}
                </p>
                <p className="text-[11px] text-muted-foreground mt-0.5">{approveTarget.request.reason || 'Hakuna sababu iliyotolewa. / No reason given.'}</p>
              </div>
              {approveTarget.isFinalStep ? (
                <>
                  <TextInput
                    type="date"
                    label="Tarehe ya kurudi kazini"
                    hint="Siku ambayo mfanyakazi anarudi kazini — siku za likizo huhesabiwa hadi siku inayotangulia."
                    value={approveReturnDate}
                    onChange={(e) => setApproveReturnDate(e.target.value)}
                  />
                  <p className="text-[12px] font-mono text-foreground">
                    {approveReturnDate ? `≈ ${fmtShort(approveTarget.request.startDate)} → ${fmtShort(approveReturnDate)} · siku ${proposedDays}` : 'Weka tarehe ya kurudi ili kutoa likizo.'}
                  </p>
                  <label className="flex items-center gap-2 text-[12px] font-semibold text-foreground">
                    <input type="checkbox" checked={approveIsPaid} onChange={(e) => setApproveIsPaid(e.target.checked)} className="h-4 w-4 rounded border-border" />
                    Likizo hii italipwa / This leave is paid
                  </label>
                </>
              ) : (
                <p className="rounded-lg border border-sky-200 bg-sky-50 px-3 py-2 text-[12px] text-sky-900 dark:border-sky-900 dark:bg-sky-950/40 dark:text-sky-200">
                  Hatua ya kati ya kuidhinisha. Tarehe ya kurudi na siku zilizopewa zinahifadhiwa kwa mwidhinishaji wa mwisho.
                </p>
              )}
              <ApprovalInsightBoxes
                insight={approvalInsight}
                loading={approvalInsightLoading}
                isFinalStep={approveTarget.isFinalStep}
                isAnnual={approveTarget.request.leaveTypeId === annualTypeId}
                proposedDays={proposedDays}
                fallbackBalance={annualBalance}
              />
              <TextArea
                label="Maoni ya uamuzi (yanahifadhiwa)"
                value={approveComment}
                onChange={(e) => setApproveComment(e.target.value)}
                rows={2}
                placeholder="Maoni ya hiari kwa mwombaji…"
              />
            </div>

            <div className="flex items-center gap-2">
              <Btn
                variant="emerald"
                disabled={approveTarget?.isFinalStep === true && !approveReturnDate}
                onClick={() => {
                  if (approveTarget && approveTarget.isFinalStep && nextStep(approveTarget.request)?.role === 'HR') {
                    setHrOpen(true)
                  } else {
                    setSignatureOpen(true)
                  }
                }}
              >
                <Check className="w-3.5 h-3.5" /> Grant leave
              </Btn>
              <Btn variant="outline" onClick={() => { setApproveTarget(null); setSignatureOpen(false); setHrOpen(false); setPendingLetter(null) }}>Cancel</Btn>
            </div>

            {/* Last step: the signature ceremony. Completing it records the
                approval with the attestation the API requires. */}
            <ApprovalModal
              open={signatureOpen}
              onClose={() => setSignatureOpen(false)}
              allowOverwrite={true}
              onSignatureComplete={async (path: string, hash: string) => {
                const target = approveTarget
                setSignatureOpen(false)
                if (!target) return
                doDecide(
                  target.request,
                  'approved',
                  target.isFinalStep ? approveReturnDate : undefined,
                  approveComment.trim() || undefined,
                  { path, hash },
                  approveIsPaid,
                  pendingLetter,
                )
                setPendingLetter(null)
                setApproveTarget(null)
              }}
            />

            {/* HR final processing: write the official reference, override the
                granted days and dispatch the response letter. The signature
                ceremony then records the approval with the letter payload. */}
            {hrFinal && (
              <HrProcessingModal
                open={hrOpen}
                onClose={() => setHrOpen(false)}
                request={toHrRequestData(approveTarget.request)}
                onDispatch={(letter) => {
                  setPendingLetter(letter)
                  setHrOpen(false)
                  setSignatureOpen(true)
                }}
              />
            )}
          </>
        )}
      </Modal>

      {/* Written reason for a return/rejection - mandatory and visible to the
          requester, so they know exactly what to fix or why it was refused. */}
      <Modal
        open={decisionTarget !== null}
        onClose={() => { setDecisionTarget(null); setDecisionReason('') }}
        title={decisionTarget?.decision === 'rejected' ? 'Kataa ombi / Reject request' : 'Rudisha ombi / Return for correction'}
        subtitle={decisionTarget ? `${decisionTarget.request.ref} · ${employeeName(decisionTarget.request.employeeId)}` : undefined}
        size="md"
      >
        {decisionTarget && (
          <div className="space-y-4">
            <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[12px] text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
              Sababu hii itaonekana kwa mwombaji. / This reason is shown to the requester.
            </p>
            <TextArea
              label="Sababu / Reason (required)"
              value={decisionReason}
              onChange={(e) => setDecisionReason(e.target.value)}
              rows={4}
              placeholder={decisionTarget.decision === 'rejected' ? 'Eleza kwa nini ombi linakataliwa…' : 'Eleza kinachopaswa kurekebishwa…'}
            />
            <div className="flex items-center gap-2">
              <Btn
                variant={decisionTarget.decision === 'rejected' ? 'danger' : 'outline'}
                disabled={decisionReason.trim().length < 3}
                onClick={submitDecision}
              >
                {decisionTarget.decision === 'rejected' ? <X className="w-3.5 h-3.5" /> : <RotateCcw className="w-3.5 h-3.5" />}
                {decisionTarget.decision === 'rejected' ? 'Kataa / Reject' : 'Rudisha / Return'}
              </Btn>
              <Btn variant="outline" onClick={() => { setDecisionTarget(null); setDecisionReason('') }}>Cancel</Btn>
            </div>
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
