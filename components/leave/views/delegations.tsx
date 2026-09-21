'use client'

import { useState } from 'react'
import { Plus, ShieldCheck, Eye, Play, History, Power, ArrowRight, Handshake, Hourglass, UserRoundPlus, ScrollText, Route } from 'lucide-react'
import { cn } from '@/lib/utils'
import { TODAY, addDays, fmtShort, getEmployee, roleLabels, type ApproverRole } from '@/lib/leave'
import { useLeave } from '@/components/leave/leave-context'
import {
  SectionHeading,
  Panel,
  Avatar,
  EmptyState,
  Modal,
  TableToolbar,
  RowMenu,
  ConfirmModal,
  SelectInput,
  TextInput,
  StatCard,
  Btn,
  Pagination,
  usePaged,
  Tabs,
  type RowMenuItem,
} from '@/components/leave/shared'

const SCOPES: { value: string; label: string }[] = [
  { value: 'SUPERVISOR', label: 'Supervisor authority' },
  { value: 'DEPT_HEAD', label: 'Department head authority' },
  { value: 'ZONAL_HEAD', label: 'Zone / regional head authority' },
  { value: 'ALL', label: 'All my approval authority' },
]

const AUTHORITY_HOLDERS = ['e1', 'e3', 'e4', 'e5', 'e6']

export function DelegationsView() {
  const { delegations, createDelegation, setDelegationActive, supervisorMode, employees } = useLeave()
  const [tab, setTab] = useState('register')
  const [open, setOpen] = useState(false)
  const [delegatorId, setDelegatorId] = useState('e5')
  const [delegateId, setDelegateId] = useState('e7')
  const [scope, setScope] = useState('DEPT_HEAD')
  const [start, setStart] = useState(TODAY)
  const [end, setEnd] = useState(addDays(TODAY, 30))
  const [search, setSearch] = useState('')
  const [scopeFilter, setScopeFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [detail, setDetail] = useState<(typeof delegations)[number] | null>(null)
  const [revokeTarget, setRevokeTarget] = useState<(typeof delegations)[number] | null>(null)

  const activeCount = delegations.filter((d) => d.active).length
  const revokedCount = delegations.length - activeCount
  const expiring = delegations.filter((d) => d.active && d.endDate >= TODAY && d.endDate <= addDays(TODAY, 14)).length

  const submit = () => {
    if (delegatorId === delegateId) return
    createDelegation({ delegatorId, delegateId, scope, startDate: start, endDate: end })
    setOpen(false)
  }

  const visible = delegations
    .filter((d) => {
      if (scopeFilter !== 'all' && d.scope !== scopeFilter) return false
      if (statusFilter === 'active' && !d.active) return false
      if (statusFilter === 'revoked' && d.active) return false
      const q = search.trim().toLowerCase()
      if (!q) return true
      return (
        getEmployee(d.delegatorId).name.toLowerCase().includes(q) ||
        getEmployee(d.delegateId).name.toLowerCase().includes(q) ||
        (roleLabels[d.scope as ApproverRole] ?? d.scope).toLowerCase().includes(q)
      )
    })
    .sort((a, b) => (b.active ? 1 : 0) - (a.active ? 1 : 0))
  const paged = usePaged(visible, 8)

  const buildMenu = (d: (typeof delegations)[number]): RowMenuItem[] => [
    { icon: Eye, label: 'View details', onClick: () => setDetail(d) },
    {
      icon: d.active ? Power : Play,
      label: d.active ? 'Deactivate / revoke' : 'Reactivate',
      tone: d.active ? 'danger' : 'default',
      onClick: () => (d.active ? setRevokeTarget(d) : setDelegationActive(d.id, true)),
    },
  ]

  return (
    <div className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      <SectionHeading
        title="Delegations"
        subtitle="An approver can delegate authority for a period while the system preserves the original authority and full audit history."
        actions={
          <Btn onClick={() => setOpen(true)}>
            <Plus className="w-4 h-4" /> Create delegation
          </Btn>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard icon={Handshake} label="Active delegations" value={activeCount} hint="Authority currently delegated" tone="teal" />
        <StatCard icon={History} label="Revoked" value={revokedCount} hint="Restored to original holder" tone="rose" />
        <StatCard icon={Hourglass} label="Expiring soon" value={expiring} hint="Within the next 14 days" tone="amber" />
        <StatCard icon={UserRoundPlus} label="Delegates in use" value={new Set(delegations.filter((d) => d.active).map((d) => d.delegateId)).size} hint="Unique acting authorities" tone="emerald" />
      </div>

      <Tabs
        tabs={[
          { value: 'register', label: 'Delegation register', icon: ScrollText, badge: visible.length },
          { value: 'how', label: 'How delegation resolves', icon: Route },
        ]}
        value={tab}
        onChange={setTab}
      />

      {tab === 'register' && (
      <Panel
        title={`Delegation register (${visible.length})`}
        subtitle="Active authority overrides standing reporting lines; the original holder is always preserved"
      >
        <TableToolbar
          search={search}
          onSearch={setSearch}
          placeholder="Search names or scope…"
          count={visible.length}
          filters={[
            {
              label: 'Scope',
              value: scopeFilter,
              onChange: setScopeFilter,
              options: [{ value: 'all', label: 'All scopes' }, ...SCOPES.map((s) => ({ value: s.value, label: s.label }))],
            },
            {
              label: 'Status',
              value: statusFilter,
              onChange: setStatusFilter,
              options: [
                { value: 'all', label: 'All' },
                { value: 'active', label: 'Active' },
                { value: 'revoked', label: 'Revoked' },
              ],
            },
          ]}
        />
        {paged.items.length === 0 ? (
          <EmptyState title="No delegations found" hint="Adjust the search or filters, or create a delegation." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="text-[11px] uppercase tracking-wider text-muted-foreground">
                  <th className="py-3 px-5 font-semibold">Transfer</th>
                  <th className="py-3 px-3 font-semibold">Scope</th>
                  <th className="py-3 px-3 font-semibold">Period</th>
                  <th className="py-3 px-3 font-semibold hidden md:table-cell">Authorized by</th>
                  <th className="py-3 px-3 font-semibold">Status</th>
                  <th className="py-3 px-3 font-semibold text-right">Manage</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {paged.items.map((d) => (
                  <tr key={d.id} className={cn('text-[13px] align-middle group', !d.active && 'opacity-60')}>
                    <td className="py-3 px-5">
                      <div className="flex items-center gap-2">
                        <Avatar id={d.delegatorId} size="sm" />
                        <span className="font-semibold text-foreground whitespace-nowrap">{getEmployee(d.delegatorId).name}</span>
                        <ArrowRight className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                        <Avatar id={d.delegateId} size="sm" />
                        <span className="font-semibold text-foreground whitespace-nowrap">{getEmployee(d.delegateId).name}</span>
                      </div>
                    </td>
                    <td className="py-3 px-3">
                      <span className="text-[12px] text-foreground">{roleLabels[d.scope as ApproverRole] ?? d.scope}</span>
                    </td>
                    <td className="py-3 px-3 text-muted-foreground whitespace-nowrap">{fmtShort(d.startDate)} → {fmtShort(d.endDate)}</td>
                    <td className="py-3 px-3 text-muted-foreground hidden md:table-cell">{getEmployee(d.authorizedBy).name}</td>
                    <td className="py-3 px-3">
                      {d.active ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-900 px-2 py-0.5 text-[10px] font-semibold">
                          <ShieldCheck className="w-2.5 h-2.5" /> Authorized
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-zinc-100 text-zinc-500 border border-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:border-zinc-700 px-2 py-0.5 text-[10px] font-semibold">
                          <History className="w-2.5 h-2.5" /> Revoked
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-right">
                      {supervisorMode && <RowMenu items={buildMenu(d)} label="Manage" />}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <Pagination page={paged.page} pageSize={paged.size} total={paged.total} onPage={paged.setPage} onPageSize={paged.setSize} />
      </Panel>
      )}

      {tab === 'how' && (
      <Panel title="How delegation resolves" subtitle="Checked at every step assignment, not only at submission">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="rounded-xl border border-border p-3">
            <p className="text-[13px] font-semibold text-foreground mb-1">1. Active delegation</p>
            <p className="text-[11px] text-muted-foreground leading-relaxed">If the standing holder has delegated within the window, the delegate is assigned first.</p>
          </div>
          <div className="rounded-xl border border-border p-3">
            <p className="text-[13px] font-semibold text-foreground mb-1">2. Standing line</p>
            <p className="text-[11px] text-muted-foreground leading-relaxed">Otherwise the supervisor, department head or zonal head is resolved from the org structure.</p>
          </div>
          <div className="rounded-xl border border-border p-3">
            <p className="text-[13px] font-semibold text-foreground mb-1">3. Audit preserved</p>
            <p className="text-[11px] text-muted-foreground leading-relaxed">The original authority is never replaced — delegation is only a temporary route and is fully logged.</p>
          </div>
        </div>
      </Panel>
      )}

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Create a delegation"
        subtitle="Only for Supervisor / Department-head / Zonal-authority holders. Delegating person retains the original authority in audit."
        size="lg"
        footer={
          <Btn onClick={submit} disabled={delegatorId === delegateId}>
            <Plus className="w-3.5 h-3.5" /> Create delegation
          </Btn>
        }
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <SelectInput label="Delegator (granting authority)" hint="Only current authority holders are shown" value={delegatorId} onChange={(e) => setDelegatorId(e.target.value)}>
            {employees.filter((e) => AUTHORITY_HOLDERS.includes(e.id)).map((e) => (
              <option key={e.id} value={e.id}>{e.name} — {e.title}</option>
            ))}
          </SelectInput>
          <SelectInput label="Delegate (receives authority)" value={delegateId} onChange={(e) => setDelegateId(e.target.value)}>
            {employees.filter((e) => e.id !== delegatorId).map((e) => (
              <option key={e.id} value={e.id}>{e.name} — {e.title}</option>
            ))}
          </SelectInput>
          <div className="md:col-span-2">
            <label className="text-[12px] font-semibold text-foreground block mb-2">Scope</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
              {SCOPES.map((s) => (
                <button
                  key={s.value}
                  type="button"
                  onClick={() => setScope(s.value)}
                  className={cn(
                    'flex items-center gap-2 rounded-lg border px-3 py-2.5 text-[12px] font-medium text-left transition',
                    scope === s.value ? 'border-teal-600 bg-teal-50 dark:bg-teal-950' : 'border-border bg-card hover:border-zinc-300',
                  )}
                >
                  <span className={cn('h-2 w-2 rounded-full', scope === s.value ? 'bg-teal-600' : 'bg-muted-foreground/40')} />
                  {s.label}
                </button>
              ))}
            </div>
          </div>
          <TextInput label="From" type="date" value={start} onChange={(e) => setStart(e.target.value)} />
          <TextInput label="To" type="date" value={end} onChange={(e) => setEnd(e.target.value)} />
        </div>
      </Modal>

      <Modal
        open={detail !== null}
        onClose={() => setDetail(null)}
        title="Delegation details"
        subtitle={detail ? `${getEmployee(detail.delegatorId).name} → ${getEmployee(detail.delegateId).name}` : ''}
        size="md"
      >
        {detail && (
          <div className="grid grid-cols-2 gap-3">
            <DetailCell label="Delegator" value={getEmployee(detail.delegatorId).name} />
            <DetailCell label="Delegate" value={getEmployee(detail.delegateId).name} />
            <DetailCell label="Scope" value={roleLabels[detail.scope as ApproverRole] ?? detail.scope} />
            <DetailCell label="Authorized by" value={getEmployee(detail.authorizedBy).name} />
            <DetailCell label="From" value={fmtShort(detail.startDate)} />
            <DetailCell label="To" value={fmtShort(detail.endDate)} />
            <DetailCell label="Status" value={detail.active ? 'Active' : 'Revoked'} />
          </div>
        )}
      </Modal>

      <ConfirmModal
        open={revokeTarget !== null}
        onClose={() => setRevokeTarget(null)}
        title="Revoke delegation?"
        confirmLabel="Revoke"
        message={
          <p>
            Authority delegated by <span className="font-semibold text-foreground">{revokeTarget ? getEmployee(revokeTarget.delegatorId).name : ''}</span> to{' '}
            <span className="font-semibold text-foreground">{revokeTarget ? getEmployee(revokeTarget.delegateId).name : ''}</span> will be restored to the
            original holder. The revocation is written to the audit trail.
          </p>
        }
        onConfirm={() => {
          if (revokeTarget) setDelegationActive(revokeTarget.id, false)
        }}
      />
    </div>
  )
}

function DetailCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-secondary/50 p-3.5">
      <p className="text-[11px] text-muted-foreground">{label}</p>
      <p className="text-[13px] font-semibold text-foreground mt-1 truncate">{value}</p>
    </div>
  )
}