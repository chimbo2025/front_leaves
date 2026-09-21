'use client'

import { useState } from 'react'
import { Check, Clock, CopyCheck, Mail, RotateCcw, ShieldAlert, Send, Handshake, ScrollText, BellRing, BellOff, Inbox, BadgeCheck, ArrowRightLeft, Smartphone, ShieldCheck } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useLeave } from '@/components/leave/leave-context'
import {
  SectionHeading,
  Panel,
  EmptyState,
  Avatar,
  StatCard,
  Btn,
  TableToolbar,
  Pagination,
  usePaged,
} from '@/components/leave/shared'
import { getEmployee } from '@/lib/leave'

const KIND_META: Record<string, { icon: React.ComponentType<{ className?: string }>; cls: string; label: string }> = {
  submitted: { icon: Send, label: 'Submitted', cls: 'bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950 dark:text-sky-300 dark:border-sky-900' },
  approved: { icon: Check, label: 'Approved', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-900' },
  rejected: { icon: CopyCheck, label: 'Rejected', cls: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950 dark:text-rose-300 dark:border-rose-900' },
  returned: { icon: RotateCcw, label: 'Returned', cls: 'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950 dark:text-orange-300 dark:border-orange-900' },
  escalated: { icon: ShieldAlert, label: 'Escalated', cls: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-900' },
  upcoming: { icon: Clock, label: 'Upcoming', cls: 'bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-950 dark:text-violet-300 dark:border-violet-900' },
  delegation: { icon: Handshake, label: 'Delegation', cls: 'bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-950 dark:text-teal-300 dark:border-teal-900' },
  handover: { icon: ArrowRightLeft, label: 'Handover', cls: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-900' },
  policy: { icon: ScrollText, label: 'Policy', cls: 'bg-zinc-100 text-zinc-700 border-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:border-zinc-700' },
}

const KINDS = Object.keys(KIND_META)

export function NotificationsView() {
  const { notifications, markAllRead, markRead, supervisorMode, employeeId } = useLeave()
  const [search, setSearch] = useState('')
  const [kindFilter, setKindFilter] = useState('all')
  const [readFilter, setReadFilter] = useState('all')

  const visible = supervisorMode ? notifications : notifications.filter((n) => n.userId === employeeId)
  const unread = visible.filter((n) => !n.read).length

  const filtered = visible.filter((n) => {
    if (kindFilter !== 'all' && n.kind !== kindFilter) return false
    if (readFilter === 'unread' && n.read) return false
    if (readFilter === 'read' && !n.read) return false
    const q = search.trim().toLowerCase()
    if (!q) return true
    return n.message.toLowerCase().includes(q) || getEmployee(n.userId).name.toLowerCase().includes(q)
  })
  const paged = usePaged(filtered, 8)

  const byKind = (k: string) => visible.filter((n) => n.kind === k).length

  return (
    <div className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      <SectionHeading
        title="Notifications"
        subtitle="In-system, email and SMS alerts fire on submission, escalation, decisions, returns and approaching leave dates. Emergency approvals send a privacy-safe SMS."
        actions={
          <Btn variant="outline" onClick={markAllRead} disabled={unread === 0}>
            <Check className="w-3.5 h-3.5" /> Mark all read
          </Btn>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard icon={BellRing} label="Unread" value={unread} hint="Awaiting your attention" tone="amber" />
        <StatCard icon={Inbox} label="Total for you" value={visible.length} hint={supervisorMode ? 'Office-wide inbox' : 'Your inbox'} tone="teal" />
        <StatCard icon={Handshake} label="Delegation alerts" value={byKind('delegation') + byKind('escalated')} hint="Authority & escalation" tone="violet" />
        <StatCard icon={BadgeCheck} label="Approvals & returns" value={byKind('approved') + byKind('returned')} hint="Decision updates" tone="emerald" />
      </div>

      <Panel title={`Inbox (${filtered.length})`} subtitle={unread > 0 ? `${unread} unread — reminders also go out by email within SLA` : 'All caught up'}>
        <TableToolbar
          search={search}
          onSearch={setSearch}
          placeholder="Search message or recipient…"
          count={filtered.length}
          filters={[
            {
              label: 'Kind',
              value: kindFilter,
              onChange: setKindFilter,
              options: [{ value: 'all', label: 'All kinds' }, ...KINDS.map((k) => ({ value: k, label: KIND_META[k].label }))],
            },
            {
              label: 'Read state',
              value: readFilter,
              onChange: setReadFilter,
              options: [
                { value: 'all', label: 'All' },
                { value: 'unread', label: 'Unread' },
                { value: 'read', label: 'Read' },
              ],
            },
          ]}
        />
        {paged.items.length === 0 ? (
          <EmptyState title="No notifications match" hint="Adjust the search or filters." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="text-[11px] uppercase tracking-wider text-muted-foreground">
                  <th className="py-3 px-5 font-semibold">Type</th>
                  <th className="py-3 px-3 font-semibold">Message</th>
                  <th className="py-3 px-3 font-semibold hidden md:table-cell">Recipient</th>
                  <th className="py-3 px-3 font-semibold hidden sm:table-cell">Channel</th>
                  <th className="py-3 px-3 font-semibold">Time</th>
                  <th className="py-3 px-3 font-semibold text-right w-10">State</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {paged.items.map((n) => {
                  const meta = KIND_META[n.kind] ?? KIND_META.submitted
                  const Icon = meta.icon
                  const unreadRow = !n.read
                  return (
                    <tr key={n.id} onClick={() => { if (unreadRow) markRead(n.id) }} className={cn('text-[13px] align-middle group cursor-pointer', unreadRow ? 'bg-teal-50/30 dark:bg-teal-950/20' : 'opacity-75')}>
                      <td className="py-3 px-5">
                        <span className={cn('inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-semibold', meta.cls)}>
                          <Icon className="w-3 h-3" /> {meta.label}
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        <p className={cn('leading-snug text-foreground max-w-[460px]', unreadRow && 'font-semibold')}>{n.message}</p>
                      </td>
                      <td className="py-3 px-3 hidden md:table-cell">
                        <div className="flex items-center gap-2">
                          <Avatar id={n.userId} size="sm" />
                          <span className="font-medium text-foreground whitespace-nowrap">{getEmployee(n.userId).name}</span>
                        </div>
                      </td>
                      <td className="py-3 px-3 hidden sm:table-cell">
                        {n.channel === 'sms' ? (
                          <span className="inline-flex flex-wrap items-center gap-1.5 text-[11px] text-muted-foreground">
                            <Smartphone className="w-3 h-3 text-emerald-600" /> SMS
                            {n.privacySafe && (
                              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-900 px-1.5 py-0.5 text-[9px] font-bold uppercase">
                                <ShieldCheck className="w-2.5 h-2.5" /> privacy-safe
                              </span>
                            )}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground">
                            <Mail className="w-3 h-3" /> email + in-app
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-muted-foreground whitespace-nowrap">{n.time}</td>
                      <td className="py-3 px-3 text-right">
                        {unreadRow ? (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-900 px-2 py-0.5 text-[10px] font-semibold">
                            <BellOff className="w-2.5 h-2.5" /> Unread
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-900 px-2 py-0.5 text-[10px] font-semibold">
                            Read
                          </span>
                        )}
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
    </div>
  )
}