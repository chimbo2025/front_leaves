'use client'

import { useCallback, useRef, useState } from 'react'
import { AlertTriangle, Check, Loader2, Trash2, Upload } from 'lucide-react'
import { cn } from '@/lib/utils'

const DEFAULT_ACCEPTED_TYPES = ['image/png', 'image/jpeg', 'image/webp']

interface SignatureUploadProps {
  value: string | null
  onChange: (value: string | null) => void
  disabled?: boolean
  maxSizeMB?: number
  acceptedTypes?: string[]
}

export function SignatureUpload({
  value,
  onChange,
  disabled = false,
  maxSizeMB = 2,
  acceptedTypes = DEFAULT_ACCEPTED_TYPES,
}: SignatureUploadProps) {
  const [error, setError] = useState<string | null>(null)
  const [reading, setReading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFile = useCallback(
    (file: File) => {
      setError(null)

      if (!acceptedTypes.includes(file.type)) {
        setError('Use a PNG, JPEG or WebP image.')
        return
      }

      if (file.size > maxSizeMB * 1024 * 1024) {
        setError(`The image must be smaller than ${maxSizeMB} MB.`)
        return
      }

      setReading(true)
      const reader = new FileReader()

      reader.onload = () => {
        const dataUrl = typeof reader.result === 'string' ? reader.result : null
        setReading(false)
        if (dataUrl) onChange(dataUrl)
        else setError('Could not read that image. Please try another file.')
      }

      reader.onerror = () => {
        setReading(false)
        setError('Could not read that image. Please try another file.')
      }

      reader.readAsDataURL(file)
    },
    [acceptedTypes, maxSizeMB, onChange],
  )

  const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) handleFile(file)
    e.target.value = ''
  }

  const onDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    if (disabled || reading) return
    const file = e.dataTransfer.files?.[0]
    if (file) handleFile(file)
  }

  const clear = () => {
    setError(null)
    onChange(null)
    if (inputRef.current) inputRef.current.value = ''
  }

  const openPicker = () => {
    if (!disabled && !reading) inputRef.current?.click()
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[12px] font-semibold text-foreground">Upload a signature image</p>
          <p className="text-[11px] text-muted-foreground">
            PNG, JPEG or WebP · up to {maxSizeMB} MB.
          </p>
        </div>
        {value && !disabled ? (
          <button
            type="button"
            onClick={clear}
            className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-[11px] font-semibold text-muted-foreground shadow-sm transition hover:bg-accent hover:text-foreground"
          >
            <Trash2 className="h-3.5 w-3.5" /> Remove
          </button>
        ) : null}
      </div>

      <div
        role="button"
        tabIndex={disabled ? -1 : 0}
        onClick={openPicker}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            openPicker()
          }
        }}
        onDragOver={(e) => e.preventDefault()}
        onDrop={onDrop}
        className={cn(
          'relative overflow-hidden rounded-xl border-2 border-dashed border-border bg-card transition',
          !disabled && 'cursor-pointer hover:border-teal-600/50 hover:bg-accent/40',
          disabled && 'cursor-not-allowed opacity-60',
        )}
      >
        <input
          ref={inputRef}
          type="file"
          accept={acceptedTypes.join(',')}
          className="sr-only"
          onChange={onInputChange}
          onClick={(e) => e.stopPropagation()}
          disabled={disabled || reading}
        />

        {reading ? (
          <div className="flex flex-col items-center justify-center gap-2 px-6 py-10">
            <Loader2 className="h-6 w-6 animate-spin text-teal-700 dark:text-teal-300" />
            <p className="text-[12px] text-muted-foreground">Reading image…</p>
          </div>
        ) : value ? (
          <div className="space-y-2 p-4">
            <div className="flex items-center gap-2 text-[12px] font-semibold text-emerald-700 dark:text-emerald-300">
              <Check className="h-4 w-4" /> Signature image ready
            </div>
            <div className="grid place-items-center rounded-lg border border-border bg-white p-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={value} alt="Signature preview" className="max-h-28 w-auto object-contain" />
            </div>
            <p className="text-center text-[11px] text-muted-foreground">
              Click to replace the image.
            </p>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center gap-2 px-6 py-10">
            <span className="grid h-11 w-11 place-items-center rounded-xl bg-teal-700/10 text-teal-700 dark:text-teal-300">
              <Upload className="h-5 w-5" />
            </span>
            <p className="text-[12px] font-semibold text-foreground">Drop your signature here</p>
            <p className="text-[11px] text-muted-foreground">or click to browse your files</p>
          </div>
        )}
      </div>

      {error ? (
        <div className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-[12px] text-rose-700 dark:border-rose-900 dark:bg-rose-950 dark:text-rose-300">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>{error}</span>
        </div>
      ) : null}
    </div>
  )
}

export function useSignatureUpload() {
  const [signature, setSignature] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleSave = useCallback((dataUrl: string) => {
    setSignature(dataUrl)
    setError(null)
  }, [])

  const handleClear = useCallback(() => {
    setSignature(null)
    setError(null)
  }, [])

  return {
    signature,
    setSignature,
    handleSave,
    handleClear,
    error,
    setError,
  }
}
