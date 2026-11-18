'use client'

import { useCallback, useEffect, useState } from 'react'
import { ArrowRightLeft, Check, Gavel, Loader2, X } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { leaveApi, type HandoverDto, type HandoverIndexResponse } from '@/lib/leave-api'
import { getEmployee, type LeaveRequest } from '@/lib/leave'
import { useLeave } from '@/components/leave/leave-context'
import { Avatar, Btn, SelectInput, TextArea } from '@/components/leave/shared'

const ACTIVE = ['submitted', 'under_review', 'returned_for_correction', 'paused_pending_handover']

type State = HandoverIndexResponse | null

const HO_STATUS: Record<string, { label: string; cls: string }> = {
  proposed: { label: 'Inasubiri · Awaiting acceptance', cls: 'bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-800' },
  accepted: { label: 'Imekubaliwa · Accepted', cls: 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800' },
  rejected: { label: 'Imekataliwa · Declined', cls: 'bg-rose-50 text-rose-800 border-rose-200 dark:bg-rose-950 dark:text-rose-300 dark:border-rose-800' },
  completed: { label: 'Imekamilika · Completed', cls: 'bg-sky-50 text-sky-800 border-sky-200 dark:bg-sky-950 dark:text-sky-300 dark:border-sky-800' },
}

/**
 * Ombi hili na kesi zake — the handover panel both the requester and the
 * approvers see on an in-flight request. The requester can hand their open
 * court cases over from here (the exact action the final-approval gate waits
 * for); the recipient can accept/decline in place; everyone else sees a
 * read-only status line. Silently renders nothing once the request leaves
 * the in-flight statuses or the viewer cannot read handovers.
 */
export function HandoverPanel({ request }: { request: LeaveRequest }) {
  const { employees, employeeId, acceptHandover, rejectHandover, refreshWithHandovers } = useLeave()
  const [state, setState] = useState<State>(null)
  const [loaded, setLoaded] = useState(false)
  const [recipient, setRecipient] = useState('')
  const [reason, setReason] = useState('')
  const [sending, setSending] = useState(false)

  const reload = useCallback(async () => {
    try {
      const res = await leaveApi.handovers.list(request.id)
      setState(res)
    } catch {
      // 403/404 for viewers without access — the panel just does not render.
      setState(null)
    } finally {
      setLoaded(true)
    }
  }, [request.id])

  useEffect(() => {
    setState(null)
    setLoaded(false)
    void reload()
  }, [reload])

  if (!ACTIVE.includes(request.status)) return null
  if (!loaded) {
    return (
      <div className="rounded-xl border border-border px-4 py-3 text-[12px] text-muted-foreground flex items-center gap-2">
        <Loader2 className="h-3.5 w-3.5 animate-spin" /> Inapakia hali ya ukabidhi wa kesi…
      </div>
    )
  }
  if (!state) return null

  const { data: handovers, missing } = state
  const blocking = !missing.empty && (missing.cases?.length ?? 0) > 0
  const mine = handovers.filter((h) => h.to_employee_id === employeeId && h.status === 'proposed')
  const isRequester = employeeId === request.employeeId
  const hasAnything = blocking || handovers.length > 0

  if (!hasAnything) return null

  const submit = async () => {
    if (!recipient) {
      toast.error('Chagua mtu wa kumkabidhi kesi. / Choose who takes over the cases.')
      return
    }
    setSending(true)
    try {
      await leaveApi.handovers.propose(request.id, {
        to_employee_id: recipient,
        case_ids: missing.cases!.map((c) => c.id),
        reason: reason.trim() || undefined,
      })
      toast.success('Kesi zimekabidhiwa — mpokeaji atahitaji kuzikubali. / Cases handed over — the recipient must accept.')
      setRecipient('')
      setReason('')
      await reload()
      refreshWithHandovers()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Imeshindikana kukabidhi kesi.')
    } finally {
      setSending(false)
    }
  }

  const act = (h: HandoverDto, accept: boolean) => {
    if (accept) acceptHandover(String(h.id))
    else rejectHandover(String(h.id), 'Imekataliwa na mpokeaji. / Declined by the proposed owner.')
    // Local list refreshes on the next open; give the context a beat to sync.
    window.setTimeout(() => void reload(), 700)
  }

  return (
    <div className="rounded-xl border border-amber-300/70 bg-amber-50/60 dark:border-amber-800/60 dark:bg-amber-950/20 p-4 space-y-3">
      <div className="flex items-start gap-2">
        <Gavel className="h-4 w-4 mt-0.5 text-amber-700 dark:text-amber-400 shrink-0" />
        <div className="min-w-0">
          <p className="text-[11px] uppercase tracking-wide font-bold text-amber-800 dark:text-amber-300">
            Ukabidhi wa kesi — case handover
          </p>
          {blocking && (
            <p className="text-[12px] leading-snug text-amber-900 dark:text-amber-200 mt-0.5">
              Ombi hili haliwezi kuidhinishwa hadi kesi hizi zikabidhiwe na kupokelewa: <span className="font-semibold">{missing.refs.join(', ')}</span>.{' '}
              <span className="text-amber-800/80 dark:text-amber-300/80">Final approval is paused until these open cases are handed over and accepted.</span>
            </p>
          )}
        </div>
      </div>

      {blocking && isRequester && (
        <div className="rounded-lg border border-amber-200 dark:border-amber-800/60 bg-card px-3 py-2.5 space-y-2.5">
          <p className="text-[11px] font-semibold text-foreground">
            Kabidhi kesi hizi / Hand over your cases ({missing.cases!.length})
          </p>
          <SelectInput
            label="Kumkabidhi nani / Hand over to"
            hint="Lazima awe mfanyakazi hai. / Must be an active employee."
            value={recipient}
            onChange={(e) => setRecipient(e.target.value)}
          >
            <option value="">Chagua mwenzako…</option>
            {employees
              .filter((e) => e.active && e.id !== employeeId)
              .map((e) => (
                <option key={e.id} value={e.id}>
                  {e.name} — {e.title}
                </option>
              ))}
          </SelectInput>
          <TextArea
            label="Sababu ya kukabidhi / Reason"
            rows={2}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="mf. Nitakuwa likizoni — naomba uziangalie kesi hizi hadi nirudi."
          />
          <Btn variant="primary" onClick={submit} disabled={sending || !recipient}>
            {sending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ArrowRightLeft className="h-3.5 w-3.5" />} Kabidhi kesi
          </Btn>
        </div>
      )}

      {blocking && !isRequester && (
        <p className="text-[11px] text-amber-900/80 dark:text-amber-200/80 pl-6">
          Mwombaji bado hajabadilisha kesi hizi — mfumo utamwuliza kuzibadilisha na mpokeaji atapokea taarifa.
          <span className="block text-amber-800/70 dark:text-amber-300/70 mt-0.5">The requester has been notified to hand these over; final approval resumes once the recipient accepts.</span>
        </p>
      )}

      {handovers.length > 0 && (
        <ul className="space-y-1.5 pl-6">
          {handovers.map((h) => {
            const meta = HO_STATUS[h.status] ?? HO_STATUS.proposed
            const to = h.to ?? (getEmployee(h.to_employee_id) ? { full_name: getEmployee(h.to_employee_id)!.name } : null)
            const caseRef = h.case?.ref ?? `Kesi #${h.case_id}`
            const actionable = h.to_employee_id === employeeId && h.status === 'proposed'
            return (
              <li key={h.id} className="flex flex-wrap items-center gap-2 text-[12px] rounded-lg border border-border/60 bg-card px-3 py-2">
                <span className="font-mono font-semibold text-foreground">{caseRef}</span>
                <span className="text-muted-foreground">→</span>
                <Avatar id={h.to_employee_id} size="xs" />
                <span className="text-foreground font-medium">{to?.full_name ?? h.to_employee_id}</span>
                <span className={cn('rounded-full border px-2 py-0.5 text-[10px] font-semibold', meta.cls)}>{meta.label}</span>
                {h.notes && <span className="text-[11px] text-muted-foreground w-full sm:w-auto sm:flex-1 basis-full sm:basis-auto">{h.notes}</span>}
                {actionable && (
                  <span className="ml-auto flex items-center gap-1.5">
                    <Btn variant="emerald" className="h-7 px-2.5 text-[11px]" onClick={() => act(h, true)}>
                      <Check className="h-3 w-3" /> Kubali
                    </Btn>
                    <Btn variant="outline" className="h-7 px-2.5 text-[11px]" onClick={() => act(h, false)}>
                      <X className="h-3 w-3" /> Kataa
                    </Btn>
                  </span>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
