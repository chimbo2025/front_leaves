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

export interface FinalAuthorityApprovalModalProps {
  open: boolean
  onClose: () => void
  request: LeaveRequestData
  letter: LetterData
  onApprove: (comment?: string) => void | Promise<void>
  onReject: (comment: string) => void | Promise<void>
  onReturnToHr: (comment: string) => void | Promise<void>
  submitting?: boolean
}

function formatSwDate(value?: string | null): string {
  if (!value) return '—'
  const date = new Date(value.length <= 10 ? `${value}T00:00:00` : value.replace(' ', 'T'))
  if (Number.isNaN(date.getTime())) return '—'
  const months = ['Januari', 'Februari', 'Machi', 'Aprili', 'Mei', 'Juni', 'Julai', 'Agosti', 'Septemba', 'Oktoba', 'Novemba', 'Desemba']
  return `${String(date.getDate()).padStart(2, '0')} ${months[date.getMonth()]} ${date.getFullYear()}`
}

export function FinalAuthorityApprovalModal({
  open,
  onClose,
  request,
  letter,
  onApprove,
  onReject,
  onReturnToHr,
  submitting = false,
}: FinalAuthorityApprovalModalProps) {
  const [comment, setComment] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  React.useEffect(() => {
    if (!open) return
    setComment('')
    setError(null)
    setBusy(false)
  }, [open])

  if (!open) return null

  const disabled = submitting || busy
  const totalTaken = request.leaveHistory.reduce((sum, h) => sum + h.daysTaken, 0)

  const handleApprove = async () => {
    setError(null)
    try {
      setBusy(true)
      await onApprove(comment.trim() || undefined)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Imeshindikana kuidhinisha. Jaribu tena.')
    } finally {
      setBusy(false)
    }
  }

  const handleReject = async () => {
    if (!comment.trim()) {
      setError('Andika sababu ya kukataa kabla ya kuendelea.')
      return
    }
    setError(null)
    try {
      setBusy(true)
      await onReject(comment.trim())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Imeshindikana kukataa. Jaribu tena.')
    } finally {
      setBusy(false)
    }
  }

  const handleReturnToHr = async () => {
    if (!comment.trim()) {
      setError('Andika sababu ya kurudisha kwa HR kabla ya kuendelea.')
      return
    }
    setError(null)
    try {
      setBusy(true)
      await onReturnToHr(comment.trim())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Imeshindikana kurudisha kwa HR. Jaribu tena.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-3 sm:p-4" role="dialog" aria-modal="true">
      <div className="flex h-[90vh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-zinc-900">
        <header className="flex items-start justify-between gap-4 border-b border-border px-6 py-4">
          <div>
            <h2 className="text-lg font-bold text-foreground">Mamlaka ya Mwisho — Uamuzi wa Ombi la Likizo</h2>
            <p className="mt-0.5 text-[12px] text-muted-foreground">
              Hakiki ombi, ushauri wa HR na barua ya majibu. Unaweza kuidhinisha, kukataa au kurudisha kwa HR. / Review the request, HR recommendation and response letter. You may approve, reject or return to HR.
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
          {/* LEFT: request data, HR recommendation, approval history */}
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
                <p>Mfanyakazi amechukua siku {totalTaken} za likizo ya mwaka {new Date().getFullYear()}.</p>
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

            {/* HR Recommendation */}
            <section className="rounded-xl border border-teal-200 bg-teal-50 p-4 dark:border-teal-900 dark:bg-teal-950/40">
              <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-teal-800 dark:text-teal-300">Mapendekezo ya HR / HR Recommendation</p>
              <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-2 text-[12px]">
                <div>
                  <p className="text-muted-foreground">Siku zilizoidhinishwa / Approved days</p>
                  <p className="font-semibold text-foreground">{letter.approvedDays} siku</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Kumb. Na / Reference number</p>
                  <p className="font-semibold text-foreground">{letter.referenceNumber}</p>
                </div>
              </div>
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
          </div>

          {/* RIGHT: draft letter (read-only) + comment */}
          <div className="flex min-h-0 flex-col overflow-hidden">
            <div className="mb-1.5 flex items-center justify-between gap-3">
              <label className="block text-[12px] font-semibold text-foreground">
                Mwili wa barua ya majibu (rasimu ya HR) / Response letter body (HR draft)
              </label>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto rounded-xl border border-input bg-muted/30 p-4 font-serif text-[14px] leading-relaxed text-foreground">
              <p><strong>Kumb. Na:</strong> {letter.referenceNumber}</p>
              <p className="mt-2 whitespace-pre-wrap">{letter.letterBody}</p>
              <p className="mt-4">Kipindi cha likizo: {formatSwDate(request.startDate)} hadi {formatSwDate(request.endDate)} ({letter.approvedDays} siku). Tarehe ya kurudi kazini: {formatSwDate(request.returnDate)}.</p>
            </div>

            <div className="mt-3">
              <label htmlFor="fa-comment" className="mb-1.5 block text-[12px] font-semibold text-foreground">
                Maoni / Comment
              </label>
              <textarea
                id="fa-comment"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                disabled={disabled}
                rows={3}
                placeholder="Maoni ya hiari (yanahifadhiwa)…"
                className="w-full resize-none rounded-xl border border-input bg-background p-3 text-sm text-foreground outline-none focus:ring-2 focus:ring-teal-600/30"
              />
            </div>
          </div>
        </div>

        {error && (
          <div className="mx-6 mb-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-[12px] font-medium text-rose-700 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-200">
            {error}
          </div>
        )}

        <footer className="flex items-center justify-between gap-3 border-t border-border px-6 py-4">
          <Btn variant="ghost" onClick={onClose} disabled={disabled}>
            Ghairi / Cancel
          </Btn>
          <div className="flex items-center gap-3">
            <Btn variant="outline" onClick={handleReturnToHr} disabled={disabled}>
              Rudisha kwa HR / Return to HR
            </Btn>
            <Btn variant="danger" onClick={handleReject} disabled={disabled}>
              Kataa / Reject
            </Btn>
            <Btn variant="emerald" onClick={handleApprove} disabled={disabled}>
              Idhinisha / Approve
            </Btn>
          </div>
        </footer>
      </div>
    </div>
  )
}

export default FinalAuthorityApprovalModal