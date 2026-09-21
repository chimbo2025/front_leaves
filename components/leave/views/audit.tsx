'use client'

import { useState } from 'react'
import { ListChecks, History, ShieldAlert, FileText, Eye } from 'lucide-react'
import { cn } from '@/lib/utils'
import { getEmployee } from '@/lib/leave'
import { useLeave } from '@/components/leave/leave-context'
import {
  SectionHeading,
  Panel,
  Avatar,
  TableToolbar,
  RowMenu,
  Modal,
  EmptyState,
  StatCard,
  Pagination,
  usePaged,
  type RowMenuItem,
} from '@/components/leave/shared'

export function AuditView() {
  const { audit, supervisorMode, employees } = useLeave()
  const [search, setSearch] = useState('')
  const [entityFilter, setEntityFilter] = useState('all')
  const [actionFilter, setActionFilter] = useState('all')
  const [detail, setDetail] = useState<(typeof audit)[number] | null>(null)

  const empOf = (id: string) =>
    employees.find((e) => e.id === id) ?? employees.find((e) => e.userId === id) ?? getEmployee(id)

  const payloadView = (raw: string) => {
    try {
      const obj = JSON.parse(raw)
      if (obj && typeof obj === 'object' && !Array.isArray(obj)) {
        const entries = Object.entries(obj).map(([k, v]) => [k, String(v)] as [string, string])
        return { kind: 'json' as const, entries }
      }
    } catch {
      /* not JSON */
    }
    return { kind: 'text' as const, text: raw }
  }

  const entities = Array.from(new Set(audit.map((a) => a.entity)))
  const actions = Array.from(new Set(audit.map((a) => a.action)))

  const visible = audit.filter((a) => {
    if (entityFilter !== 'all' && a.entity !== entityFilter) return false
    if (actionFilter !== 'all' && a.action !== actionFilter) return false
    const q = search.trim().toLowerCase()
    if (!q) return true
    return (
      a.payload.toLowerCase().includes(q) ||
      a.entityId.toLowerCase().includes(q) ||
      a.hash.toLowerCase().includes(q) ||
      (empOf(a.actorId)?.name ?? '').toLowerCase().includes(q)
    )
  })
  const paged = usePaged(visible, 10)

  const buildMenu = (a: (typeof audit)[number]): RowMenuItem[] => [
    { icon: Eye, label: 'View record', onClick: () => setDetail(a) },
  ]

  return (
    <div className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      <SectionHeading
        title="Audit trail"
        subtitle="Hash-chained, tamper-evident history. Approved or rejected history is never deleted — corrections create new versions with a reason."
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard icon={ListChecks} label="Records" value={audit.length} hint="Every create, submit, decision, version and delegation" tone="teal" />
        <StatCard icon={ShieldAlert} label="Hash chaining" value="Active" hint="Each row embeds the previous hash" tone="emerald" />
        <StatCard icon={History} label="Reasons enforced" value="On" hint="Corrections require an explicit reason" tone="amber" />
      </div>

      <Panel
        title="Chained ledger"
        subtitle="Walk the chain forward to detect any tampering"
        actions={
          <span className="text-[11px] text-muted-foreground font-mono">head: <span className="text-teal-700">{audit[audit.length - 1]?.hash ?? '—'}</span></span>
        }
      >
        <TableToolbar
          search={search}
          onSearch={setSearch}
          placeholder="Search payload, id, hash, actor…"
          count={visible.length}
          filters={[
            {
              label: 'Entity',
              value: entityFilter,
              onChange: setEntityFilter,
              options: [{ value: 'all', label: 'All entities' }, ...entities.map((e) => ({ value: e, label: e }))],
            },
            {
              label: 'Action',
              value: actionFilter,
              onChange: setActionFilter,
              options: [{ value: 'all', label: 'All actions' }, ...actions.map((a) => ({ value: a, label: a }))],
            },
          ]}
        />
        {visible.length === 0 ? (
          <EmptyState title="No audit records match" hint="Adjust the search or filters." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left min-w-[900px]">
              <thead>
                <tr className="text-[11px] uppercase tracking-wider text-muted-foreground">
                  <th className="py-3 px-5 font-semibold">At</th>
                  <th className="py-3 px-3 font-semibold">Actor</th>
                  <th className="py-3 px-3 font-semibold">Entity</th>
                  <th className="py-3 px-3 font-semibold">Action</th>
                  <th className="py-3 px-3 font-semibold">Payload</th>
                  <th className="py-3 px-3 font-semibold">Reason</th>
                  <th className="py-3 px-3 font-semibold">prev → hash</th>
                  <th className="py-3 px-3 font-semibold w-10"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {paged.items.map((a) => (
                  <tr key={a.id} className="text-[12px] align-middle">
                    <td className="py-2.5 px-5 text-muted-foreground whitespace-nowrap">{a.at}</td>
                    <td className="py-2.5 px-3">
                      <div className="flex items-center gap-2">
                        <Avatar id={a.actorId} size="sm" />
                        <span className="text-foreground font-medium whitespace-nowrap">{empOf(a.actorId)?.name.split(' ')[0] ?? 'Unknown'}</span>
                      </div>
                    </td>
                    <td className="py-2.5 px-3">
                      <span className="inline-flex items-center gap-1 rounded-full border border-border bg-muted px-2 py-0.5 text-[10px] font-mono text-muted-foreground">
                        <FileText className="w-2.5 h-2.5" /> {a.entity}/{a.entityId}
                      </span>
                    </td>
                    <td className="py-2.5 px-3">
                      <span className={cn('rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase', actionCls(a.action))}>{a.action}</span>
                    </td>
                    <td className="py-2.5 px-3 text-muted-foreground max-w-[280px] truncate">
                      {(() => {
                        const pv = payloadView(a.payload)
                        if (pv.kind === 'text') return pv.text
                        return pv.entries.slice(0, 3).map(([k, v]) => `${k}: ${v}`).join(' · ')
                      })()}
                    </td>
                    <td className="py-2.5 px-3 max-w-[180px] truncate text-amber-700 dark:text-amber-400">{a.reason ?? '—'}</td>
                    <td className="py-2.5 px-3 font-mono text-[10px] text-muted-foreground whitespace-nowrap">
                      <span className="text-zinc-400">{a.prevHash}</span> → <span className="text-teal-700">{a.hash}</span>
                    </td>
                    <td className="py-2.5 px-3">
                      <RowMenu items={buildMenu(a)} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {!supervisorMode && (
          <p className="text-[11px] text-muted-foreground px-5 py-3">Full ledger with actor identities is available in Msimamizi (Supervisor) view.</p>
        )}
        <Pagination page={paged.page} pageSize={paged.size} total={paged.total} onPage={paged.setPage} onPageSize={paged.setSize} />
      </Panel>

      <Modal
        open={detail !== null}
        onClose={() => setDetail(null)}
        title="Audit record"
        subtitle={detail ? `${detail.action.toUpperCase()} · ${detail.at}` : ''}
        size="md"
      >
        {detail && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <DetailCell label="Entity" value={`${detail.entity} · ${detail.entityId}`} mono />
              <DetailCell label="Actor" value={empOf(detail.actorId)?.name ?? detail.actorId} />
              <DetailCell label="Action" value={detail.action.toUpperCase()} />
              <DetailCell label="Timestamp" value={detail.at} />
            </div>
            <div className="rounded-xl border border-border p-3.5">
              <p className="text-[11px] text-muted-foreground uppercase tracking-wide font-semibold mb-1.5">Payload</p>
              {(() => {
                const pv = payloadView(detail.payload)
                return pv.kind === 'text' ? (
                  <p className="text-[13px] text-foreground leading-relaxed">{pv.text}</p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {pv.entries.map(([k, v]) => (
                      <div key={k} className="flex items-start gap-2 rounded-lg border border-border bg-background/40 px-2.5 py-1.5">
                        <span className="text-[10px] font-mono font-semibold uppercase tracking-wide text-teal-700 dark:text-teal-400 shrink-0">{k}</span>
                        <span className="text-[12px] text-foreground break-all">{v}</span>
                      </div>
                    ))}
                  </div>
                )
              })()}
              {detail.reason && (
                <p className="text-[12px] text-amber-700 dark:text-amber-400 mt-2">
                  <span className="font-semibold">Reason: </span>{detail.reason}
                </p>
              )}
            </div>
            <div className="rounded-xl border border-border bg-secondary/50 p-3.5">
              <p className="text-[11px] text-muted-foreground uppercase tracking-wide font-semibold mb-1.5">Hash chain</p>
              <div className="flex items-center gap-2 font-mono text-[11px]">
                <span className="text-zinc-400 truncate">{detail.prevHash}</span>
                <span className="text-muted-foreground">→</span>
                <span className="text-teal-700 font-semibold truncate">{detail.hash}</span>
              </div>
              <p className="text-[10px] text-muted-foreground mt-1">Editing this row retroactively would break the chain for every later record.</p>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}

function DetailCell({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="rounded-xl border border-border bg-secondary/50 p-3.5">
      <p className="text-[11px] text-muted-foreground">{label}</p>
      <p className={cn('text-[13px] font-semibold text-foreground mt-1 truncate', mono && 'font-mono')}>{value}</p>
    </div>
  )
}

function actionCls(action: string): string {
  switch (action) {
    case 'approve': return 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-900'
    case 'reject': return 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950 dark:text-rose-300 dark:border-rose-900'
    case 'return': return 'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950 dark:text-orange-300 dark:border-orange-900'
    case 'submit': return 'bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950 dark:text-sky-300 dark:border-sky-900'
    case 'create': return 'bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-950 dark:text-teal-300 dark:border-teal-900'
    case 'version': return 'bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-950 dark:text-violet-300 dark:border-violet-900'
    case 'revoke': return 'bg-zinc-100 text-zinc-700 border-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:border-zinc-700'
    default: return 'bg-zinc-100 text-zinc-700 border-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:border-zinc-700'
  }
}