'use client'

import * as React from 'react'
import { Btn } from '@/components/leave/shared'
import type { Approver, LeaveRequestData, LetterData } from '@/lib/leave'
import { LetterView } from '@/components/leave/views/letter-view'
import type { LeaveRequest } from '@/lib/leave'

// ... (rest of imports and types)

export interface HrProcessingModalProps {
  open: boolean
  onClose: () => void
  /** The request being finalised by HR. */
  request: LeaveRequestData
  /** Called when HR approves, writes the letter and dispatches it. */
  onDispatch: (letter: LetterData) => void | Promise<void>
  /** Optional server-side busy flag while the final approval is recorded. */
  submitting?: boolean
}

const SW_MONTHS = [
  'Januari', 'Februari', 'Machi', 'Aprili', 'Mei', 'Juni',
  'Julai', 'Agosti', 'Septemba', 'Oktoba', 'Novemba', 'Desemba',
]

function formatSwDate(value?: string | null): string {
  if (!value) return '—'
  const date = new Date(value.length <= 10 ? `${value}T00:00:00` : value.replace(' ', 'T'))
  if (Number.isNaN(date.getTime())) return value
  return `${String(date.getDate()).padStart(2, '0')} ${SW_MONTHS[date.getMonth()]} ${date.getFullYear()}`
}

/**
 * Default letter body. Dates and the granted day count are written in full so
 * HR only has to adjust the wording, not re-key the facts. Everything remains
 * editable in the textarea on the right.
 */
export function buildLetterTemplate(request: LeaveRequestData, approvedDays: number): string {
  const year = new Date(request.startDate || Date.now()).getFullYear()
  return [
    `Ombi lako la ${request.leaveType} la mwaka ${year} limeidhinishwa.`,
    `Kipindi cha likizo: ${formatSwDate(request.startDate)} hadi ${formatSwDate(request.endDate)} (${approvedDays} siku).`,
    `Tarehe ya kurudi kazini: ${formatSwDate(request.returnDate)}.`,
    `Idadi ya siku zilizoidhinishwa: ${approvedDays} siku.`,
    'Ahsante.',
  ].join('\n\n')
}

export function HrProcessingModal({ open, onClose, request, onDispatch, submitting = false }: HrProcessingModalProps) {
  const [approvedDays, setApprovedDays] = React.useState<number>(request.requestedDays)
  const [referenceNumber, setReferenceNumber] = React.useState('')
  const [letterBody, setLetterBody] = React.useState(() => buildLetterTemplate(request, request.requestedDays))
  const [error, setError] = React.useState<string | null>(null)
  const [busy, setBusy] = React.useState(false)
  const [previewOpen, setPreviewOpen] = React.useState(false)

  // Re-seed every time a different request is opened. Doing this on open
  // (rather than on every render) keeps HR's edits if the parent re-renders.
  React.useEffect(() => {
    if (!open) return
    setApprovedDays(request.requestedDays)
    setReferenceNumber('')
    setLetterBody(buildLetterTemplate(request, request.requestedDays))
    setError(null)
    setBusy(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, request.id])

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

    if (approvedDays > request.requestedDays) {
      setError(`Onyo: Umeweka siku ${approvedDays} ambazo ni zaidi ya siku ${request.requestedDays} zilizoombwa. Thibitisha kwa uangalifu.`)
      // Don't block — just warn. HR can proceed.
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
    setLetterBody(buildLetterTemplate(request, approvedDays))
    setError(null)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-3 sm:p-4" role="dialog" aria-modal="true" aria-label="Usindikaji wa mwisho wa HR">
      <div className="flex h-[90vh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl bg-card text-foreground shadow-2xl">
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
            <Btn variant="outline" onClick={() => setPreviewOpen(true)} disabled={disabled}>
              Hakiki / Preview
            </Btn>
            <Btn variant="emerald" onClick={handleDispatch} disabled={disabled}>
              {disabled ? 'Inatuma…' : 'Idhinisha na Tuma Barua'}
            </Btn>
          </div>
        </footer>

        {/* Preview modal */}
        {previewOpen && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true">
            <div className="relative max-h-[90vh] w-full max-w-4xl overflow-auto rounded-2xl bg-card p-4 shadow-2xl">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-lg font-bold text-foreground">Hakiki barua / Preview letter</h3>
                <button onClick={() => setPreviewOpen(false)} className="text-muted-foreground hover:text-foreground">✕</button>
              </div>
              <LetterView
                request={{
                  id: request.id,
                  ref: referenceNumber || 'Kumb. Na.',
                  employeeId: '',
                  leaveTypeId: '',
                  policyId: '',
                  startDate: request.startDate,
                  endDate: request.endDate,
                  days: request.requestedDays,
                  approvedDays,
                  referenceNumber,
                  letterBody,
                  reason: '',
                  status: 'approved',
                  createdAt: new Date().toISOString(),
                  documents: [],
                  steps: [],
                  isPaid: request.isPaidLeave,
                }}
                letter={{
                  referenceNumber,
                  approvedDays,
                  letterBody,
                }}
                approvers={request.approvers}
              />
              <div className="mt-3 flex justify-end">
                <Btn variant="ghost" onClick={() => setPreviewOpen(false)}>Funga / Close</Btn>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default HrProcessingModal
