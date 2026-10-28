'use client'

import { useCallback, useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { AlertTriangle, Check, Loader2, PenLine, Upload, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { SignatureCanvas, useSignatureCanvas } from '@/components/leave/signature-canvas'
import { SignatureUpload, useSignatureUpload } from '@/components/leave/signature-upload'

export interface ApprovalModalProps {
  open: boolean
  onClose: () => void
  allowOverwrite?: boolean
  onSignatureComplete?: (path: string, hash: string) => void | Promise<void>
}

type Tab = 'draw' | 'upload'

export function ApprovalModal({ open, onClose, allowOverwrite = true, onSignatureComplete }: ApprovalModalProps) {
  const [tab, setTab] = useState<Tab>('draw')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const { signature, handleSave: handleCanvasSave, handleClear: handleCanvasClear } = useSignatureCanvas()
  const {
    signature: uploadSignature,
    handleSave: handleUploadSave,
    handleClear: handleUploadClear,
    error: uploadError,
    setError: setUploadError,
  } = useSignatureUpload()

  const reset = useCallback(() => {
    handleCanvasClear()
    handleUploadClear()
    setUploadError(null)
    setTab('draw')
    setError(null)
    setSaving(false)
  }, [handleCanvasClear, handleUploadClear, setUploadError])

  // Never let a signature from a previous approval leak into the next one.
  useEffect(() => {
    if (open) reset()
  }, [open, reset])

  useEffect(() => {
    if (!open) return

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !saving) onClose()
    }

    window.addEventListener('keydown', onKey)

    return () => {
      window.removeEventListener('keydown', onKey)
    }
  }, [open, onClose, saving])

  if (!open || typeof document === 'undefined') return null

  const currentSignature = tab === 'draw' ? signature : uploadSignature
  const activeError = error ?? uploadError

  const onSave = async () => {
    if (!currentSignature) {
      setError(tab === 'draw' ? 'Draw your signature in the box first.' : 'Choose a signature image first.')
      return
    }

    setSaving(true)
    setError(null)

    try {
      const hash = await computeHash(currentSignature)

      if (onSignatureComplete) {
        // The parent flips the step to "completed", which hides this modal and
        // reveals the return-date form. Do not call onClose here: the parent's
        // onClose is the cancel path and would put the step back to "pending".
        await onSignatureComplete(currentSignature, hash)
      } else {
        onClose()
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save the signature. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  return createPortal(
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 sm:p-6">
      <div
        className="absolute inset-0 bg-zinc-950/60 backdrop-blur-sm"
        onClick={() => {
          if (!saving) onClose()
        }}
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="approval-signature-title"
        className="relative flex max-h-[90vh] w-full max-w-xl flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-2xl"
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-4 border-b border-border px-6 py-4">
          <div className="flex items-start gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-teal-700/10 text-teal-700 dark:text-teal-300">
              <PenLine className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <h2
                id="approval-signature-title"
                className="font-serif text-[17px] font-semibold leading-tight text-foreground"
              >
                Add your signature
              </h2>
              <p className="mt-1 text-[12px] leading-snug text-muted-foreground">
                Your signature is attached to this approval and cannot be changed afterwards.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            aria-label="Close signature dialog"
            className="rounded-full p-1.5 text-muted-foreground transition hover:bg-accent hover:text-foreground disabled:pointer-events-none disabled:opacity-50"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Tabs */}
        <div className="border-b border-border px-6 py-3">
          <div className="inline-flex rounded-full bg-muted p-1">
            <button
              type="button"
              onClick={() => {
                setTab('draw')
                setError(null)
              }}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-[12px] font-semibold transition',
                tab === 'draw'
                  ? 'bg-card text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              <PenLine className="h-3.5 w-3.5" /> Draw
            </button>
            <button
              type="button"
              onClick={() => {
                setTab('upload')
                setError(null)
              }}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-[12px] font-semibold transition',
                tab === 'upload'
                  ? 'bg-card text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              <Upload className="h-3.5 w-3.5" /> Upload
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {tab === 'draw' ? (
            <SignatureCanvas
              value={signature}
              onChange={(value) => {
                if (value) handleCanvasSave(value)
                else handleCanvasClear()
              }}
              disabled={!allowOverwrite || saving}
            />
          ) : (
            <SignatureUpload
              value={uploadSignature}
              onChange={(value) => {
                if (value) handleUploadSave(value)
                else handleUploadClear()
              }}
              disabled={!allowOverwrite || saving}
            />
          )}

          {activeError ? (
            <div className="mt-3 flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-[12px] text-rose-700 dark:border-rose-900 dark:bg-rose-950 dark:text-rose-300">
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span>{activeError}</span>
            </div>
          ) : null}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-3 border-t border-border px-6 py-4">
          <p className="hidden text-[11px] text-muted-foreground sm:block">
            Required before leave can be granted.
          </p>

          <div className="ml-auto flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="inline-flex items-center justify-center gap-1.5 rounded-full border border-border bg-card px-4 py-2 text-[12px] font-semibold text-foreground shadow-sm transition hover:bg-accent disabled:pointer-events-none disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={onSave}
              disabled={saving || !currentSignature}
              className="inline-flex items-center justify-center gap-1.5 rounded-full bg-emerald-600 px-4 py-2 text-[12px] font-semibold text-white shadow-sm shadow-emerald-600/20 transition hover:bg-emerald-700 disabled:pointer-events-none disabled:opacity-50"
            >
              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
              {saving ? 'Saving…' : 'Save & Continue'}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  )
}

async function computeHash(dataUrl: string): Promise<string> {
  const data = await fetch(dataUrl).then((res) => res.arrayBuffer())
  const hash = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}
