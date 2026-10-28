'use client'

import { useRef, useState } from 'react'
import { ShieldCheck, Clock, FileText, Lock, CheckCircle, Printer, MailOpen } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  getEmployee,
  getZone,
  getDept,
  policyEffectiveAt,
  fmtShort,
  type LeaveRequest,
} from '@/lib/leave'
import { Avatar, StatusPill, TypePill, Modal, Btn } from '@/components/leave/shared'
import { useLeave } from '@/components/leave/leave-context'
import { LetterView, printLetter } from '@/components/leave/letter-view'

const STEP_TONE: Record<string, { dot: string; text: string; bg: string }> = {
  approved: { dot: 'bg-emerald-500', text: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-950/40' },
  rejected: { dot: 'bg-rose-500', text: 'text-rose-600 dark:text-rose-400', bg: 'bg-rose-50 dark:bg-rose-950/40' },
  returned: { dot: 'bg-amber-500', text: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-950/40' },
  escalated: { dot: 'bg-orange-500', text: 'text-orange-600 dark:text-orange-400', bg: 'bg-orange-50 dark:bg-orange-950/40' },
  pending: { dot: 'bg-zinc-400', text: 'text-muted-foreground', bg: 'bg-muted/40' },
}

export function RequestDetail({ request, isHr = false }: { request: LeaveRequest; isHr?: boolean }) {
  // The employee, leave type and policy all live in the database now. A row
  // can be missing (a deleted staff member, a removed leave type, a type with
  // no published policy) — render gracefully instead of throwing in render.
  const emp = getEmployee(request.employeeId)
  const policy = policyEffectiveAt(request.leaveTypeId, request.submittedAt ?? request.createdAt)
  const zone = emp ? getZone(emp.zoneId) : undefined
  const dept = emp ? getDept(emp.departmentId) : undefined
  const visibleDocs = isHr ? request.documents : request.documents.filter((d) => !d.restricted)

  const [showLetter, setShowLetter] = useState(false)
  const letterHostRef = useRef<HTMLDivElement>(null)

  const printLetterNow = () => {
    const page = letterHostRef.current?.querySelector<HTMLElement>('.letter-page')
    if (page) printLetter(page)
  }

  return (
    <div className="space-y-5">
      {/* Swahili application letter — screen view + isolated-iframe print */}
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border bg-warm dark:bg-muted/30 px-3.5 py-2.5">
        <div className="flex items-center gap-1.5 min-w-0">
          <MailOpen className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
          <p className="text-[11px] text-muted-foreground truncate">
            Barua ya ombi (Swahili) — sahihi na chapa ya hali ya sasa, tayari kuchapisha.
          </p>
        </div>
        <Btn variant="outline" onClick={() => setShowLetter(true)}>
          <FileText className="h-3.5 w-3.5" /> Angalia barua
        </Btn>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="col-span-2 rounded-xl border border-border bg-secondary/50 p-3.5">
          <div className="flex items-center gap-3">
            <Avatar id={emp?.id ?? request.employeeId} size="lg" />
            <div className="min-w-0">
              <p className="text-sm font-semibold text-foreground leading-tight truncate">{emp?.name ?? request.employeeId}</p>
              <p className="text-[12px] text-muted-foreground truncate">{emp?.title ?? '—'}</p>
              <p className="text-[11px] text-muted-foreground truncate">{zone?.name ?? '—'} · {dept?.name ?? '—'}</p>
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-border bg-secondary/50 p-3.5">
          <p className="text-[11px] text-muted-foreground">Reference</p>
          <p className="text-sm font-semibold text-foreground font-mono mt-0.5">{request.ref}</p>
          <StatusPill className="mt-2" status={request.status} />
        </div>
        <div className="rounded-xl border border-border bg-secondary/50 p-3.5">
          <p className="text-[11px] text-muted-foreground">Leave type</p>
          <div className="mt-1"><TypePill leaveTypeId={request.leaveTypeId} showName /></div>
          <p className="text-[11px] text-muted-foreground mt-1.5">{policy ? `Policy v${policy.version}` : 'No policy on file'}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="rounded-xl border border-border p-3.5">
          <p className="text-[11px] text-muted-foreground">Start</p>
          <p className="text-sm font-semibold text-foreground mt-0.5">{fmtShort(request.startDate)}</p>
        </div>
        <div className="rounded-xl border border-border p-3.5">
          <p className="text-[11px] text-muted-foreground">End</p>
          <p className="text-sm font-semibold text-foreground mt-0.5">{request.endDate ? fmtShort(request.endDate) : <span className="font-normal text-muted-foreground">TBD — set at approval</span>}</p>
        </div>
        <div className="rounded-xl border border-border p-3.5">
          <p className="text-[11px] text-muted-foreground">Duration</p>
          <p className="text-sm font-semibold text-foreground mt-0.5">{request.days ? `${request.days} day${request.days === 1 ? '' : 's'}` : <span className="font-normal text-muted-foreground">TBD — set at approval</span>}</p>
        </div>
        <div className="rounded-xl border border-border p-3.5">
          <p className="text-[11px] text-muted-foreground">Submitted</p>
          <p className="text-sm font-semibold text-foreground mt-0.5">{request.submittedAt ? fmtShort(request.submittedAt) : '—'}</p>
        </div>
      </div>

      <div className="rounded-xl border border-border p-4">
        <p className="text-[11px] text-muted-foreground uppercase tracking-wide font-semibold mb-2">Reason</p>
        <p className="text-sm text-foreground leading-relaxed">{request.reason}</p>
      </div>

      <div className="rounded-xl border border-border p-4">
        <div className="flex items-center justify-between mb-3">
          <p className="text-[11px] text-muted-foreground uppercase tracking-wide font-semibold">Documents ({visibleDocs.length})</p>
          {!isHr && request.documents.some((d) => d.restricted) && (
            <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
              <Lock className="h-3 w-3" /> Restricted docs visible to HR only
            </span>
          )}
        </div>
        {visibleDocs.length === 0 ? (
          <p className="text-xs text-muted-foreground">No documents attached.</p>
        ) : (
          <ul className="space-y-2">
            {visibleDocs.map((d) => (
              <li key={d.id} className="flex items-center gap-3 rounded-lg border border-border bg-secondary/50 px-3 py-2">
                <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-medium text-foreground truncate">{d.name}</p>
                  <p className="text-[11px] text-muted-foreground truncate">{d.type} · {d.size} · uploaded by {d.uploadedByLabel}</p>
                </div>
                {d.restricted && (
                  <span className="inline-flex items-center gap-1 text-[11px] text-amber-600 dark:text-amber-400">
                    <ShieldCheck className="h-3 w-3" /> Restricted
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="rounded-xl border border-border p-4">
        <div className="flex items-center gap-1.5 mb-3">
          <Clock className="h-3.5 w-3.5 text-muted-foreground" />
          <p className="text-[11px] text-muted-foreground uppercase tracking-wide font-semibold">Approval chain</p>
        </div>
        <ol className="space-y-0">
          {request.steps.map((s, idx) => {
            const tone = STEP_TONE[s.status] ?? STEP_TONE.pending
            return (
              <li key={s.order} className="relative pl-6 pb-5 last:pb-0">
                {idx < request.steps.length - 1 && <span className="absolute left-[9px] top-5 bottom-0 w-px bg-border" />}
                <span className={cn('absolute left-[5px] top-[5px] h-2.5 w-2.5 rounded-full ring-2 ring-card', tone.dot)} />
                <div className={cn('rounded-lg px-3 py-2 border border-border', tone.bg)}>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-[13px] font-semibold text-foreground">{s.roleLabel}</p>
                    <span className={cn('text-[11px] font-semibold uppercase tracking-wide', tone.text)}>
                      {s.status.toUpperCase().replace('_', ' ')}
                    </span>
                  </div>
                  <p className="text-[12px] text-muted-foreground mt-0.5">
                    {s.assigneeName} {s.via !== 'direct' && <span className="text-amber-600 dark:text-amber-400">(via delegation: {s.via})</span>}
                    {' · '}Due {fmtShort(s.dueAt)}
                  </p>
                  {s.comments && (
                    <p className="text-[12px] text-foreground mt-1.5 border-t border-border/60 pt-1.5">
                      <span className="text-muted-foreground">Comment: </span>{s.comments}
                    </p>
                  )}
                  {s.actedAt && <p className="text-[11px] text-muted-foreground mt-1">Acted {fmtShort(s.actedAt)}</p>}
                </div>
              </li>
            )
          })}
        </ol>
      </div>

      {/* Approval signature display */}
      {request.signaturePath && (
        <div className="rounded-xl border border-border p-4 mt-4">
          <div className="flex items-center gap-1.5 mb-3">
            <CheckCircle className="h-3.5 w-3.5 text-emerald-600" />
            <p className="text-[11px] text-muted-foreground uppercase tracking-wide font-semibold">Approval signature</p>
          </div>
          <div className="relative">
            <img
              src={request.signaturePath}
              alt="Approval signature"
              className="w-full max-w-[200px] rounded-lg border border-border"
              style={{ maxHeight: '300px', objectFit: 'contain' }}
            />
            {!isHr && request.signatureHash && (
              <div className="absolute top-2 right-2 bg-emerald-500/10 text-emerald-600 text-xs px-2 py-1 rounded">
                <CheckCircle className="w-2.5 h-2.5 inline mr-1" /> Verified
              </div>
            )}
          </div>
        </div>
      )}

      <Modal
        open={showLetter}
        onClose={() => setShowLetter(false)}
        title={`Barua ya Ombi ya Likizo — ${request.ref}`}
        subtitle="Hati rasmi ya maombi kwa Kiswahili — inaonyesha hali ya sasa, sahihi na sehemu ya uidhinishaji."
        size="xl"
        footer={
          <div className="flex items-center justify-between w-full gap-3">
            <p className="text-[11px] text-muted-foreground hidden sm:block">
              Imeandaliwa na Mfumo wa Usimamizi wa Likizo — DPP Zanzibar
            </p>
            <Btn onClick={printLetterNow}>
              <Printer className="h-3.5 w-3.5" /> Chapisha / Print
            </Btn>
          </div>
        }
      >
        <div ref={letterHostRef} className="overflow-x-auto pb-1">
          <LetterView request={request} />
        </div>
      </Modal>
    </div>
  )
}