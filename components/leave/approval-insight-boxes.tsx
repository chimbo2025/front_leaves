'use client'

import type { ApprovalInsight } from '@/lib/leave-api'

const LEDGER_LABEL: Record<string, string> = {
  waiver_deduction: 'Punguzo la msamaha (waiver)',
  late_return_deduction: 'Kukata kwa kuchelewa kurudi (late return)',
  forfeiture: 'Kunyanganywa (forfeiture)',
  restoration: 'Kurejeshwa (restoration)',
  manual_adjustment: 'Marekebisho ya mkono (manual adjustment)',
  correction: 'Marekebisho (correction)',
  carry_forward: 'Kuhamishwa (carry-over)',
  expiry: 'Kuisha muda (expiry)',
}

/**
 * Sehemu za ushauri wa kuidhinisha — the shared Swahili guidance boxes both
 * approve modals render: the shared annual balance, the annual payment cycle
 * and (new) the per-type / ledger breakdown that explains why the employee's
 * balance is where it is.
 */
export function ApprovalInsightBoxes({
  insight,
  loading,
  isFinalStep,
  isAnnual,
  proposedDays,
  fallbackBalance,
}: {
  insight: ApprovalInsight | null
  loading: boolean
  isFinalStep: boolean
  isAnnual: boolean
  proposedDays: number
  fallbackBalance?: { remaining: number } | null
}) {
  const balance = insight?.annual_balance ?? fallbackBalance ?? null
  const breakdown = insight?.balance_breakdown ?? null

  return (
    <>
      {balance && (
        <div className="rounded-lg border border-teal-200 bg-teal-50 px-3 py-2 text-[12px] text-teal-900 dark:border-teal-900 dark:bg-teal-950/40 dark:text-teal-200">
          Salio la likizo ya mwaka: siku {balance.remaining} kabla ya ombi hili
          {isFinalStep
            ? `; takriban siku ${Math.max(0, balance.remaining - proposedDays)} baada ya kuidhinishwa.`
            : '.'}{' '}
          Siku zote zilizoidhinishwa kwa aina zote za likizo huhesabiwa katika mwaka huu wa huduma.
          {breakdown && (
            <div className="mt-2 border-t border-teal-200/70 dark:border-teal-800/60 pt-2 space-y-1 text-[11px] leading-snug">
              <p className="font-semibold uppercase tracking-wide text-[10px] text-teal-800 dark:text-teal-300">
                Kwanini salio ni hivi — chanzo cha kupungua
              </p>
              <p>
                Mwaka wa huduma: {breakdown.service_year_start} hadi {breakdown.service_year_end} · Zilizopatikana: siku {breakdown.earned}
                {' · '}Kuhamishwa kutoka mwaka uliopita (carry-over): siku {breakdown.carry_over}
                {' · '}Zilizotumika: siku {breakdown.used}
              </p>
              {breakdown.used_by_type.length > 0 && (
                <p>
                  Matumizi kwa aina: {breakdown.used_by_type.map((u) => `${u.name ?? u.code ?? 'Aina nyingine'} — siku ${u.days}`).join(' · ')}
                </p>
              )}
              {breakdown.ledger_rows.length > 0 && (
                <p>
                  Marekebisho ya akiba:{' '}
                  {breakdown.ledger_rows
                    .map((row) => {
                      const sign = row.direction === 'debit' ? '−' : '+'
                      const label = row.reason?.trim() || LEDGER_LABEL[row.transaction_type] || row.transaction_type
                      return `${label} (${sign}${row.amount})`
                    })
                    .join(' · ')}
                </p>
              )}
            </div>
          )}
        </div>
      )}
      {isAnnual && isFinalStep && (
        <div className="rounded-lg border border-sky-200 bg-sky-50 px-3 py-2 text-[12px] text-sky-900 dark:border-sky-900 dark:bg-sky-950/40 dark:text-sky-200">
          {loading
            ? 'Inahakiki mzunguko wa malipo wa mfanyakazi…'
            : insight?.annual_request_number
              ? `Hili ni ombi la likizo ya mwaka namba ${insight.annual_request_number} katika mwaka wa huduma wa mfanyakazi. ${
                  insight.payment_eligible
                    ? 'Linastahili ukaguzi wa malipo wa Rasilimali Watu (HR) baada ya kuidhinishwa.'
                    : 'Halistahili ukaguzi wa malipo katika mzunguko wa kila ombi la pili.'
                }`
              : 'Uchunguzi wa mzunguko wa malipo haupo — HR inaweza kuangalia baada ya kuidhinishwa.'}
        </div>
      )}
    </>
  )
}
