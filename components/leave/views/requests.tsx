'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Check,
  X,
  AlertTriangle,
  Info,
  Send,
  Paperclip,
  Eye,
  RotateCcw,
  ArchiveX,
  Pencil,
  Plus,
  ClipboardList,
  Hourglass,
  TrendingUp,
  Wallet,
  CalendarClock,
  Sparkles,
  ChevronRight,
  Repeat,
  Siren,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import {
  TODAY,
  addDays,
  dayCount,
  fmtShort,
  fmt,
  tenureMonths,
  policyEffectiveAt,
  statusLabel,
  type ApprovalStep,
  type LeaveRequest,
  type Status,
  type LeaveType,
  type Delegation,
  type WorkflowDef,
} from '@/lib/leave'
import { ApiError, leaveApi, type ChainItem } from '@/lib/leave-api'
import { useLeave, type EmployeeRow } from '@/components/leave/leave-context'
import {
  Avatar,
  StatusPill,
  TypePill,
  SectionHeading,
  Panel,
  EmptyState,
  Modal,
  TextInput,
  SelectInput,
  TextArea,
  TableToolbar,
  RowMenu,
  ConfirmModal,
  StatCard,
  Btn,
  Pagination,
  usePaged,
  Tabs,
  type RowMenuItem,
} from '@/components/leave/shared'
import { RequestDetail } from '@/components/leave/request-detail'
import { ApprovalModal } from '@/components/leave/approval-modal'

interface PartState {
  employeeId: string
  leaveTypeId: string
  startDate: string
  endDate: string
  reason: string
  documentName: string
  repeat: 'once' | 'weekly' | 'monthly'
  repeatCount: number
  isHalfDay: boolean
  emergency: boolean
  emergencyReason: string
}

const EDITABLE_STATUSES = ['draft', 'submitted', 'under_review', 'returned_for_correction']

function addMonths(isoDate: string, n: number): string {
  const d = new Date(isoDate.slice(0, 10) + 'T00:00:00')
  d.setDate(1)
  d.setMonth(d.getMonth() + n)
  const targetDay = Number(isoDate.slice(8, 10))
  const last = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate()
  d.setDate(Math.min(targetDay, last))
  return d.toISOString().slice(0, 10)
}

function expandRecurrence(form: PartState): { startDate: string; endDate: string }[] {
  const out: { startDate: string; endDate: string }[] = []
  const n = form.repeat === 'once' ? 1 : form.repeatCount
  for (let i = 0; i < n; i++) {
    const startDate = form.repeat === 'monthly' ? addMonths(form.startDate, i) : addDays(form.startDate, i * 7)
    out.push({ startDate, endDate: '' })
  }
  return out
}

export function RequestsView() {
  const {
    employee,
    employeeId,
    supervisorMode,
    canViewEmployee,
    employees,
    requests,
    delegations,
    workflowDefs,
    leaveTypes,
    policies,
    pendingApprovals,
    typeOf,
    balanceFor,
    submitRequest,
    updateRequest,
    decide,
    resubmit,
    withdrawRequest,
    submitDraft,
    deleteDraft,
    can,
    eligibility,
    orgEligibility,
    annualTypeId,
  } = useLeave()

  const [createOpen, setCreateOpen] = useState(false)
  const [tab, setTab] = useState('requests')
  const [form, setForm] = useState<PartState>({
    employeeId: supervisorMode ? employees[0]?.id : employeeId,
    leaveTypeId: annualTypeId ?? leaveTypes[0]?.id ?? '',
    startDate: addDays(TODAY, 21),
    endDate: addDays(TODAY, 30),
    reason: '',
    documentName: '',
    repeat: 'once',
    repeatCount: 2,
    isHalfDay: false,
    emergency: false,
    emergencyReason: '',
  })
  const [search, setSearch] = useState('')
  // Filter off a debounced copy so typing doesn't re-run the row filter (with
  // its employee lookups) on every keystroke.
  const [debouncedSearch, setDebouncedSearch] = useState('')
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 200)
    return () => clearTimeout(t)
  }, [search])

  // Supervisor mode defaults the applicant to the first staff member, but the
  // list arrives asynchronously — the initial state may have captured an empty
  // list. Seed it once employees load so the picker and policy checks have a
  // real subject.
  useEffect(() => {
    if (supervisorMode && !form.employeeId && employees[0]?.id) {
      setForm((f) => ({ ...f, employeeId: employees[0].id }))
    }
  }, [supervisorMode, employees, form.employeeId])
  const [typeFilter, setTypeFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [detail, setDetail] = useState<LeaveRequest | null>(null)
  const [editTarget, setEditTarget] = useState<LeaveRequest | null>(null)
  const [editForm, setEditForm] = useState<PartState>(form)
  const [deleteTarget, setDeleteTarget] = useState<LeaveRequest | null>(null)
  const [deleteReason, setDeleteReason] = useState('')
  const [approveTarget, setApproveTarget] = useState<{ request: LeaveRequest; stepOrder: number } | null>(null)
  const [approveReturnDate, setApproveReturnDate] = useState(TODAY)
  // Same signature ceremony as the Approvals queue: the API refuses
  // signature-less approvals, so every Grant path must collect one first.
  const [signatureStep, setSignatureStep] = useState<'pending' | 'completed'>('pending')
  const [signatureData, setSignatureData] = useState<{ path: string | null; hash: string | null }>({ path: null, hash: null })
  const resetSignature = () => {
    setSignatureStep('pending')
    setSignatureData({ path: null, hash: null })
  }

  const employeeById = useMemo(() => new Map(employees.map((e) => [e.id, e])), [employees])

  const scope = useMemo(() => requests.filter((r) => canViewEmployee(r.employeeId)), [requests, canViewEmployee])
  const filtered = useMemo(() => {
    return scope.filter((r) => {
      if (typeFilter !== 'all' && r.leaveTypeId !== typeFilter) return false
      if (statusFilter !== 'all' && r.status !== statusFilter) return false
      const q = debouncedSearch.trim().toLowerCase()
      if (!q) return true
      const emp = (employeeById.get(r.employeeId)?.name ?? r.employeeId).toLowerCase()
      const lt = typeOf(r.leaveTypeId)?.name.toLowerCase() ?? r.leaveTypeId
      return r.ref.toLowerCase().includes(q) || emp.includes(q) || r.reason.toLowerCase().includes(q) || lt.includes(q)
    })
  }, [scope, typeFilter, statusFilter, debouncedSearch, employeeById, typeOf])
  const sorted = useMemo(() => [...filtered].sort((a, b) => b.createdAt.localeCompare(a.createdAt)), [filtered])
  const paged = usePaged(sorted, 8)

  const policy = policyEffectiveAt(form.leaveTypeId, TODAY, policies)
  const rawDays = form.endDate ? dayCount(form.startDate, form.endDate) : 0
  const days = form.isHalfDay ? 0.5 : rawDays
  const checks = useMemo(
    () => policyChecks(form, days, employees, requests, policies, leaveTypes, balanceFor),
    [form, days, employees, requests, policies, leaveTypes, balanceFor],
  )

  // Approval-chain preview: the server resolves the chain with the SAME
  // WorkflowResolver submission uses, so the panel shows what will actually
  // be persisted. Scoped officers only — hidden for plain employees, who
  // must not read approver identities before anyone has been asked to act.
  // There is NO client fallback any more: the server preview is authoritative.
  const [preview, setPreview] = useState<
    | { state: 'loading' }
    | { state: 'ready'; steps: ApprovalStep[] }
    | { state: 'denied' }
    | { state: 'failed' }
  >({ state: 'loading' })
  const previewSeq = useRef(0)
  useEffect(() => {
    if (!createOpen || !supervisorMode) {
      setPreview({ state: 'loading' })
      return
    }
    const seq = ++previewSeq.current
    setPreview({ state: 'loading' })
    const t = setTimeout(() => {
      leaveApi.requests
        .preview({
          employee_id: form.employeeId,
          leave_type_id: form.leaveTypeId,
          days: form.endDate ? dayCount(form.startDate, form.endDate) : null,
        })
        .then((res) => {
          if (seq !== previewSeq.current) return
          setPreview({ state: 'ready', steps: res.data.map(toApprovalStep) })
        })
        .catch((err: unknown) => {
          if (seq !== previewSeq.current) return
          if (err instanceof ApiError && err.status === 403) setPreview({ state: 'denied' })
          else setPreview({ state: 'failed' })
        })
    }, 250)
    return () => clearTimeout(t)
  }, [createOpen, supervisorMode, form.employeeId, form.leaveTypeId, form.startDate, form.endDate])

  const activeCount = scope.filter((r) => r.status === 'approved' || r.status === 'under_review').length
  const minePending = pendingApprovals.filter((r) => r.steps.some((s) => s.status === 'pending' && s.assigneeId === employeeId)).length
  const approvedDays = scope.filter((r) => r.status === 'approved').reduce((s, r) => s + r.days, 0)
  const annual = balanceFor(employeeId, annualTypeId)

  const upcoming = scope
    .filter((r) => r.status === 'approved' && r.endDate >= TODAY)
    .sort((a, b) => a.startDate.localeCompare(b.startDate))

  const eligible = leaveTypes
    .map((lt) => {
      const pol = policyEffectiveAt(lt.id, TODAY, policies)
      if (!pol) return null
      const bal = balanceFor(employeeId, lt.id)
      const tenure = tenureMonths(employee.hireDate)
      return { lt, pol, bal, ok: tenure >= pol.minTenureMonths, earliest: addDays(TODAY, pol.minNoticeDays) }
    })
    .filter((x): x is NonNullable<typeof x> => x !== null)

  const submit = () => {
    if (!form.reason.trim()) return
    const occurrences = expandRecurrence(form)
    const scheduled = occurrences.map((o, i) => ({
      employeeId: form.employeeId,
      leaveTypeId: form.leaveTypeId,
      startDate: o.startDate,
      endDate: '',
      reason: occurrences.length > 1 ? `${form.reason} (occurrence ${i + 1} of ${occurrences.length}, ${form.repeat})` : form.reason,
      documentName: form.documentName || undefined,
      isHalfDay: form.isHalfDay,
      emergency: form.emergency,
      emergencyReason: form.emergency ? form.emergencyReason : undefined,
    }))
    scheduled.forEach((input) => submitRequest(input))
    // No success toast here: submitRequest reports the real per-request
    // outcome (submitted vs saved-as-draft). Toasting success up front was
    // how failed submissions masqueraded as done while drafts piled up.
    setForm({
      employeeId: supervisorMode ? employees[0]?.id : employeeId,
      leaveTypeId: annualTypeId ?? leaveTypes[0]?.id ?? '',
      startDate: addDays(TODAY, 21),
      endDate: addDays(TODAY, 30),
      reason: '',
      documentName: '',
      repeat: 'once',
      repeatCount: 2,
      isHalfDay: false,
      emergency: false,
      emergencyReason: '',
    })
    setCreateOpen(false)
  }

  // Mirrors approvals.tsx: assigned steps always actionable; supervisor-wide
  // action additionally needs an approve-tier capability plus record scope.
  const canApproveAny = can('requests', 'approve') || can('requests', 'approve_zone')
  const canAct = (r: LeaveRequest) =>
    r.steps.some((s) => s.status === 'pending' && s.assigneeId === employeeId) ||
    (supervisorMode && canApproveAny && canViewEmployee(r.employeeId))
  const nextPending = (r: LeaveRequest) => r.steps.find((s) => s.status === 'pending')

  const openEdit = (r: LeaveRequest) => {
    setEditForm({ employeeId: r.employeeId, leaveTypeId: r.leaveTypeId, startDate: r.startDate, endDate: r.endDate, reason: r.reason, documentName: '', repeat: 'once', repeatCount: 2, isHalfDay: r.isHalfDay ?? false, emergency: r.emergency ?? false, emergencyReason: r.emergencyReason ?? '' })
    setEditTarget(r)
  }

  const saveEdit = () => {
    if (!editTarget) return
    updateRequest(editTarget.id, {
      startDate: editForm.startDate,
      endDate: '',
      reason: editForm.reason,
      isHalfDay: editForm.isHalfDay,
    })
    setEditTarget(null)
  }

  const confirmDelete = () => {
    if (!deleteTarget) return
    if (deleteTarget.status === 'draft') {
      // Never submitted → real deletion; the row disappears entirely.
      deleteDraft(deleteTarget.id)
      if (detail?.id === deleteTarget.id) setDetail(null)
    } else {
      withdrawRequest(deleteTarget.id, deleteReason.trim() || 'Removed from active list')
    }
    setDeleteReason('')
  }

  const deletingDraft = deleteTarget?.status === 'draft'

  const buildMenu = (r: LeaveRequest): RowMenuItem[] => {
    const items: RowMenuItem[] = [{ icon: Eye, label: 'View details', onClick: () => setDetail(r) }]
    const step = nextPending(r)
    if (canAct(r) && step) {
      items.push({ icon: Check, label: 'Approve', onClick: () => { setApproveTarget({ request: r, stepOrder: step.order }); setApproveReturnDate(r.startDate >= TODAY ? r.startDate : TODAY); resetSignature() } })
      items.push({ icon: RotateCcw, label: 'Return to applicant', onClick: () => decide(r.id, step.order, 'returned', '(from list)') })
      items.push({ icon: X, label: 'Reject', tone: 'danger', onClick: () => decide(r.id, step.order, 'rejected', '(from list)') })
    }
    if (r.status === 'draft') {
      // Drafts: the applicant alone may retry-submit or truly delete
      // (the API enforces both). Others see the draft read-only.
      if (r.employeeId === employeeId) {
        items.push({ icon: Send, label: 'Submit for approval', onClick: () => submitDraft(r.id) })
        items.push({ icon: ArchiveX, label: 'Delete draft', tone: 'danger', onClick: () => setDeleteTarget(r) })
      }
    } else if (EDITABLE_STATUSES.includes(r.status)) {
      items.push({ icon: Pencil, label: 'Update details', onClick: () => openEdit(r) })
      items.push({ icon: ArchiveX, label: 'Withdraw request', tone: 'danger', onClick: () => setDeleteTarget(r) })
    } else {
      items.push({ icon: ArchiveX, label: 'Delete (history locked)', disabled: true, title: 'Completed requests are kept in the tamper-proof audit trail.' })
    }
    if (r.status === 'returned_for_correction' && (canViewEmployee(r.employeeId) || r.employeeId === employeeId)) {
      items.push({ icon: RotateCcw, label: 'Resubmit', onClick: () => resubmit(r.id) })
    }
    return items
  }

  const leaveOptions = leaveTypes.map((lt) => ({ value: lt.id, label: `${lt.name} · ${lt.swahili}` }))

  return (
    <div className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      <SectionHeading
        title="Leave requests"
        subtitle="Create a new request or track the status of existing applications."
        actions={
          <Btn onClick={() => setCreateOpen(true)}>
            <Plus className="w-4 h-4" /> New leave request
          </Btn>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard icon={ClipboardList} label="Active requests" value={activeCount} hint={supervisorMode ? 'All staff' : 'Your active requests'} tone="teal" />
        <StatCard icon={Hourglass} label="Pending my approval" value={minePending} hint="Awaiting your decision" tone="amber" />
        <StatCard icon={TrendingUp} label="Days approved" value={approvedDays} hint="Approved days in scope" tone="emerald" />
        <StatCard icon={Wallet} label={typeOf(annualTypeId)?.name ?? 'Annual leave'} value={`${annual.remaining}d`} hint={`${annual.used} used of ${annual.accrued}`} tone="sky" />
      </div>

      <Tabs
        tabs={[
          { value: 'requests', label: 'Requests', icon: ClipboardList, badge: sorted.length },
          { value: 'upcoming', label: 'Upcoming approved leave', icon: CalendarClock, badge: upcoming.length },
          { value: 'balances', label: 'Eligibility & balances', icon: Sparkles },
        ]}
        value={tab}
        onChange={setTab}
      />

      {tab === 'requests' && (
        <Panel>
          <TableToolbar
            search={search}
            onSearch={setSearch}
            placeholder="Search reference, name, reason…"
            count={sorted.length}
            filters={[
              {
                label: 'Leave type',
                value: typeFilter,
                onChange: setTypeFilter,
                options: [{ value: 'all', label: 'All types' }, ...leaveTypes.map((lt) => ({ value: lt.id, label: lt.name }))],
              },
              {
                label: 'Status',
                value: statusFilter,
                onChange: setStatusFilter,
                options: [
                  { value: 'all', label: 'All statuses' },
                  ...(['submitted', 'under_review', 'returned_for_correction', 'approved', 'rejected', 'withdrawn', 'paused_pending_handover'] as const).map((s) => ({
                    value: s,
                    label: statusLabel(s),
                  })),
                ],
              },
            ]}
          />
          {paged.items.length === 0 ? (
            <EmptyState title="No requests found" hint="Adjust the search or filters, or create a new request." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="text-[11px] uppercase tracking-wider text-muted-foreground">
                    <th className="py-3 px-5 font-semibold">Employee</th>
                    <th className="py-3 px-3 font-semibold">Reference</th>
                    <th className="py-3 px-3 font-semibold">Type</th>
                    <th className="py-3 px-3 font-semibold">Period</th>
                    <th className="py-3 px-3 font-semibold">Days</th>
                    <th className="py-3 px-3 font-semibold hidden md:table-cell">Reason</th>
                    <th className="py-3 px-3 font-semibold">Status</th>
                    <th className="py-3 px-3 font-semibold text-right">Manage</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {paged.items.map((r) => (
                    <tr key={r.id} className="text-[13px] align-middle group">
                      <td className="py-2.5 px-5">
                        <div className="flex items-center gap-2">
                          <Avatar id={r.employeeId} size="sm" />
                          <span className="font-medium text-foreground">{employees.find((e) => e.id === r.employeeId)?.name ?? r.employeeId}</span>
                        </div>
                      </td>
                      <td className="py-2.5 px-3 font-mono text-muted-foreground whitespace-nowrap">{r.ref}</td>
                      <td className="py-2.5 px-3"><TypePill leaveTypeId={r.leaveTypeId} /></td>
                      <td className="py-2.5 px-3 text-muted-foreground whitespace-nowrap">{fmtShort(r.startDate)} → {r.endDate ? fmtShort(r.endDate) : 'TBD'}</td>
                      <td className="py-2.5 px-3 font-semibold tabular-nums">
                        {r.days ? (Number.isInteger(r.days) ? r.days : '½') : <span className="text-[11px] font-normal text-muted-foreground">—</span>}
                        {r.isHalfDay && <span className="ml-1 text-[9px] font-bold uppercase tracking-wide text-teal-700 dark:text-teal-300">half</span>}
                      </td>
                      <td className="py-2.5 px-3 text-muted-foreground hidden md:table-cell max-w-[220px] truncate">
                        <span className="flex items-center gap-1.5">
                          {r.emergency && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-900 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide">
                              <Siren className="w-2.5 h-2.5" /> emergency
                            </span>
                          )}
                          <span className="truncate">{r.reason}</span>
                        </span>
                      </td>
                      <td className="py-2.5 px-3"><StatusPill status={r.status as Status} /></td>
                      <td className="py-2.5 px-3 text-right">
                        <RowMenu items={buildMenu(r)} label="Manage" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <Pagination
            page={paged.page}
            pageSize={paged.size}
            total={paged.total}
            onPage={paged.setPage}
            onPageSize={paged.setSize}
          />
        </Panel>
      )}

      {tab === 'upcoming' && (
        <Panel
          title="Upcoming approved leave"
          subtitle="Closest sanctioned absence"
          icon={CalendarClock}
        >
          {upcoming.length === 0 ? (
            <EmptyState compact title="Nothing on the horizon" hint="Approved future leaves will appear here." />
          ) : (
            <ul className="space-y-2.5">
              {upcoming.slice(0, 8).map((r) => {
                const lt = typeOf(r.leaveTypeId)
                return (
                  <li key={r.id} className="flex items-center gap-3 rounded-xl border border-border bg-warm dark:bg-muted/30 px-3 py-2.5">
                    <span className={cn('h-2.5 w-2.5 rounded-full shrink-0', lt?.color ?? 'bg-zinc-400')} />
                    <div className="min-w-0 flex-1">
                      <p className="text-[12px] font-semibold text-foreground truncate">{lt?.name ?? r.leaveTypeId}</p>
                      <p className="text-[10px] text-muted-foreground truncate">
                        {fmt(r.startDate)} → {r.endDate ? fmt(r.endDate) : 'TBD'} · {r.days ? `${r.days}d` : 'TBD'}
                      </p>
                    </div>
                    <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                  </li>
                )
              })}
            </ul>
          )}
        </Panel>
      )}

      {tab === 'balances' && (
        <Panel
          title="Eligibility & balances"
          subtitle={`${employee.name} — ${employee.title}`}
          icon={Sparkles}
        >
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
              const bal = balanceFor(employeeId, lt.id)
              const pol = policyEffectiveAt(lt.id, TODAY, policies)
              return (
                <li key={lt.id} className={cn('rounded-xl border px-3 py-2', srv?.eligible ? 'border-border bg-warm dark:bg-muted/30' : 'border-dashed border-border')}>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[12px] font-semibold text-foreground flex items-center gap-2">
                      <span className={cn('h-2 w-2 rounded-full', lt.color)} />
                      {lt.short} {srv && !srv.eligible && <span className="text-[9px] uppercase tracking-wider font-bold text-amber-600 dark:text-amber-400">ineligible</span>}
                    </span>
                    <span className="text-[10px] font-mono text-muted-foreground">{bal.remaining}/{bal.accrued} days</span>
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    {srv?.eligible
                      ? `Eligible · max ${srv.max_days_per_request}d per request · ${srv.min_notice_days}-day notice`
                      : srv?.blockers?.length
                        ? srv.blockers.join('; ')
                        : `Needs ${pol?.minTenureMonths ?? '?'} months tenure`}
                  </p>
                </li>
              )
            })}
          </ul>
        </Panel>
      )}

      <Modal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="New leave request"
        subtitle={
          supervisorMode
            ? 'Leave type, policy, balance and approval chain all apply live.'
            : 'Leave type, policy and balance apply live.'
        }
        size="lg"
        footer={
          <Btn onClick={submit} disabled={!form.reason.trim()}>
            <Send className="w-3.5 h-3.5" /> Submit request
          </Btn>
        }
      >
        <div className="space-y-5">
          {supervisorMode && (
            <SelectInput
              label="Applicant"
              value={form.employeeId}
              onChange={(e) => setForm({ ...form, employeeId: e.target.value })}
            >
              {employees.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.name} — {e.title}
                </option>
              ))}
            </SelectInput>
          )}

          <SelectInput
            label="Leave type"
            value={form.leaveTypeId}
            onChange={(e) => setForm({ ...form, leaveTypeId: e.target.value })}
          >
            {leaveOptions.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </SelectInput>

          <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border bg-warm dark:bg-muted/30 px-3 py-2.5">
            {(() => {
              const lt = typeOf(form.leaveTypeId)
              const bal = balanceFor(form.employeeId, form.leaveTypeId)
              return (
                <>
                  <span className={cn('h-2 w-2 rounded-full', lt?.color ?? 'bg-zinc-400')} />
                  <span className="text-[12px] font-semibold text-foreground">{lt?.name}</span>
                  <span className="text-[11px] text-muted-foreground">balance {bal.remaining}/{bal.accrued} days</span>
                  <span className="text-[11px] text-muted-foreground">· policy v{policy?.version ?? '–'}</span>
                </>
              )
            })()}
          </div>

          <TextInput type="date" label="Start date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} />

          <div className="flex items-start gap-2.5 rounded-xl border border-sky-200 bg-sky-50 px-3 py-2.5 dark:border-sky-900 dark:bg-sky-950/40">
            <Info className="w-4 h-4 mt-0.5 text-sky-700 dark:text-sky-300 flex-shrink-0" />
            <p className="text-[12px] leading-snug text-foreground/90">
              You propose the <span className="font-semibold">start date</span> only. The approving officer sets the <span className="font-semibold">return date</span> (and therefore the number of days) when the leave is granted.
            </p>
          </div>

          <p className="text-[12px] text-foreground font-mono">
            {form.endDate ? `${days} day${days === 1 ? '' : 's'} · ` : ''}{fmtShort(form.startDate)}{form.endDate ? ` → ${fmtShort(form.endDate)}` : ' · return date set at approval'}
            {form.isHalfDay && <span className="text-teal-700 font-semibold"> (half day)</span>}
          </p>

          <div className="flex flex-wrap gap-4">
            <label className="flex items-center gap-2 text-[12px] text-foreground">
              <input
                type="checkbox"
                checked={form.isHalfDay}
                disabled={!policy?.allowHalfDay}
                onChange={(e) => setForm({ ...form, isHalfDay: e.target.checked })}
                className="accent-teal-700"
              />
              Half-day request {policy?.allowHalfDay ? '' : '(not allowed by policy)'}
            </label>
          </div>
          {form.isHalfDay && rawDays > 1 && (
            <p className="text-[11px] text-amber-600 dark:text-amber-400">
              Half-day deduction applies to {fmtShort(form.startDate)}; the full date range would be {rawDays} days.
            </p>
          )}

          <div className="rounded-xl border border-border bg-warm dark:bg-muted/30 p-3.5 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Repeat className="w-4 h-4 text-teal-700" />
                <p className="text-[12px] font-semibold text-foreground">Repeat schedule</p>
              </div>
              <span className="text-[10px] text-muted-foreground">
                {form.repeat === 'once' ? 'Single request' : `${form.repeatCount} occurrences`}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <SelectInput label="Pattern" value={form.repeat} onChange={(e) => setForm({ ...form, repeat: e.target.value as PartState['repeat'] })}>
                <option value="once">Once</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
              </SelectInput>
              <SelectInput
                label="Occurrences"
                value={String(form.repeatCount)}
                onChange={(e) => setForm({ ...form, repeatCount: Number(e.target.value) })}
                disabled={form.repeat === 'once'}
              >
                {[2, 3, 4, 5, 6, 8, 10, 12].map((n) => (
                  <option key={n} value={String(n)}>{n} times</option>
                ))}
              </SelectInput>
            </div>
            {form.repeat !== 'once' && (
              <div className="space-y-1">
                {expandRecurrence(form).map((o, i) => (
                  <p key={i} className="text-[11px] font-mono text-muted-foreground">
                    #{i + 1} · {fmtShort(o.startDate)} · return date set at approval
                  </p>
                ))}
                <p className="text-[10px] text-muted-foreground pt-0.5">Each occurrence is submitted as its own request with its own approval chain.</p>
              </div>
            )}
          </div>

          <TextArea
            label="Reason / explanation"
            value={form.reason}
            onChange={(e) => setForm({ ...form, reason: e.target.value })}
            rows={3}
            placeholder="Brief explanation of the leave request…"
          />

          <div className="rounded-xl border border-border bg-warm dark:bg-muted/30 p-3.5 space-y-3">
            <label className="flex items-center gap-2 text-[12px] text-foreground">
              <input
                type="checkbox"
                checked={form.emergency}
                onChange={(e) => setForm({ ...form, emergency: e.target.checked })}
                className="accent-teal-700"
              />
              <span className="flex items-center gap-1.5 font-semibold">
                <Siren className="w-3.5 h-3.5 text-amber-600" /> Emergency exception
              </span>
              <span className="text-[10px] text-muted-foreground">approval sends a privacy-safe SMS</span>
            </label>
            {form.emergency && (
              <TextInput
                label="Emergency reason"
                hint="Shown to approvers only; withheld from the SMS."
                value={form.emergencyReason}
                onChange={(e) => setForm({ ...form, emergencyReason: e.target.value })}
                placeholder="e.g. urgent family emergency"
              />
            )}
          </div>

          <div>
            <label className="text-[12px] font-semibold text-foreground block mb-1.5">Supporting document (optional)</label>
            <div className="flex items-center gap-2 rounded-xl border border-dashed border-input px-3 py-2.5">
              <Paperclip className="w-4 h-4 text-muted-foreground" />
              <input
                value={form.documentName}
                onChange={(e) => setForm({ ...form, documentName: e.target.value })}
                placeholder={policy?.requiredDocs[0] ? `e.g. ${policy.requiredDocs[0].toLowerCase()}.pdf` : 'document file name, if any'}
                className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
              />
            </div>
          </div>

          <Panel
            title="Policy compliance"
            subtitle={policy ? `Policy v${policy.version} — ${typeOf(form.leaveTypeId)?.name} · ${typeOf(form.leaveTypeId)?.swahili}` : 'No policy configured for this type'}
          >
            <div className="space-y-2.5">
              {checks.map((c, i) => (
                <div key={i} className={cn('flex items-start gap-2.5 rounded-xl border px-3 py-2.5', c.toneCls)}>
                  <c.Icon className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <p className="text-[12px] leading-snug text-foreground/90">{c.text}</p>
                </div>
              ))}
            </div>
          </Panel>

          {supervisorMode && (
            <Panel title="Approval chain" subtitle="Assigned from zone, department, role and duration">
              {(() => {
                if (preview.state === 'loading') {
                  return <p className="text-[12px] text-muted-foreground">Resolving the approval chain…</p>
                }
                if (preview.state === 'denied') {
                  return (
                    <p className="text-[12px] text-amber-700 dark:text-amber-400">
                      You are not authorised to preview this employee's approval chain.
                    </p>
                  )
                }
                if (preview.state === 'failed') {
                  return (
                    <p className="text-[12px] text-rose-700 dark:text-rose-400">
                      Could not resolve the approval chain. The server returned an error.
                    </p>
                  )
                }
                // preview.state === 'ready'
                const steps = preview.steps
                if (steps.length === 0) {
                  return <p className="text-[12px] text-muted-foreground">No workflow defined for this leave type.</p>
                }
                return (
                  <div className="space-y-2">
                    {steps.map((s, i) => (
                      <div key={i} className="flex items-center gap-3 rounded-xl border border-border bg-warm dark:bg-muted/30 px-3 py-2.5">
                        <span className="text-[11px] font-mono text-muted-foreground w-4">{i + 1}</span>
                        <Avatar id={s.assigneeId} size="sm" />
                        <div className="min-w-0 flex-1">
                          <p className="text-[12px] font-semibold text-foreground truncate">{s.assigneeName}</p>
                          <p className="text-[10px] text-muted-foreground truncate">{s.roleLabel}{s.via === 'delegation' ? ' · via delegation' : ''}</p>
                        </div>
                        {s.role === 'FINAL_AUTHORITY' && (
                          <span className="text-[9px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 shrink-0">final</span>
                        )}
                      </div>
                    ))}
                  </div>
                )
              })()}
            </Panel>
          )}
        </div>
      </Modal>

      <Modal
        open={detail !== null}
        onClose={() => setDetail(null)}
        title={detail ? `${detail.ref} — application details` : 'Request details'}
        subtitle="Full application, documents and approval chain."
        size="lg"
        footer={
          detail && canAct(detail) && nextPending(detail) ? (
            <div className="flex flex-wrap items-center gap-2">
              <Btn variant="emerald" onClick={() => { const s = nextPending(detail)!; setApproveTarget({ request: detail, stepOrder: s.order }); setApproveReturnDate(detail.startDate >= TODAY ? detail.startDate : TODAY); setDetail(null) }}>
                <Check className="w-3.5 h-3.5" /> Approve
              </Btn>
              <Btn variant="outline" className="border-orange-300 text-orange-700 hover:bg-orange-50 dark:text-orange-300 dark:hover:bg-orange-950" onClick={() => { const s = nextPending(detail)!; decide(detail.id, s.order, 'returned', '(from detail)'); setDetail(null) }}>
                <RotateCcw className="w-3.5 h-3.5" /> Return
              </Btn>
              <Btn variant="danger" onClick={() => { const s = nextPending(detail)!; decide(detail.id, s.order, 'rejected', '(from detail)'); setDetail(null) }}>
                <X className="w-3.5 h-3.5" /> Reject
              </Btn>
            </div>
          ) : undefined
        }
      >
        {detail ? <RequestDetail request={detail} isHr={can('documents', 'view_medical_documents')} /> : null}
      </Modal>

      <Modal
        open={editTarget !== null}
        onClose={() => setEditTarget(null)}
        title={editTarget ? `Update ${editTarget.ref}` : 'Update request'}
        subtitle="Change dates or reason. The approval chain and audit trail are preserved."
        size="md"
        footer={
          <Btn onClick={saveEdit} disabled={!editForm.reason.trim()}>
            <Check className="w-3.5 h-3.5" /> Save changes
          </Btn>
        }
      >
        <div className="space-y-4">
          {editTarget && (
            <>
              <div className="flex items-center gap-2.5">
                <Avatar id={editTarget.employeeId} size="sm" />
                <div>
                  <p className="text-[12px] font-semibold text-foreground">{typeOf(editTarget.leaveTypeId)?.name}</p>
                  <p className="text-[11px] text-muted-foreground">
                    Original days: {editTarget.days || '—'} · now would be {editForm.isHalfDay ? '½' : (editForm.endDate ? dayCount(editForm.startDate, editForm.endDate) : 'return set at approval')}
                  </p>
                </div>
              </div>
              <TextInput type="date" label="Start date" value={editForm.startDate} onChange={(e) => setEditForm({ ...editForm, startDate: e.target.value })} />
              <div className="flex items-start gap-2.5 rounded-xl border border-sky-200 bg-sky-50 px-3 py-2.5 dark:border-sky-900 dark:bg-sky-950/40">
                <Info className="w-4 h-4 mt-0.5 text-sky-700 dark:text-sky-300 flex-shrink-0" />
                <p className="text-[12px] leading-snug text-foreground/90">The return date (and therefore number of days) is set by the approving officer when the leave is granted.</p>
              </div>
              <label className="flex items-center gap-2 text-[12px] text-foreground">
                <input type="checkbox" checked={editForm.isHalfDay} onChange={(e) => setEditForm({ ...editForm, isHalfDay: e.target.checked })} className="accent-teal-700" /> Half-day request
              </label>
              <TextArea label="Reason / explanation" value={editForm.reason} onChange={(e) => setEditForm({ ...editForm, reason: e.target.value })} rows={3} />
            </>
          )}
        </div>
      </Modal>

      <ConfirmModal
        open={deleteTarget !== null}
        onClose={() => { setDeleteTarget(null); setDeleteReason('') }}
        title={deletingDraft ? 'Delete this draft?' : 'Withdraw this request?'}
        confirmLabel={deletingDraft ? 'Delete draft' : 'Withdraw request'}
        message={
          <div className="space-y-3">
            {deletingDraft ? (
              <p>
                {deleteTarget?.ref} was never submitted, so it has no approval history — it will be removed
                completely and will not appear anywhere in the list. The deletion itself is written to the
                audit trail and cannot be undone.
              </p>
            ) : (
              <>
                <p>
                  This will remove {deleteTarget?.ref} from the active list and close its approval chain. The
                  action is written to the audit trail — it cannot be undone.
                </p>
                <input
                  value={deleteReason}
                  onChange={(e) => setDeleteReason(e.target.value)}
                  placeholder="Reason for removal (recorded)"
                  className="w-full h-10 rounded-xl border border-input bg-card px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/40"
                />
              </>
            )}
          </div>
        }
        onConfirm={confirmDelete}
      />

      <Modal
        open={approveTarget !== null}
        onClose={() => { setApproveTarget(null); resetSignature() }}
        title={approveTarget ? `Approve ${approveTarget.request.ref}` : 'Approve request'}
        subtitle="Grant the leave and set the return date. This decides the number of days and finalises the record."
        size="md"
        footer={
          signatureStep === 'completed' ? (
          <div className="flex items-center gap-2">
            <Btn
              variant="emerald"
              disabled={!approveReturnDate}
              onClick={() => {
                if (!approveTarget) return
                decide(approveTarget.request.id, approveTarget.stepOrder, 'approved', '(approved with return date)', approveReturnDate, signatureData.path ?? undefined, signatureData.hash ?? undefined)
                resetSignature()
                setApproveTarget(null)
              }}
            >
              <Check className="w-3.5 h-3.5" /> Grant leave
            </Btn>
            <Btn variant="outline" onClick={() => { setApproveTarget(null); resetSignature() }}>Cancel</Btn>
          </div>
          ) : undefined
        }
      >
        {approveTarget && (
          <>
            <ApprovalModal
              open={signatureStep === 'pending'}
              onClose={() => {
                // Cancel/X on the signature dialog cancels the whole approval;
                // setting the step back to "pending" would only reopen it.
                setApproveTarget(null)
                resetSignature()
              }}
              allowOverwrite={true}
              onSignatureComplete={async (path: string, hash: string) => {
                setSignatureData({ path, hash })
                setSignatureStep('completed')
              }}
            />
            {signatureStep === 'completed' && (
          <div className="space-y-4">
            <div className="rounded-xl border border-border bg-warm dark:bg-muted/30 px-3 py-2.5">
              <p className="text-[12px] font-semibold text-foreground">
                {typeOf(approveTarget.request.leaveTypeId)?.name} — proposed from {fmtShort(approveTarget.request.startDate)}
              </p>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                {approveTarget.request.reason || 'No reason given.'}
              </p>
            </div>
            <TextInput
              type="date"
              label="Return to work date"
              hint="The day the employee resumes duty; leave days are counted up to the day before this date."
              value={approveReturnDate}
              onChange={(e) => setApproveReturnDate(e.target.value)}
            />
            <p className="text-[12px] font-mono text-foreground">
              {approveReturnDate ? `≈ ${fmtShort(approveTarget.request.startDate)} → ${fmtShort(approveReturnDate)} · ${dayCount(approveTarget.request.startDate, approveReturnDate)} day${dayCount(approveTarget.request.startDate, approveReturnDate) === 1 ? '' : 's'}` : 'Set the return date to grant leave.'}
            </p>
          </div>
            )}
          </>
        )}
      </Modal>
    </div>
  )
}

function toApprovalStep(ci: ChainItem, i: number): ApprovalStep {
  return {
    order: i + 1,
    role: ci.role as ApprovalStep['role'],
    roleLabel: ci.role_label,
    assigneeId: ci.assignee_id ?? '',
    assigneeName: ci.assignee_name ?? '',
    via: ci.via,
    slaDays: ci.sla_days,
    dueAt: ci.due_at,
    status: 'pending',
    comments: ci.note ?? undefined,
  }
}

interface CheckItem {
  Icon: typeof Check
  text: string
  toneCls: string
}

function policyChecks(
  form: PartState,
  days: number,
  employees: EmployeeRow[],
  requests: LeaveRequest[],
  policies: ReturnType<typeof useLeave>['policies'],
  leaveTypes: LeaveType[],
  balanceFor: ReturnType<typeof useLeave>['balanceFor'],
): CheckItem[] {
  const policy = policyEffectiveAt(form.leaveTypeId, TODAY, policies)
  const lt = leaveTypes.find((t) => t.id === form.leaveTypeId)
  const emp = employees.find((e) => e.id === form.employeeId)
  const out: CheckItem[] = []

  if (!policy || !lt) {
    out.push({ Icon: X, toneCls: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950 dark:text-rose-300 dark:border-rose-900', text: 'No policy found for this leave type.' })
    return out
  }

  // The applicant list loads asynchronously and scoped officers choose from it,
  // so this can run for a frame before an employee resolves. Bail out with a
  // prompt rather than dereferencing `undefined.hireDate`.
  if (!emp) {
    out.push({ Icon: X, toneCls: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950 dark:text-rose-300 dark:border-rose-900', text: 'Choose an applicant to run the policy checks.' })
    return out
  }

  const bal = balanceFor(form.employeeId, form.leaveTypeId)
  const tenure = tenureMonths(emp.hireDate)

  if (tenure < policy.minTenureMonths) {
    out.push({ Icon: X, toneCls: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950 dark:text-rose-300 dark:border-rose-900', text: `Minimum tenure of ${policy.minTenureMonths} months not met (have ${tenure}).` })
  } else {
    out.push({ Icon: Check, toneCls: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-900', text: 'Tenure requirement satisfied.' })
  }

  if (days > policy.maxDaysPerRequest) {
    out.push({ Icon: X, toneCls: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950 dark:text-rose-300 dark:border-rose-900', text: `${days} days exceeds the ${policy.maxDaysPerRequest}-day per-request maximum.` })
  } else if (bal.accrued > 0 && days > bal.remaining) {
    out.push({ Icon: X, toneCls: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-900', text: `Balance of ${bal.remaining} days is lower than the ${days} days requested.` })
  } else {
    out.push({ Icon: Check, toneCls: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-900', text: `Within balance: ${bal.remaining} of ${bal.accrued} days remain.` })
  }

  const notice = Math.max(0, Math.round((new Date(form.startDate).getTime() - new Date(TODAY).getTime()) / 86400000))
  if (notice < policy.minNoticeDays) {
    out.push({ Icon: AlertTriangle, toneCls: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-900', text: `${lt.name} requires a ${policy.minNoticeDays}-day notice; you are submitting ${notice}.` })
  } else {
    out.push({ Icon: Check, toneCls: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-900', text: `Notice period of ${notice} days meets the ${policy.minNoticeDays}-day minimum.` })
  }

  if (policy.requiresDocuments) {
    out.push({ Icon: Paperclip, toneCls: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-900', text: `Required documents: ${policy.requiredDocs.join(', ')}.` })
  } else {
    out.push({ Icon: Check, toneCls: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-900', text: 'No documents required for this leave type.' })
  }

  const overlap = form.endDate
    ? requests.find(
        (r) =>
          r.employeeId === form.employeeId &&
          (r.status === 'approved' || r.status === 'under_review') &&
          r.startDate <= form.endDate &&
          r.endDate >= form.startDate,
      )
    : requests.find(
        (r) =>
          r.employeeId === form.employeeId &&
          (r.status === 'approved' || r.status === 'under_review') &&
          r.endDate >= form.startDate,
      )
  if (overlap) {
    out.push({ Icon: X, toneCls: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950 dark:text-rose-300 dark:border-rose-900', text: `Dates overlap an existing ${leaveTypes.find((t) => t.id === overlap.leaveTypeId)?.short ?? overlap.leaveTypeId} request (${fmtShort(overlap.startDate)} → ${fmtShort(overlap.endDate)}).` })
  } else {
    out.push({ Icon: Check, toneCls: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-900', text: 'No overlap with approved or in-review requests.' })
  }

  out.push({ Icon: Info, toneCls: 'bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950 dark:text-sky-300 dark:border-sky-900', text: policy.notes })

  if (form.emergency) {
    out.push({
      Icon: Siren,
      toneCls: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-900',
      text: form.emergencyReason?.trim()
        ? `Emergency exception: approval will send a privacy-safe SMS. Reason recorded: ${form.emergencyReason.trim()}.`
        : 'Emergency exception: an approver must record the emergency reason before submission.',
    })
  }

  return out
}