'use client'

import React, { useState } from 'react'
import { Btn } from '@/components/leave/shared'

export interface HrProcessingPanelProps {
  open: boolean
  onClose: () => void
  request: {
    id: string
    employeeName: string
    leaveType: string
    startDate: string
    endDate: string
    returnDate: string
    requestedDays: number
    isPaidLeave: boolean
    referenceNumber?: string
    approvers: { name: string; role: string }[]
  }
  onDispatch: (data: { referenceNumber: string; approvedDays: number; letterBody: string }) => void | Promise<void>
  submitting?: boolean
}

function formatSwDate(value?: string | null): string {
  if (!value) return '—'
  const date = new Date(value.length <= 10 ? `${value}T00:00:00` : value.replace(' ', 'T'))
  if (Number.isNaN(date.getTime())) return '—'
  const months = ['Januari', 'Februari', 'Machi', 'Aprili', 'Mei', 'Juni', 'Julai', 'Agosti', 'Septemba', 'Oktoba', 'Novemba', 'Desemba']
  return `${String(date.getDate()).padStart(2, '0')} ${months[date.getMonth()]} ${date.getFullYear()}`
}

export function HrProcessingPanel({ open, onClose, request, onDispatch, submitting = false }: HrProcessingPanelProps) {
  const [approvedDays, setApprovedDays] = useState<number>(request.requestedDays)
  const [referenceNumber, setReferenceNumber] = useState(request.referenceNumber ?? '')
  const [letterBody, setLetterBody] = useState(
    `Ombi lako la ${request.leaveType} la mwaka ${new Date(request.startDate || Date.now()).getFullYear()} limeidhinishwa.\n\nKipindi cha likizo: ${formatSwDate(request.startDate)} hadi ${formatSwDate(request.endDate)} (${request.requestedDays} siku). Tarehe ya kurudi kazini: ${formatSwDate(request.returnDate)}.\n\nAhsante.`
  )
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  if (!open) return null

  const disabled = submitting || busy

  const handleDispatch = async () => {
    const reference = referenceNumber.trim()
    const body = letterBody.trim()

    if (reference.length < 3) {
      setError('Weka namba ya kumbukumbu (Kumb. Na) kabla ya kutuma barua.')
      return
    }
    if (!Number.isInteger(approvedDays) || approvedDays < 1 || approvedDays > 730) {
      setError('Idadi ya siku zilizoidhinishwa lazima iwe kati ya 1 na 730.')
      return
    }
    if (body.length < 20) {
      setError('Mwili wa barua ni mfupi mno. Andika angalau herufi 20.')
      return
    }

    setError(null)
    try {
      setBusy(true)
      await onDispatch({ referenceNumber: reference, approvedDays, letterBody: body })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Imeshindikana kutuma barua. Jaribu tena.')
    } finally {
      setBusy(false)
    }
  }

  const resetBody = () => {
    setLetterBody(
      `Ombi lako la ${request.leaveType} la mwaka ${new Date(request.startDate || Date.now()).getFullYear()} limeidhinishwa.\n\nKipindi cha likizo: ${formatSwDate(request.startDate)} hadi ${formatSwDate(request.endDate)} (${approvedDays} siku). Tarehe ya kurudi kazini: ${formatSwDate(request.returnDate)}.\n\nAhsante.`
    )
    setError(null)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-3 sm:p-4" role="dialog" aria-modal="true">
      <div className="flex h-[90vh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-zinc-900">
        <header className="flex items-start justify-between gap-4 border-b border-border px-6 py-4">
          <div>
            <h2 className="text-lg font-bold text-foreground">Usindikaji wa Mwisho wa HR</h2>
            <p className="mt-0.5 text-[12px] text-muted-foreground">
              Hakiki salio, weka idadi ya siku, andika barua ya majibu na uitume. / Review the balance, set the granted days, write the response letter and dispatch it.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={disabled}
            className="rounded-full p-1.5 text-muted-foreground transition hover:bg-accent hover:text-foreground disabled:opacity-50"
            aria-label="Funga"
          >
            ✕
          </button>
        </header>

        <div className="grid flex-1 grid-cols-1 gap-6 overflow-hidden p-6 md:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
          {/* LEFT: request facts, advice and overrides */}
          <div className="space-y-5 overflow-y-auto pr-2">
            <section className="rounded-xl border border-border bg-muted/30 p-4">
              <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">Mwombaji / Applicant</p>
              <p className="mt-1 text-[15px] font-bold text-foreground">{request.employeeName}</p>
              <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-[12px]">
                <div>
                  <p className="text-muted-foreground">Aina ya likizo</p>
                  <p className="font-semibold text-foreground">{request.leaveType}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Siku zilizoombwa</p>
                  <p className="font-semibold text-foreground">{request.requestedDays} siku</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Kuanza</p>
                  <p className="font-semibold text-foreground">{formatSwDate(request.startDate)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Kumaliza</p>
                  <p className="font-semibold text-foreground">{formatSwDate(request.endDate)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Kurudi kazini</p>
                  <p className="font-semibold text-foreground">{formatSwDate(request.returnDate)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Malipo</p>
                  <p className={request.isPaidLeave ? 'font-semibold text-emerald-700 dark:text-emerald-400' : 'font-semibold text-rose-600 dark:text-rose-400'}>
                    {request.isPaidLeave ? 'Inalipwa / Paid' : 'Hailipwi / Unpaid'}
                  </p>
                </div>
              </div>
            </section>

            <section className="rounded-xl border border-sky-200 bg-sky-50 p-4 text-[12px] leading-relaxed text-sky-900 dark:border-sky-900 dark:bg-sky-950/40 dark:text-sky-200">
              <p className="font-semibold">Ushauri wa mfumo / System advice</p>
              <p className="mt-1 text-sky-900/90 dark:text-sky-200/90">
                Mwombaji ameomba siku <strong>{request.requestedDays}</strong>. Unaweza kuidhinisha idadi ndogo kulingana na salio la likizo na sera. Idadi unayoweka hapa itaonekana kwenye barua rasmi na kwenye rekodi ya ombi.
              </p>
              <p className="mt-2 text-[11px] font-semibold text-sky-800 dark:text-sky-300">
                Kama MHR, unaweza kuidhinisha siku zaidi ya salio lililobaki (override). / As HR, you may grant more days than the remaining balance.
              </p>
            </section>

            <div>
              <label htmlFor="hr-approved-days" className="mb-1.5 block text-[12px] font-semibold text-foreground">
                Idadi ya siku zilizoidhinishwa / Approved days
              </label>
              <input
                id="hr-approved-days"
                type="number"
                min={1}
                max={730}
                step={1}
                value={Number.isFinite(approvedDays) ? approvedDays : ''}
                onChange={(e) => setApprovedDays(Number(e.target.value))}
                disabled={disabled}
                className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-teal-600/30"
              />
              <p className="mt-1 text-[11px] text-muted-foreground">
                Ombi la awali: {request.requestedDays} siku. Badilisha tu ikiwa salio au sera inahitaji.
              </p>
            </div>

            <div>
              <label htmlFor="hr-reference" className="mb-1.5 block text-[12px] font-semibold text-foreground">
                Kumb. Na / Official reference number
              </label>
              <input
                id="hr-reference"
                type="text"
                value={referenceNumber}
                onChange={(e) => setReferenceNumber(e.target.value)}
                disabled={disabled}
                placeholder="Mf. Kumb. Na. DPP/ZNZ/HR/2026/014"
                className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-teal-600/30"
              />
              <p className="mt-1 text-[11px] text-muted-foreground">
                Namba hii itachapishwa juu kushoto ya barua.
              </p>
            </div>

            <section>
              <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                Mnyororo wa uidhinishaji / Approval chain
              </p>
              {request.approvers.length === 0 ? (
                <p className="rounded-lg border border-border bg-background px-3 py-2 text-[12px] text-muted-foreground">
                  Hakuna waidhinishaji waliorekodiwa.
                </p>
              ) : (
                <ol className="space-y-1.5">
                  {request.approvers.map((approver, index) => (
                    <li key={`${approver.role}-${approver.name}-${index}`} className="flex items-center justify-between gap-3 rounded-lg border border-border bg-background px-3 py-2">
                      <span className="text-[12px] font-semibold text-foreground">{approver.name || '—'}</span>
                      <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">{approver.role}</span>
                    </li>
                  ))}
                </ol>
              )}
            </section>
          </div>

          {/* RIGHT: the letter editor */}
          <div className="flex min-h-0 flex-col overflow-hidden">
            <div className="mb-1.5 flex items-center justify-between gap-3">
              <label htmlFor="hr-letter-body" className="block text-[12px] font-semibold text-foreground">
                Mwili wa barua ya majibu / Response letter body
              </label>
              <button
                type="button"
                onClick={resetBody}
                disabled={disabled}
                className="text-[11px] font-semibold text-teal-700 hover:underline disabled:opacity-50 dark:text-teal-300"
              >
                Rejesha kiolezo
              </button>
            </div>

            <textarea
              id="hr-letter-body"
              value={letterBody}
              onChange={(e) => setLetterBody(e.target.value)}
              disabled={disabled}
              spellCheck={false}
              placeholder="Andika mwili wa barua hapa…"
              className="min-h-0 flex-1 resize-none rounded-xl border border-input bg-background p-4 font-serif text-[14px] leading-relaxed text-foreground outline-none focus:ring-2 focus:ring-teal-600/30"
            />

            <p className="mt-2 text-[11px] text-muted-foreground">
              Tarehe, siku na hali ya malipo hujazwa kiotomatiki kwenye barua. Weka nafasi moja tupu kati ya aya.
            </p>
          </div>
        </div>

        {error && (
          <div className="mx-6 mb-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-[12px] font-medium text-rose-700 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-200">
            {error}
          </div>
        )}

        <footer className="flex flex-col-reverse gap-2 border-t border-border px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-[11px] text-muted-foreground">
            Kutuma kutahifadhi barua na kukamilisha ombi. / Dispatching saves the letter and finalises the request.
          </p>
          <div className="flex items-center justify-end gap-3">
            <Btn variant="ghost" onClick={onClose} disabled={disabled}>
              Ghairi
            </Btn>
            <Btn variant="emerald" onClick={handleDispatch} disabled={disabled}>
              {disabled ? 'Inatuma…' : 'Idhinisha na Tuma Barua'}
            </Btn>
          </div>
        </footer>
      </div>
    </div>
  )
}

export default HrProcessingPanel