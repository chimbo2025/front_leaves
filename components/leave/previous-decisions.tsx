'use client'

import { CheckCircle2, RotateCcw, XCircle, MessageSquareText } from 'lucide-react'
import { cn } from '@/lib/utils'
import { fmtShort, type ApprovalStep } from '@/lib/leave'

const DECISION_META: Record<string, { icon: React.ComponentType<{ className?: string }>; label: string; cls: string }> = {
  approved: { icon: CheckCircle2, label: 'Imekubaliwa · Approved', cls: 'text-emerald-600 dark:text-emerald-400' },
  returned: { icon: RotateCcw, label: 'Imerudishwa · Returned', cls: 'text-amber-600 dark:text-amber-400' },
  rejected: { icon: XCircle, label: 'Imekataliwa · Rejected', cls: 'text-rose-600 dark:text-rose-400' },
}

/**
 * Maamuzi ya awali — the reasoning of every step that already decided, shown
 * to whoever holds the current step (and visible in the chain modal for
 * everyone who can read the request). Renders nothing until at least one
 * previous step has acted.
 */
export function PreviousDecisions({ steps }: { steps: ApprovalStep[] }) {
  const acted = steps.filter((s) => {
    const d = s.decision ?? (['approved', 'returned', 'rejected'] as const).find((d) => d === s.status)
    return Boolean(d)
  })

  if (acted.length === 0) return null

  return (
    <div className="rounded-xl border border-amber-200/80 bg-amber-50/70 dark:border-amber-900/60 dark:bg-amber-950/20 px-3.5 py-3">
      <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-amber-800 dark:text-amber-400">
        Maamuzi ya awali — kwa nini walikubali, walirudisha au walikataa
      </p>
      <ol className="mt-2 space-y-2.5">
        {acted.map((s) => {
          const d = s.decision ?? (s.status as string)
          const meta = DECISION_META[d] ?? DECISION_META.approved
          const Icon = meta.icon
          return (
            <li key={s.order} className="flex items-start gap-2.5 text-[12px] leading-snug">
              <Icon className={cn('mt-0.5 h-3.5 w-3.5 shrink-0', meta.cls)} />
              <div className="min-w-0">
                <p className="font-semibold text-foreground">
                  {s.roleLabel} · {s.assigneeName}
                  {s.via === 'delegation' && <span className="font-normal text-amber-700 dark:text-amber-400"> (via delegation)</span>}
                  <span className="font-normal text-muted-foreground"> — {meta.label}{s.actedAt ? ` · ${fmtShort(s.actedAt)}` : ''}</span>
                </p>
                <p className="mt-0.5 flex items-start gap-1 text-muted-foreground">
                  <MessageSquareText className="mt-0.5 h-3 w-3 shrink-0" />
                  <span className="whitespace-pre-wrap">{s.comments?.trim() ? s.comments : '(hakuna maoni yaliyorekodiwa · no comment recorded)'}</span>
                </p>
              </div>
            </li>
          )
        })}
      </ol>
    </div>
  )
}
