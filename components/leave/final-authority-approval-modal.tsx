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
  onSubmit: (letter: LetterData) => void
}

function formatSwDate(value?: string | null): string {
  if (!value) return '—'
  const date = new Date(value.length <= 10 ? `${value}T00:00:00` : value.replace(' ', 'T'))
  if (Number.isNaN(date.getTime())) return '—'
  const months = ['Januari', 'Februari', 'Machi', 'Aprili', 'Mei', 'Juni', 'Julai', 'Agosti', 'Septemba', 'Oktoba', 'Novemba', 'Desemba']
  return `${String(date.getDate()).padStart(2, '0')} ${months[date.getMonth()]} ${date.getFullYear()}`
}

export function FinalAuthorityApprovalModal({ open, onClose, request, onSubmit }: FinalAuthorityApprovalModalProps) {
  const [approvedDays, setApprovedDays] = useState<number>(request.requestedDays)
  const [referenceNumber, setReferenceNumber] = useState('')
  const [letterBody, setLetterBody] = useState(
    `Ombi lako la ${request.leaveType} la mwaka ${new Date(request.startDate || Date.now()).getFullYear()} limeidhinishwa.\n\nSababu ya ombi: [sababu]\n\nKipindi cha likizo: ${formatSwDate(request.startDate)} hadi ${formatSwDate(request.endDate)} (${request.requestedDays} siku). Tarehe ya kurudi kazini: ${formatSwDate(request.returnDate)}.\n\nAhsante.`
  )
  const [showPreview, setShowPreview] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!open) return null

  const takenDays = request.leaveHistory.reduce((sum, h) => sum + h.daysTaken, 0)
  const remaining = Math.max(0, request.requestedDays - takenDays)

  const handleSubmit = () => {
    setError(null)
    if (!referenceNumber.trim()) {
      setError('Weka namba ya kumbukumbu (Kumb. Na) kabla ya kutuma barua.')
      return
    }
    if (!Number.isInteger(approvedDays) || approvedDays < 1) {
      setError('Idadi ya siku zilizoidhinishwa lazima iwe angalau 1.')
      return
    }
    if (!letterBody.trim()) {
      setError('Mwili wa barua ni mfupi mno.')
      return
    }
    onSubmit({ referenceNumber: referenceNumber.trim(), approvedDays, letterBody: letterBody.trim() })
  }

  const resetBody = () => {
    setLetterBody(
      `Ombi lako la ${request.leaveType} la mwaka ${new Date(request.startDate || Date.now()).getFullYear()} limeidhinishwa.\n\nSababu ya ombi: [sababu]\n\nKipindi cha likizo: ${formatSwDate(request.startDate)} hadi ${formatSwDate(request.endDate)} (${approvedDays} siku). Tarehe ya kurudi kazini: ${formatSwDate(request.returnDate)}.\n\nAhsante.`
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="flex h-[90vh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-zinc-900">
        <header className="flex items-center justify-between border-b border-border px-6 py-4">
          <h2 className="text-lg font-bold text-foreground">Idhinisha na Tengeneza Barua (Final Authority)</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">✕</button>
        </header>

        <div className="grid flex-1 grid-cols-1 gap-6 overflow-hidden p-6 md:grid-cols-2">
          {/* LEFT: System advice + overrides */}
          <div className="space-y-5 overflow-y-auto pr-2">
            {/* System Advice */}
            <section className="rounded-xl border border-sky-200 bg-sky-50 p-4 text-[12px] leading-relaxed text-sky-900 dark:border-sky-900 dark:bg-sky-950/40 dark:text-sky-200">
              <p className="font-semibold">Ushauri wa Mfumo (System Advice)</p>
              <div className="mt-2 space-y-1 text-sky-900/90 dark:text-sky-200/90">
                <p>Mfanyakazi huyu amewahi kuchukua <strong>{takenDays}</strong> siku za likizo ya mwaka.</p>
                <p>Siku zilizoombwa: <strong>{request.requestedDays}</strong>. Salio lililobaki baada ya hii: <strong>{remaining}</strong> siku.</p>
                {request.leaveHistory.length > 0 && (
                  <div className="mt-2 border-t border-sky-200/70 pt-2">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-sky-800 dark:text-sky-300">Historia ya Likizo</p>
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

            {/* Approved Days Override */}
            <div>
              <label className="mb-1.5 block text-[12px] font-semibold text-foreground">
                Idadi ya siku zilizoidhinishwa (Override)
              </label>
              <input
                type="number"
                min={0}
                value={approvedDays}
                onChange={(e) => setApprovedDays(Number(e.target.value))}
                className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-teal-600/30"
              />
              <p className="mt-1 text-[11px] text-muted-foreground">
                Ombi la awali: {request.requestedDays} siku. Salio lililobaki baada ya hii: {remaining} siku.
              </p>
            </div>

            {/* Reference Number */}
            <div>
              <label className="mb-1.5 block text-[12px] font-semibold text-foreground">
                Kumb. Na (Reference Number)
              </label>
              <input
                type="text"
                value={referenceNumber}
                onChange={(e) => setReferenceNumber(e.target.value)}
                placeholder="e.g. Kumb. Na. 123/2026"
                className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-teal-600/30"
              />
            </div>

            {/* Approvers chain */}
            {request.approvers.length > 0 && (
              <section>
                <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">Mnyororo wa Uidhinishaji / Approval Chain</p>
                <ol className="space-y-1.5">
                  {request.approvers.map((a, i) => (
                    <li key={i} className="flex items-center justify-between gap-3 rounded-lg border border-border bg-background px-3 py-2">
                      <span className="text-[12px] font-semibold text-foreground">{a.name}</span>
                      <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">{a.role}</span>
                    </li>
                  ))}
                </ol>
              </section>
            )}
          </div>

          {/* RIGHT: letter body editor */}
          <div className="flex flex-col overflow-hidden">
            <div className="mb-1.5 flex items-center justify-between gap-3">
              <label className="block text-[12px] font-semibold text-foreground">
                Mwili wa barua ya majibu / Response letter body
              </label>
              <button
                type="button"
                onClick={resetBody}
                className="text-[11px] font-semibold text-teal-700 hover:underline dark:text-teal-300"
              >
                Rejesha kiolezo
              </button>
            </div>
            <textarea
              value={letterBody}
              onChange={(e) => setLetterBody(e.target.value)}
              className="min-h-0 flex-1 resize-none rounded-xl border border-input bg-background p-4 font-serif text-[14px] leading-relaxed text-foreground outline-none focus:ring-2 focus:ring-teal-600/30"
              placeholder="Andika mwili wa barua hapa…"
            />
          </div>
        </div>

        {error && (
          <div className="mx-6 mb-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-[12px] font-medium text-rose-700 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-200">
            {error}
          </div>
        )}

        <footer className="flex items-center justify-between gap-3 border-t border-border px-6 py-4">
          <Btn variant="outline" onClick={() => setShowPreview(true)}>
            Hakiki / Preview
          </Btn>
          <div className="flex items-center gap-3">
            <Btn variant="ghost" onClick={onClose}>Ghairi</Btn>
            <Btn variant="emerald" onClick={handleSubmit} disabled={!referenceNumber.trim() || !letterBody.trim()}>
              Idhinisha na Tengeneza Barua
            </Btn>
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

export default FinalAuthorityApprovalModal