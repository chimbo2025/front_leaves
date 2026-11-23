'use client'

import React, { useState } from 'react'
import { Btn } from '@/components/leave/shared'

export interface FinalApprovalModalProps {
  open: boolean
  onClose: () => void
  employeeName: string
  leaveType: string
  standardDays: number
  takenDays: number
  onSubmit: (payload: { daysOverridden: number; referenceNumber: string; letterBody: string }) => void
}

export function FinalApprovalModal({ open, onClose, employeeName, leaveType, standardDays, takenDays, onSubmit }: FinalApprovalModalProps) {
  const [daysOverridden, setDaysOverridden] = useState<number>(standardDays)
  const [referenceNumber, setReferenceNumber] = useState('')
  const [letterBody, setLetterBody] = useState(
    `Ombi lako la ${leaveType} la mwaka ${new Date().getFullYear()} limeidhinishwa.\n\nSababu ya ombi: [sababu]\n\nKipindi cha likizo: [start] hadi [end] (${standardDays} siku). Tarehe ya kurudi kazini: [return date].\n\nAhsante.`,
  )

  if (!open) return null

  const remaining = Math.max(0, standardDays - takenDays)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="flex h-[90vh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-zinc-900">
        <header className="flex items-center justify-between border-b border-border px-6 py-4">
          <h2 className="text-lg font-bold text-foreground">Idhinisha na Tengeneza Barua</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">✕</button>
        </header>

        <div className="grid flex-1 grid-cols-1 gap-6 overflow-hidden p-6 md:grid-cols-2">
          <div className="space-y-5 overflow-y-auto pr-2">
            <div className="rounded-xl border border-border bg-warm p-4 dark:bg-muted/30">
              <p className="text-[13px] leading-relaxed text-foreground/90">
                Mfanyakazi huyu amewahi kuchukua <strong>{takenDays}</strong> siku za likizo ya mwaka. Sera ya kawaida ni <strong>{standardDays}</strong> siku, lakini unaweza kubadilisha (override) idadi ya siku zilizoidhinishwa hapa chini.
              </p>
            </div>

            <div>
              <label className="mb-1.5 block text-[12px] font-semibold text-foreground">Idadi ya siku zilizoidhinishwa (Override)</label>
              <input
                type="number"
                min={0}
                value={daysOverridden}
                onChange={(e) => setDaysOverridden(Number(e.target.value))}
                className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm text-foreground"
              />
              <p className="mt-1 text-[11px] text-muted-foreground">Salio lililobaki baada ya hii: {remaining} siku</p>
            </div>

            <div>
              <label className="mb-1.5 block text-[12px] font-semibold text-foreground">Kumb. Na (Reference Number)</label>
              <input
                type="text"
                value={referenceNumber}
                onChange={(e) => setReferenceNumber(e.target.value)}
                placeholder="e.g. Kumb. Na. 123/2026"
                className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm text-foreground"
              />
            </div>
          </div>

          <div className="flex flex-col overflow-hidden">
            <label className="mb-1.5 block text-[12px] font-semibold text-foreground">Mwili wa barua (Letter body)</label>
            <textarea
              value={letterBody}
              onChange={(e) => setLetterBody(e.target.value)}
              className="flex-1 resize-none rounded-xl border border-input bg-background p-4 font-serif text-sm leading-relaxed text-foreground"
              placeholder="Andika mwili wa barua hapa…"
            />
          </div>
        </div>

        <footer className="flex items-center justify-end gap-3 border-t border-border px-6 py-4">
          <Btn variant="ghost" onClick={onClose}>Ghairi</Btn>
          <Btn
            onClick={() => onSubmit({ daysOverridden, referenceNumber, letterBody })}
            disabled={!referenceNumber.trim() || !letterBody.trim()}
          >
            Idhinisha na Tengeneza Barua
          </Btn>
        </footer>
      </div>
    </div>
  )
}

export default FinalApprovalModal