'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Eraser } from 'lucide-react'
import { cn } from '@/lib/utils'

interface SignatureCanvasProps {
  value: string | null // base64 PNG data URL
  onChange: (value: string | null) => void
  disabled?: boolean
  width?: number
  height?: number
  className?: string
}

export function SignatureCanvas({
  value,
  onChange,
  disabled = false,
  width = 640,
  height = 220,
  className,
}: SignatureCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const drawingRef = useRef(false)
  const internalChangeRef = useRef(false)
  const [hasInk, setHasInk] = useState(() => Boolean(value))

  // Set up the drawing surface once. The canvas is deliberately white so the
  // signature stays readable in both light and dark themes.
  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return

    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    ctx.strokeStyle = '#0f172a'
    ctx.lineWidth = 2.4
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
  }, [])

  // The canvas is remounted when the user switches between the Draw and Upload
  // tabs. Restore the signature held by the parent so switching tabs never
  // looks like the signature was lost.
  useEffect(() => {
    if (internalChangeRef.current) {
      internalChangeRef.current = false
      return
    }

    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return

    if (!value) {
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      ctx.strokeStyle = '#0f172a'
      ctx.lineWidth = 2.4
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'
      setHasInk(false)
      return
    }

    const image = new Image()
    image.onload = () => {
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      ctx.drawImage(image, 0, 0, canvas.width, canvas.height)
      ctx.strokeStyle = '#0f172a'
      ctx.lineWidth = 2.4
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'
      setHasInk(true)
    }
    image.src = value
  }, [value])

  const getPoint = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return { x: 0, y: 0 }

    const rect = canvas.getBoundingClientRect()
    return {
      x: (e.clientX - rect.left) * (canvas.width / rect.width),
      y: (e.clientY - rect.top) * (canvas.height / rect.height),
    }
  }, [])

  const start = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      if (disabled) return
      e.preventDefault()
      e.currentTarget.setPointerCapture(e.pointerId)

      const ctx = canvasRef.current?.getContext('2d')
      if (!ctx) return

      const point = getPoint(e)
      ctx.beginPath()
      ctx.moveTo(point.x, point.y)
      drawingRef.current = true
      setHasInk(true)
    },
    [disabled, getPoint],
  )

  const move = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      if (!drawingRef.current || disabled) return
      e.preventDefault()

      const ctx = canvasRef.current?.getContext('2d')
      if (!ctx) return

      const point = getPoint(e)
      ctx.lineTo(point.x, point.y)
      ctx.stroke()
    },
    [disabled, getPoint],
  )

  const end = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      if (!drawingRef.current) return
      drawingRef.current = false

      try {
        e.currentTarget.releasePointerCapture(e.pointerId)
      } catch {
        // The pointer may already have been released by the browser.
      }

      const canvas = canvasRef.current
      if (canvas) {
        internalChangeRef.current = true
        onChange(canvas.toDataURL('image/png'))
      }
    },
    [onChange],
  )

  const clear = useCallback(() => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return

    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    ctx.strokeStyle = '#0f172a'
    ctx.lineWidth = 2.4
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'

    setHasInk(false)
    internalChangeRef.current = true
    onChange(null)
  }, [onChange])

  return (
    <div className={cn('space-y-3', className)}>
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[12px] font-semibold text-foreground">Draw your signature</p>
          <p className="text-[11px] text-muted-foreground">Use your mouse, trackpad or finger.</p>
        </div>
        <button
          type="button"
          onClick={clear}
          disabled={disabled || !hasInk}
          className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-[11px] font-semibold text-muted-foreground shadow-sm transition hover:bg-accent hover:text-foreground disabled:pointer-events-none disabled:opacity-50"
        >
          <Eraser className="h-3.5 w-3.5" /> Clear
        </button>
      </div>

      <div className="relative overflow-hidden rounded-xl border border-border bg-white">
        <canvas
          ref={canvasRef}
          width={width}
          height={height}
          className={cn('block w-full touch-none', disabled ? 'cursor-not-allowed' : 'cursor-crosshair')}
          style={{ aspectRatio: `${width} / ${height}` }}
          onPointerDown={start}
          onPointerMove={move}
          onPointerUp={end}
          onPointerCancel={end}
          onPointerLeave={(e) => {
            if (drawingRef.current) end(e)
          }}
        />

        {!hasInk && !disabled ? (
          <div className="pointer-events-none absolute inset-0 grid place-items-center">
            <p className="text-[12px] text-zinc-400">Sign here</p>
          </div>
        ) : null}

        {disabled ? (
          <div className="absolute inset-0 grid place-items-center bg-white/70">
            <p className="text-[12px] font-medium text-zinc-500">Signing disabled</p>
          </div>
        ) : null}
      </div>

      <p className="text-[11px] text-muted-foreground">
        A white background is kept so the signature remains readable in both themes.
      </p>
    </div>
  )
}

export function useSignatureCanvas() {
  const [signature, setSignature] = useState<string | null>(null)

  const handleSave = useCallback((dataUrl: string) => {
    setSignature(dataUrl)
  }, [])

  const handleClear = useCallback(() => {
    setSignature(null)
  }, [])

  return {
    signature,
    setSignature,
    handleSave,
    handleClear,
  }
}
