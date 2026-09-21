'use client'

import { useMemo, useState } from 'react'
import {
  FolderKanban,
  FolderOpen,
  Inbox,
  CheckCircle2,
  Archive,
  ArrowRightLeft,
  Eye,
  Check,
  X,
  CalendarClock,
  BookOpen,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  fmtShort,
  getEmployee,
  CASE_STATUS_STYLE,
  HANDOVER_STATUS_STYLE,
  handoversFor,
  pendingHandoversFor,
} from '@/lib/leave'
import { useLeave } from '@/components/leave/leave-context'
import {
  Avatar,
  TypePill,
  SectionHeading,
  Panel,
  EmptyState,
  TableToolbar,
  RowMenu,
  Modal,
  StatCard,
  Btn,
  SelectInput,
  TextArea,
  Pagination,
  usePaged,
  ConfirmModal,
  Tabs,
  type RowMenuItem,
} from '@/components/leave/shared'
import { RequestDetail } from '@/components/leave/request-detail'

export function CasesView() {
  const { cases, handovers, requests, employees, employeeId, recordHandover, acceptHandover, rejectHandover, closeCase, caseOf, can } = useLeave()
  const [tab, setTab] = useState('cases')
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [docFilter, setDocFilter] = useState('all')
  const [detailRequestId, setDetailRequestId] = useState<string | null>(null)
  const [hoCase, setHoCase] = useState<string | null>(null)
  const [toOwnerId, setToOwnerId] = useState('')
  const [hoReason, setHoReason] = useState('')
  const [closeTarget, setCloseTarget] = useState<string | null>(null)

  const openCases = cases.filter((c) => c.status === 'open' || c.status === 'on_hold').length
  const pendingHos = handovers.filter((h) => h.status === 'pending').length
  const acceptedHos = handovers.filter((h) => h.status === 'accepted').length
  const closedCases = cases.filter((c) => c.status === 'closed').length

  const rows = useMemo(
    () =>
      cases
        .filter((c) => {
          if (statusFilter !== 'all' && c.status !== statusFilter) return false
          const pending = pendingHandoversFor(c.id, handovers).length > 0
          const rejected = handoversFor(c.id, handovers).some((h) => h.status === 'rejected')
          if (docFilter === 'pending' && !pending) return false
          if (docFilter === 'accepted' && (pending || rejected)) return false
          if (docFilter === 'rejected' && !rejected) return false
          const q = search.trim().toLowerCase()
          if (!q) return true
          const emp = empOf(c.employeeId)
          return c.ref.toLowerCase().includes(q) || (emp?.name ?? '').toLowerCase().includes(q)
        })
        .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || '')),
    [cases, handovers, statusFilter, docFilter, search],
  )
  const paged = usePaged(rows, 10)

  const detailRequest = useMemo(
    () => requests.find((r) => r.id === detailRequestId) ?? null,
    [requests, detailRequestId],
  )
  const hoCaseRecord = cases.find((c) => c.id === hoCase) ?? null

  const empOf = (id: string) => employees.find((e) => e.id === id) ?? getEmployee(id)
  const nameOf = (id: string) => empOf(id)?.name || id || '—'

  const statementFor = (caseId: string) => {
    const all = handoversFor(caseId, handovers)
    const latest = all[all.length - 1]
    if (latest?.status === 'rejected') return 'rejected' as const
    return pendingHandoversFor(caseId, handovers).length > 0 ? ('pending' as const) : ('accepted' as const)
  }

  const buildMenu = (c: (typeof cases)[number]): RowMenuItem[] => {
    const items: RowMenuItem[] = [{ icon: Eye, label: 'View request details', onClick: () => setDetailRequestId(c.requestId) }]
    const myPending = pendingHandoversFor(c.id, handovers).find((h) => h.toOwnerId === employeeId)
    if (myPending) {
      items.push({ icon: Check, label: 'Accept docket', onClick: () => acceptHandover(myPending.id) })
      items.push({ icon: X, label: 'Decline docket (pauses request)', tone: 'danger', onClick: () => rejectHandover(myPending.id, 'Declined by proposed owner.') })
    }
    items.push({
      icon: ArrowRightLeft,
      label: 'Record handover',
      disabled: c.status === 'closed',
      title: c.status === 'closed' ? 'Closed cases cannot be handed over' : undefined,
      onClick: () => {
        setHoCase(c.id)
        setToOwnerId('')
        setHoReason('')
      },
    })
    items.push({
      icon: Archive,
      label: 'Close case',
      tone: 'danger',
      disabled: c.status === 'closed',
      onClick: () => setCloseTarget(c.id),
    })
    return items
  }

  return (
    <div className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      <SectionHeading
        title="Case Handovers"
        subtitle="Docket continuity — every approval chain runs as a case. Handovers keep documents and decisions attached when ownership changes."
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard icon={FolderOpen} label="Open cases" value={openCases} hint="Active approval dockets" tone="teal" />
        <StatCard icon={Inbox} label="Pending handovers" value={pendingHos} hint="Awaiting acceptance — decisions are gated" tone="amber" />
        <StatCard icon={CheckCircle2} label="Handovers accepted" value={acceptedHos} hint="Continuity preserved" tone="emerald" />
        <StatCard icon={Archive} label="Closed cases" value={closedCases} hint="Rejected, withdrawn or done" tone="sky" />
      </div>

      <Tabs
        tabs={[
          { value: 'cases', label: 'Cases & docket state', icon: FolderKanban, badge: rows.length },
          { value: 'how', label: 'How docket continuity works', icon: BookOpen },
        ]}
        value={tab}
        onChange={setTab}
      />

      {tab === 'cases' && (
      <Panel
        title="Cases & docket state"
        subtitle={`${rows.length} case${rows.length === 1 ? '' : 's'} — decisions on a handed-over case are blocked until the new owner accepts it`}
      >
        <TableToolbar
          search={search}
          onSearch={setSearch}
          placeholder="Search case reference or applicant…"
          count={paged.total}
          filters={[
            {
              label: 'Case status',
              value: statusFilter,
              onChange: setStatusFilter,
              options: [
                { value: 'all', label: 'All cases' },
                { value: 'open', label: 'Open' },
                { value: 'on_hold', label: 'On hold' },
                { value: 'closed', label: 'Closed' },
              ],
            },
            {
              label: 'Docket state',
              value: docFilter,
              onChange: setDocFilter,
              options: [
                { value: 'all', label: 'All dockets' },
                { value: 'pending', label: 'Pending handover' },
                { value: 'accepted', label: 'Accepted' },
                { value: 'rejected', label: 'Declined' },
              ],
            },
          ]}
        />
        {paged.items.length === 0 ? (
          <EmptyState title="No cases match" hint="Cases open automatically when a request is submitted." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="text-[11px] uppercase tracking-wider text-muted-foreground">
                  <th className="py-3 px-5 font-semibold">Case</th>
                  <th className="py-3 px-3 font-semibold hidden md:table-cell">Applicant · Type</th>
                  <th className="py-3 px-3 font-semibold hidden lg:table-cell">Leave</th>
                  <th className="py-3 px-3 font-semibold hidden lg:table-cell">Hearing</th>
                  <th className="py-3 px-3 font-semibold">Current owner</th>
                  <th className="py-3 px-3 font-semibold hidden sm:table-cell">Docket</th>
                  <th className="py-3 px-3 font-semibold hidden sm:table-cell">Status</th>
                  <th className="py-3 px-3 font-semibold text-right w-10">Manage</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {paged.items.map((c) => {
                  const emp = empOf(c.employeeId)
                  const owner = empOf(c.ownerId)
                  const req = requests.find((r) => r.id === c.requestId)
                  const docState = statementFor(c.id)
                  return (
                    <tr key={c.id} className="text-[13px] align-middle hover:bg-accent/40 transition-colors">
                      <td className="py-3 px-5">
                        <p className="font-mono text-foreground font-semibold">{c.ref}</p>
                        <p className="text-[11px] text-muted-foreground">Opened {fmtShort(c.createdAt)}</p>
                      </td>
                      <td className="hidden md:table-cell py-3 px-3">
                        <div className="flex items-center gap-2">
                          <Avatar id={c.employeeId} size="sm" />
                          <div className="min-w-0">
                            <p className="font-medium text-foreground truncate">{emp?.name ?? '—'}</p>
                            <TypePill leaveTypeId={c.leaveTypeId} showName />
                          </div>
                        </div>
                      </td>
                      <td className="hidden lg:table-cell py-3 px-3 text-muted-foreground whitespace-nowrap">
                        {req ? (
                          <>
                            {fmtShort(req.startDate)} → {fmtShort(req.endDate)}
                            <span className="block text-[11px]">{req.days} day{req.days === 1 ? '' : 's'}</span>
                          </>
                        ) : '—'}
                      </td>
                      <td className="hidden lg:table-cell py-3 px-3">
                        {c.nextHearingDate ? (
                          <div className="space-y-1">
                            <span className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground">
                              <CalendarClock className="w-3 h-3" /> {fmtShort(c.nextHearingDate)}
                            </span>
                            {req && req.startDate <= c.nextHearingDate && c.nextHearingDate <= req.endDate && (
                              <span className="flex items-center gap-1 rounded-full bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950 dark:text-rose-300 dark:border-rose-900 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide">
                                <X className="w-2.5 h-2.5" /> hearing conflict
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-[11px] text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-2">
                          <Avatar id={c.ownerId} size="sm" />
                          <div className="min-w-0">
                            <p className="font-medium text-foreground truncate">{owner?.name ?? 'Unassigned'}</p>
                            <p className="text-[11px] text-muted-foreground truncate">{owner?.title ?? ''}</p>
                          </div>
                        </div>
                      </td>
                      <td className="hidden sm:table-cell py-3 px-3">
                        <span className={cn('inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-semibold', HANDOVER_STATUS_STYLE[docState])}>
                          {docState === 'pending' ? (
                            <><Inbox className="w-3 h-3" /> Pending handover</>
                          ) : docState === 'rejected' ? (
                            <><X className="w-3 h-3" /> Declined</>
                          ) : (
                            <><Check className="w-3 h-3" /> Accepted</>
                          )}
                        </span>
                      </td>
                      <td className="hidden sm:table-cell py-3 px-3">
                        <span className={cn('inline-flex items-center rounded-full border px-2.5 py-1 text-[10px] font-semibold capitalize', CASE_STATUS_STYLE[c.status])}>
                          {c.status.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right">
                        <RowMenu items={buildMenu(c)} align="left" />
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
        <Pagination page={paged.page} pageSize={paged.size} total={paged.total} onPage={paged.setPage} onPageSize={paged.setSize} />
      </Panel>
      )}

      <Modal
        open={detailRequest !== null}
        onClose={() => setDetailRequestId(null)}
        title={detailRequest ? `${detailRequest.ref} — request details` : 'Request details'}
        subtitle="The docket attached to this approval chain."
        size="lg"
      >
        {detailRequest ? (
          <>
            <RequestDetail request={detailRequest} isHr={can('documents', 'view_medical_documents')} />
            {(() => {
              const c = caseOf(detailRequest.id)
              if (!c) return null
              const trail = handoversFor(c.id, handovers)
              if (trail.length === 0) return null
              return (
                <div className="mt-5 rounded-xl border border-border p-4">
                  <p className="text-[11px] text-muted-foreground uppercase tracking-wide font-semibold mb-3">
                    Handover trail — {c.ref}
                  </p>
                  <ol className="space-y-0">
                    {trail.map((h, idx) => (
                      <li key={h.id} className="relative pl-6 pb-4 last:pb-0">
                        {idx < trail.length - 1 && <span className="absolute left-[9px] top-5 bottom-0 w-px bg-border" />}
                        <span className={cn('absolute left-[5px] top-[6px] h-2.5 w-2.5 rounded-full ring-2 ring-card', h.status === 'pending' ? 'bg-amber-500' : h.status === 'rejected' ? 'bg-rose-500' : 'bg-emerald-500')} />
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-[12px] font-semibold text-foreground">
                            {nameOf(h.fromOwnerId).split(' ')[0]} → {nameOf(h.toOwnerId).split(' ')[0]}
                          </span>
                          <span className={cn('rounded-full border px-2 py-0.5 text-[10px] font-semibold', HANDOVER_STATUS_STYLE[h.status])}>
                            {h.status.replace('_', ' ')}
                          </span>
                          <span className="text-[11px] text-muted-foreground ml-auto">{fmtShort(h.createdAt)}</span>
                        </div>
                        <p className="text-[11px] text-muted-foreground mt-1">{h.reason}</p>
                      </li>
                    ))}
                  </ol>
                </div>
              )
            })()}
          </>
        ) : null}
      </Modal>

      <Modal
        open={hoCase !== null}
        onClose={() => setHoCase(null)}
        title={hoCaseRecord ? `Record handover — ${hoCaseRecord.ref}` : 'Record handover'}
        subtitle="Ownership of the docket transfers; the new owner must accept before deciding."
        size="md"
        footer={
          <>
            <Btn variant="outline" onClick={() => setHoCase(null)}>Cancel</Btn>
            <Btn
              variant="primary"
              disabled={!toOwnerId || !hoReason.trim()}
              onClick={() => {
                if (hoCaseRecord) recordHandover(hoCaseRecord.id, { toOwnerId, reason: hoReason.trim() })
                setHoCase(null)
              }}
            >
              <ArrowRightLeft className="w-3.5 h-3.5" /> Record handover
            </Btn>
          </>
        }
      >
        {hoCaseRecord && (
          <div className="space-y-4">
            <div className="rounded-xl border border-border bg-secondary/50 px-3 py-2.5">
              <p className="text-[11px] text-muted-foreground">Current owner</p>
              <div className="flex items-center gap-2 mt-1">
                <Avatar id={hoCaseRecord.ownerId} size="sm" />
                <div>
                  <p className="text-[13px] font-semibold text-foreground">{empOf(hoCaseRecord.ownerId)?.name ?? 'Unassigned'}</p>
                  <p className="text-[11px] text-muted-foreground">{empOf(hoCaseRecord.ownerId)?.title ?? ''}</p>
                </div>
              </div>
            </div>
            <SelectInput
              label="Transfer docket to"
              hint="Any active staff member can hold a docket."
              value={toOwnerId}
              onChange={(e) => setToOwnerId(e.target.value)}
            >
              <option value="">Choose the new owner…</option>
              {employees
                .filter((e) => e.active && e.id !== hoCaseRecord.ownerId)
                .map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.name} — {e.title}
                  </option>
                ))}
            </SelectInput>
            <TextArea
              label="Handover reason"
              hint="Recorded in the audit trail and shown to the new owner."
              value={hoReason}
              onChange={(e) => setHoReason(e.target.value)}
              placeholder="e.g. Zonal head on official duty — docket transferred for decision…"
            />
          </div>
        )}
      </Modal>

      <ConfirmModal
        open={closeTarget !== null}
        onClose={() => setCloseTarget(null)}
        title="Close this case"
        message={
          closeTarget ? (
            <>
              Close the docket for <strong className="text-foreground">{cases.find((c) => c.id === closeTarget)?.ref}</strong>?
              Once closed, no further approvals or handovers are allowed. The closure is recorded in the audit trail.
            </>
          ) : null
        }
        confirmLabel="Close case"
        tone="danger"
        onConfirm={() => {
          if (closeTarget) closeCase(closeTarget, 'Closed from the Case Handovers ledger.')
          setCloseTarget(null)
        }}
      />

      {tab === 'how' && (
      <Panel title="How docket continuity works" icon={FolderKanban}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-[12px] text-muted-foreground leading-relaxed">
          <div className="rounded-xl border border-border p-3.5">
            <p className="flex items-center gap-1.5 font-semibold text-foreground mb-1"><FolderOpen className="w-3.5 h-3.5 text-teal-700" /> 1. Cases open on submission</p>
            Every submitted request automatically opens a case tied to its reference, applicant and approval chain.
          </div>
          <div className="rounded-xl border border-border p-3.5">
            <p className="flex items-center gap-1.5 font-semibold text-foreground mb-1"><ArrowRightLeft className="w-3.5 h-3.5 text-amber-600" /> 2. Ownership follows the chain</p>
            When responsibility moves — chain step, delegation or a recorded handover — a pending handover is created for the next owner.
          </div>
          <div className="rounded-xl border border-border p-3.5">
            <p className="flex items-center gap-1.5 font-semibold text-foreground mb-1"><Check className="w-3.5 h-3.5 text-emerald-600" /> 3. Decisions are gated</p>
            Approving, returning or rejecting a case with a pending handover to you is blocked until you accept the docket.
          </div>
        </div>
      </Panel>
      )}
    </div>
  )
}