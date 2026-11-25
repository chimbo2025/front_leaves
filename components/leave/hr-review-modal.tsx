'use client'

import React, { useState } from 'react'
import { Btn } from '@/components/leave/shared'

export interface Approver {
  name: string
  role: string
  comment?: string
  date?: string
}

export interface LeaveRequestData {
  id: string
  employeeName: string
  employeeDepartment: string
  leaveType: string
  startDate: string
  endDate: string
  returnDate: string
  requestedDays: number
  isPaidLeave: boolean
  requestLetterBody: string
  leaveHistory: { year: string; daysTaken: number; type: string }[]
  approvers: Approver[]
}

export interface LetterData {
  referenceNumber: string
  approvedDays: number
  letterBody: string
}

export interface HrReviewModalProps {
  open: boolean
  onClose: () => void
  request: LeaveRequestData
  onSaveDraft: (letter: LetterData) => void | Promise<void>
  onSendToFinalAuthority?: (letter: LetterData) => void | Promise<void>
  onApproveAndGenerate?: (letter: LetterData) => void | Promise<void>
  requiresFinalAuthority?: boolean
  isHrFinalApprover?: boolean
  submitting?: boolean
}

function formatSwDate(value?: string | null): string {
  if (!value) return '—'
  const date = new Date(value.length <= 10 ? `${value}T00:00:00` : value.replace(' ', 'T'))
  if (Number.isNaN(date.getTime())) return '—'
  const months = ['Januari', 'Februari', 'Machi', 'Aprili', 'Mei', 'Juni', 'Julai', 'Agosti', 'Septemba', 'Oktoba', 'Novemba', 'Desemba']
  return `${String(date.getDate()).padStart(2, '0')} ${months[date.getMonth()]} ${date.getFullYear()}`
}

function generateReferenceNumber(year: number, sequence: number): string {
  return `DPP/HR/LEAVE/${year}/${String(sequence).padStart(3, '0')}`
}

export function HrReviewModal({
  open,
  onClose,
  request,
  onSaveDraft,
  onSendToFinalAuthority,
  onApproveAndGenerate,
  requiresFinalAuthority = false,
  isHrFinalApprover = false,
  submitting = false,
}: HrReviewModalProps) {
  const [approvedDays, setApprovedDays] = useState<number>(request.requestedDays)
  const [referenceNumber, setReferenceNumber] = useState(generateReferenceNumber(new Date().getFullYear(), 1))
  const [letterBody, setLetterBody] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [overrideConfirmed, setOverrideConfirmed] = useState(false)
  const [showPreview, setShowPreview] = useState(false)

  React.useEffect(() => {
    if (!open) return
    const totalTaken = request.leaveHistory.reduce((sum, h) => sum + h.daysTaken, 0)
    setApprovedDays(request.requestedDays)
    setReferenceNumber(generateReferenceNumber(new Date().getFullYear(), 1))
    setLetterBody(
      `Kwa mujibu wa ombi lako la likizo ya ${request.leaveType} kuanzia ${formatSwDate(request.startDate)} hadi ${formatSwDate(request.endDate)}, idadi ya siku ${request.requestedDays}, unaidhinishwa kupata likizo hiyo na kurudi kazini tarehe ${formatSwDate(request.returnDate)}.`
    )
    setError(null)
    setBusy(false)
    setOverrideConfirmed(false)
    setShowPreview(false)
  }, [open, request.id])

  if (!open) return null

  const disabled = submitting || busy
  const totalTaken = request.leaveHistory.reduce((sum, h) => sum + h.daysTaken, 0)
  const remainingBalance = Math.max(0, request.requestedDays - totalTaken)
  const isOverride = approvedDays > request.requestedDays

  const validate = (): boolean => {
    setError(null)
    if (!Number.isInteger(approvedDays) || approvedDays <= 0) {
      setError('Idadi ya siku zilizoidhinishwa lazima iwe kubwa kuliko 0.')
      return false
    }
    if (isOverride && !overrideConfirmed) {
      setError('Thibitisha kuwa unataka kuidhinisha siku zaidi ya zilizoombwa (override).')
      return false
    }
    if (!referenceNumber.trim()) {
      setError('Weka namba ya kumbukumbu (Kumb. Na) kabla ya kuendelea.')
      return false
    }
    if (!letterBody.trim()) {
      setError('Mwili wa barua ni mfupi mno. Andika angalau herufi 20.')
      return false
    }
    return true
  }

  const handleSaveDraft = async () => {
    if (!validate()) return
    try {
      setBusy(true)
      await onSaveDraft({ referenceNumber: referenceNumber.trim(), approvedDays, letterBody: letterBody.trim() })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Imeshindikana kuhifadhi rasimu. Jaribu tena.')
    } finally {
      setBusy(false)
    }
  }

  const handleSendToFinalAuthority = async () => {
    if (!validate()) return
    if (!onSendToFinalAuthority) return
    try {
      setBusy(true)
      await onSendToFinalAuthority({ referenceNumber: referenceNumber.trim(), approvedDays, letterBody: letterBody.trim() })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Imeshindikana kutuma kwa Mamlaka ya Mwisho. Jaribu tena.')
    } finally {
      setBusy(false)
    }
  }

  const handleApproveAndGenerate = async () => {
    if (!validate()) return
    if (!onApproveAndGenerate) return
    try {
      setBusy(true)
      await onApproveAndGenerate({ referenceNumber: referenceNumber.trim(), approvedDays, letterBody: letterBody.trim() })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Imeshindikana kuidhinisha na kutengeneza barua. Jaribu tena.')
    } finally {
      setBusy(false)
    }
  }

  const resetBody = () => {
    setLetterBody(
      `Kwa mujibu wa ombi lako la likizo ya ${request.leaveType} kuanzia ${formatSwDate(request.startDate)} hadi ${formatSwDate(request.endDate)}, idadi ya siku ${approvedDays}, unaidhinishwa kupata likizo hiyo na kurudi kazini tarehe ${formatSwDate(request.returnDate)}.`
    )
    setError(null)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-3 sm:p-4" role="dialog" aria-modal="true">
      <div className="flex h-[90vh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-zinc-900">
        <header className="flex items-start justify-between gap-4 border-b border-border px-6 py-4">
          <div>
            <h2 className="text-lg font-bold text-foreground">Usindikaji wa HR — Ombi la Likizo</h2>
            <p className="mt-0.5 text-[12px] text-muted-foreground">
              Hakiki ombi, weka idadi ya siku, weka namba ya kumbukumbu na andika barua ya majibu. / Review request, set approved days, enter reference number and write response letter.
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
          {/* LEFT: request data, system advice, approval history */}
          <div className="space-y-5 overflow-y-auto pr-2">
            {/* Applicant info */}
            <section className="rounded-xl border border-border bg-muted/30 p-4">
              <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">Mwombaji / Applicant</p>
              <p className="mt-1 text-[15px] font-bold text-foreground">{request.employeeName}</p>
              <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-[12px]">
                <div>
                  <p className="text-muted-foreground">Idara / Department</p>
                  <p className="font-semibold text-foreground">{request.employeeDepartment}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Aina ya likizo / Leave type</p>
                  <p className="font-semibold text-foreground">{request.leaveType}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Kuanza / Start</p>
                  <p className="font-semibold text-foreground">{formatSwDate(request.startDate)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Kumaliza / End</p>
                  <p className="font-semibold text-foreground">{formatSwDate(request.endDate)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Kurudi kazini / Return</p>
                  <p className="font-semibold text-foreground">{formatSwDate(request.returnDate)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Siku zilizoombwa / Requested days</p>
                  <p className="font-semibold text-foreground">{request.requestedDays} siku</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Malipo / Payment</p>
                  <p className={request.isPaidLeave ? 'font-semibold text-emerald-700 dark:text-emerald-400' : 'font-semibold text-rose-600 dark:text-rose-400'}>
                    {request.isPaidLeave ? 'Inalipwa / Paid' : 'Hailipwi / Unpaid'}
                  </p>
                </div>
              </div>
            </section>

            {/* System Advice */}
            <section className="rounded-xl border border-sky-200 bg-sky-50 p-4 text-[12px] leading-relaxed text-sky-900 dark:border-sky-900 dark:bg-sky-950/40 dark:text-sky-200">
              <p className="font-semibold">Ushauri wa Mfumo / System Advice</p>
              <div className="mt-2 space-y-1 text-sky-900/90 dark:text-sky-200/90">
                {(() => {
                  const totalTaken = request.leaveHistory.reduce((sum, h) => sum + h.daysTaken, 0)
                  const standardDays = request.requestedDays + totalTaken
                  const remaining = Math.max(0, standardDays - totalTaken - request.requestedDays + request.requestedDays)
                  return (
                    <>
                      <p>Mfanyakazi amechukua siku {totalTaken} za likizo ya mwaka {new Date().getFullYear()}.</p>
                      <p>Sera ya kawaida inaruhusu siku {standardDays} kwa mwaka.</p>
                      <p>Siku {Math.max(0, standardDays - totalTaken)} zinasalia.</p>
                    </>
                  )
                })()}
                {request.leaveHistory.length > 0 && (
                  <div className="mt-2 border-t border-sky-200/70 pt-2">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-sky-800 dark:text-sky-300">Likizo zilizopita / Previous Leave</p>
                    <ul className="mt-1 space-y-1">
                      {request.leaveHistory.map((h, i) => (
                        <li key={i} className="text-[11px]">
                          {h.year} — {h.type}: {h.daysTaken} siku
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </section>

            {/* Request Letter Body */}
            <section className="rounded-xl border border-border bg-muted/30 p-4">
              <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">Barua ya Ombi / Request Letter</p>
              <p className="mt-2 text-[12px] leading-relaxed text-foreground whitespace-pre-wrap">{request.requestLetterBody}</p>
            </section>

            {/* Approval History */}
            {request.approvers.length > 0 && (
              <section>
                <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">Mnyororo wa Uidhinishaji / Approval Chain</p>
                <ol className="space-y-1.5">
                  {request.approvers.map((approver, index) => (
                    <li key={index} className="flex items-center justify-between gap-3 rounded-lg border border-border bg-background px-3 py-2">
                      <span className="text-[12px] font-semibold text-foreground">{approver.name}</span>
                      <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">{approver.role}</span>
                    </li>
                  ))}
                </ol>
              </section>
            )}

            {/* Approved Days */}
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
              {isOverride && (
                <label className="mt-2 flex items-center gap-2 text-[12px] font-semibold text-amber-700 dark:text-amber-300">
                  <input
                    type="checkbox"
                    checked={overrideConfirmed}
                    onChange={(e) => setOverrideConfirmed(e.target.checked)}
                    className="h-4 w-4 rounded border-border"
                  />
                  Thibitisha kuwa unataka kuidhinishwa siku zaidi ya zilizoombwa (override)
                </label>
              )}
            </div>

            {/* Reference Number */}
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
                placeholder="Mf. DPP/HR/LEAVE/2026/001"
                className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-teal-600/30"
              />
              <p className="mt-1 text-[11px] text-muted-foreground">
                Namba hii itachapishwa juu kushoto ya barua.
              </p>
            </div>
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
            <Btn variant="outline" onClick={handleSaveDraft} disabled={disabled}>
              Hifadhi Rasimu / Save Draft
            </Btn>
            {requiresFinalAuthority && onSendToFinalAuthority && (
              <Btn variant="outline" onClick={handleSendToFinalAuthority} disabled={disabled}>
                Tuma kwa Mamlaka ya Mwisho / Send to Final Authority
              </Btn>
            )}
            {isHrFinalApprover && onApproveAndGenerate && (
              <Btn variant="emerald" onClick={handleApproveAndGenerate} disabled={disabled}>
                Idhinisha na Tengeneza Barua / Approve & Generate Letter
              </Btn>
            )}
          </div>
        </footer>

        {/* Preview modal */}
        {showPreview && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
            <div className="relative max-h-[90vh] w-full max-w-4xl overflow-auto rounded-2xl bg-white p-6 shadow-2xl dark:bg-zinc-900">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-lg font-bold text-foreground">Hakiki barua / Preview letter</h3>
                <button onClick={() => setShowPreview(false)} className="text-muted-foreground hover:text-foreground">✕</button>
              </div>
              <div className="rounded-xl border border-border bg-card p-6 font-serif text-[14px] leading-relaxed text-foreground">
                <p><strong>Kumb. Na:</strong> {referenceNumber}</p>
                <p className="mt-2">{letterBody}</p>
                <p className="mt-4">Kipindi cha likizo: {formatSwDate(request.startDate)} hadi {formatSwDate(request.endDate)} ({approvedDays} siku). Tarehe ya kurudi kazini: {formatSwDate(request.returnDate)}.</p>
              </div>
              <div className="mt-3 flex justify-end">
                <Btn variant="ghost" onClick={() => setShowPreview(false)}>Funga / Close</Btn>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default HrReviewModal