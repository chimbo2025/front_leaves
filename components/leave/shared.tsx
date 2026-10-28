'use client'

import * as React from 'react'
import { createPortal } from 'react-dom'
import { X, Search, MoreHorizontal, ChevronLeft, ChevronRight, ChevronDown, Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  getEmployee,
  getLeaveType,
  STATUS_STYLE,
  statusLabel,
  statusSwahili,
  fmtShort,
  type Status,
} from '@/lib/leave'

export function StatusPill({ status, className }: { status: Status; className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-semibold',
        STATUS_STYLE[status],
        className,
      )}
    >
      {status === 'approved' && <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />}
      {status === 'under_review' && <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />}
      {statusLabel(status)}
      <span className="font-normal opacity-60">· {statusSwahili(status)}</span>
    </span>
  )
}

export function Avatar({
  id,
  className,
  size = 'md',
}: {
  id: string
  className?: string
  size?: 'sm' | 'md' | 'lg'
}) {
  const emp = getEmployee(id)
  const gradient = emp?.gradient ?? 'from-teal-600 to-cyan-600'
  const text = emp?.initials ?? (id.replace(/^[a-zA-Z]*(\d+)/, '') || '?')
  const sizes = { sm: 'h-6 w-6 text-[10px]', md: 'h-8 w-8 text-xs', lg: 'h-10 w-10 text-sm' }
  return (
    <div
      className={cn(
        'rounded-full bg-gradient-to-br text-white grid place-items-center font-semibold flex-shrink-0',
        gradient,
        sizes[size],
        className,
      )}
    >
      {text}
    </div>
  )
}

export function TypePill({ leaveTypeId, showName }: { leaveTypeId: string; showName?: boolean }) {
  const lt = getLeaveType(leaveTypeId)
  return (
    <span className="inline-flex items-center gap-1.5 text-[12px] text-foreground">
      <span className={cn('h-2 w-2 rounded-full', lt?.color ?? 'bg-zinc-400')} />
      {lt ? (showName ? lt.name : lt.short) : '—'}
    </span>
  )
}

export function SectionHeading({
  title,
  subtitle,
  actions,
}: {
  title: string
  subtitle?: string
  actions?: React.ReactNode
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3 mb-5">
      <div>
        <h2 className="font-serif text-[22px] font-semibold tracking-tight text-foreground leading-none">{title}</h2>
        {subtitle && <p className="text-[13px] text-muted-foreground mt-1.5">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  )
}

export function Panel({
  title,
  subtitle,
  actions,
  icon: Icon,
  children,
  className,
}: {
  title?: string
  subtitle?: string
  actions?: React.ReactNode
  icon?: React.ComponentType<{ className?: string }>
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn('rounded-2xl border border-border bg-card shadow-sm', className)}>
      {(title || actions) && (
        <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-border">
          <div className="min-w-0 flex items-center gap-2.5">
            {Icon && <Icon className="w-4 h-4 text-muted-foreground shrink-0" />}
            <div>
              {title && <p className="text-[14px] font-semibold text-foreground leading-none truncate">{title}</p>}
              {subtitle && <p className="text-[11px] text-muted-foreground mt-1 truncate">{subtitle}</p>}
            </div>
          </div>
          {actions}
        </div>
      )}
      <div className="p-5">{children}</div>
    </div>
  )
}

export function EmptyState({ title, hint, compact }: { title: string; hint?: string; compact?: boolean }) {
  return (
    <div className={cn('flex flex-col items-center justify-center text-center', compact ? 'py-6' : 'py-10')}>
      <div className="h-10 w-10 rounded-full bg-muted grid place-items-center text-muted-foreground mb-3">—</div>
      <p className="text-sm font-medium text-foreground">{title}</p>
      {hint && <p className="text-xs text-muted-foreground mt-1 max-w-[280px]">{hint}</p>}
    </div>
  )
}

export function DateChip({ date }: { date: string }) {
  return (
    <span className="inline-flex items-center rounded-lg border border-border bg-secondary px-2 py-1 text-[11px] font-medium text-foreground tabular-nums">
      {fmtShort(date)}
    </span>
  )
}

export function Field({
  label,
  hint,
  children,
  className,
}: {
  label: string
  hint?: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <label className={cn('block', className)}>
      <span className="text-[12px] font-semibold text-foreground">{label}</span>
      {hint && <span className="block text-[11px] text-muted-foreground mb-1">{hint}</span>}
      <div className="mt-1">{children}</div>
    </label>
  )
}

const inputCls =
  'w-full h-10 rounded-xl border border-input bg-card px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/40 transition'

export function TextInput({
  label,
  hint,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { label?: string; hint?: string }) {
  const input = <input {...props} className={cn(inputCls, props.className)} />
  return label ? (
    <Field label={label} hint={hint}>{input}</Field>
  ) : (
    input
  )
}

export function SelectInput({
  label,
  hint,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement> & { label?: string; hint?: string }) {
  const select = <select {...props} className={cn(inputCls, 'cursor-pointer', props.className)} />
  return label ? (
    <Field label={label} hint={hint}>{select}</Field>
  ) : (
    select
  )
}

export function TextArea({
  label,
  hint,
  ...props
}: React.TextareaHTMLAttributes<HTMLTextAreaElement> & { label?: string; hint?: string }) {
  const area = <textarea {...props} className={cn(inputCls, 'h-auto min-h-[96px] py-2.5 resize-y', props.className)} />
  return label ? (
    <Field label={label} hint={hint}>{area}</Field>
  ) : (
    area
  )
}

/**
 * Multi-select dropdown. Unlike a native `<select multiple>` (which needs
 * ctrl-click and hides the selection count), this keeps chosen values visible
 * as chips and toggles them from a checkbox list. `value` is treated as a set:
 * duplicates are collapsed on every change, so a role can never be added twice.
 */
export function MultiSelect({
  label,
  hint,
  options,
  value,
  onChange,
  placeholder = 'Select…',
  disabled,
}: {
  label?: string
  hint?: string
  options: { value: string; label: string }[]
  value: string[]
  onChange: (next: string[]) => void
  placeholder?: string
  disabled?: boolean
}) {
  const [open, setOpen] = React.useState(false)
  const rootRef = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    if (!open) return
    const onDocDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', onDocDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDocDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const selected = new Set(value)
  const chosen = options.filter((o) => selected.has(o.value))

  const toggle = (v: string) => {
    const next = new Set(value)
    if (next.has(v)) next.delete(v)
    else next.add(v)
    onChange([...next])
  }

  const control = (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((o) => !o)}
        className={cn(
          inputCls,
          'flex h-auto min-h-10 flex-wrap items-center gap-1.5 py-1.5 text-left',
          disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer',
        )}
      >
        {chosen.length === 0 ? (
          <span className="text-muted-foreground">{placeholder}</span>
        ) : (
          chosen.map((c) => (
            <span
              key={c.value}
              className="inline-flex items-center gap-1 rounded-full border border-teal-200 bg-teal-50 px-2 py-0.5 text-[11px] font-semibold text-teal-700 dark:border-teal-900 dark:bg-teal-950 dark:text-teal-300"
            >
              {c.label}
            </span>
          ))
        )}
        <ChevronDown className={cn('ml-auto h-4 w-4 shrink-0 text-muted-foreground transition', open && 'rotate-180')} />
      </button>
      {open && (
        <div className="absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-xl border border-border bg-popover p-1 shadow-lg">
          {options.length === 0 ? (
            <p className="px-2 py-1.5 text-[12px] text-muted-foreground">No options available.</p>
          ) : (
            options.map((o) => {
              const on = selected.has(o.value)
              return (
                <button
                  key={o.value}
                  type="button"
                  onClick={() => toggle(o.value)}
                  className={cn(
                    'flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-[13px] transition hover:bg-accent',
                    on ? 'text-foreground' : 'text-muted-foreground',
                  )}
                >
                  <span className={cn('flex h-4 w-4 shrink-0 items-center justify-center rounded border', on ? 'border-teal-600 bg-teal-600 text-white' : 'border-input')}>
                    {on && <Check className="h-3 w-3" />}
                  </span>
                  <span className="truncate">{o.label}</span>
                </button>
              )
            })
          )}
        </div>
      )}
    </div>
  )

  return label ? <Field label={label} hint={hint}>{control}</Field> : control
}

const modalSizes = { md: 'max-w-2xl', lg: 'max-w-4xl', xl: 'max-w-6xl' }

export function Modal({
  open,
  onClose,
  title,
  subtitle,
  children,
  footer,
  size = 'lg',
}: {
  open: boolean
  onClose: () => void
  title: React.ReactNode
  subtitle?: React.ReactNode
  children: React.ReactNode
  footer?: React.ReactNode
  size?: keyof typeof modalSizes
}) {
  React.useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [open, onClose])

  if (!open) return null

  // Portal to <body>: detail modals open further modals (the letter view),
  // and a fixed overlay nested inside another modal's transformed card would
  // be contained and clipped by it instead of the viewport.
  if (typeof document === 'undefined') return null

  return createPortal(
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 sm:p-6">
      <div className="absolute inset-0 bg-zinc-950/60 backdrop-blur-sm animate-in fade-in" onClick={onClose} />
      <div
        className={cn(
          'relative w-full flex flex-col rounded-2xl border border-border bg-card shadow-2xl',
          'h-[88vh] max-h-[88vh] animate-in zoom-in-95 slide-in-from-bottom-2 duration-200',
          modalSizes[size],
        )}
      >
        <div className="flex items-start justify-between gap-4 px-6 py-4 border-b border-border shrink-0">
          <div className="min-w-0">
            <h3 className="font-serif text-[17px] font-semibold leading-tight text-foreground truncate">{title}</h3>
            {subtitle && <p className="text-[12px] text-muted-foreground mt-1 truncate">{subtitle}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="h-8 w-8 shrink-0 rounded-full border border-border grid place-items-center text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-5">{children}</div>
        {footer && (
          <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-border shrink-0">{footer}</div>
        )}
      </div>
    </div>,
    document.body,
  )
}

export interface RowMenuItem {
  icon: React.ComponentType<{ className?: string }>
  label: string
  onClick?: () => void
  disabled?: boolean
  title?: string
  tone?: 'default' | 'danger'
}

export function RowMenu({
  items,
  align = 'right',
  label,
}: {
  items: RowMenuItem[]
  align?: 'left' | 'right'
  label?: string
}) {
  const [open, setOpen] = React.useState(false)
  const [anchor, setAnchor] = React.useState<{ x: number; top: number; right: number; maxH: number } | null>(null)
  const btnRef = React.useRef<HTMLButtonElement>(null)

  const close = React.useCallback(() => setOpen(false), [])

  React.useEffect(() => {
    if (!open) return
    window.addEventListener('scroll', close, true)
    window.addEventListener('resize', close)
    return () => {
      window.removeEventListener('scroll', close, true)
      window.removeEventListener('resize', close)
    }
  }, [open, close])

  const toggle = () => {
    if (!open) {
      const el = btnRef.current
      if (el) {
        const rect = el.getBoundingClientRect()
        setAnchor({
          x: rect.left,
          top: rect.top,
          right: Math.max(8, window.innerWidth - rect.right),
          maxH: Math.max(140, rect.top - 8),
        })
      }
    }
    setOpen((v) => !v)
  }

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        aria-label="Row actions"
        title="Row actions"
        onClick={(e) => {
          e.stopPropagation()
          toggle()
        }}
        className={cn(
          label
            ? 'h-8 inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 text-[11px] font-semibold text-muted-foreground hover:bg-accent hover:text-foreground transition-colors'
            : 'h-8 w-8 rounded-lg border border-border grid place-items-center text-muted-foreground hover:bg-accent hover:text-foreground transition-colors',
        )}
      >
        <MoreHorizontal className="h-4 w-4" />
        {label && <span>{label}</span>}
      </button>
      {open &&
        anchor &&
        createPortal(
          <>
            <div className="fixed inset-0 z-[94]" onClick={close} />
            <div
              role="menu"
              className={cn(
                'fixed z-[95] w-56 max-h-[70vh] overflow-y-auto rounded-xl border border-border bg-card p-1.5 shadow-2xl animate-in zoom-in-95 fade-in',
                '-translate-y-full',
              )}
              style={{ top: anchor.top, right: align === 'right' ? anchor.right : undefined, left: align === 'left' ? anchor.x : undefined }}
            >
              {items.map((item, i) => (
                <button
                  key={i}
                  type="button"
                  role="menuitem"
                  title={item.title}
                  disabled={item.disabled}
                  onClick={() => {
                    close()
                    item.onClick?.()
                  }}
                  className={cn(
                    'w-full flex items-center gap-2.5 rounded-lg px-3 py-2 text-[12px] font-medium text-left transition-colors',
                    item.disabled
                      ? 'opacity-40 cursor-not-allowed'
                      : item.tone === 'danger'
                        ? 'text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/60'
                        : 'text-foreground hover:bg-accent',
                  )}
                >
                  <item.icon className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">{item.label}</span>
                </button>
              ))}
            </div>
          </>,
          document.body,
        )}
    </>
  )
}

export interface TableFilter {
  value: string
  onChange: (value: string) => void
  options: { value: string; label: string }[]
  label?: string
}

export function TableToolbar({
  search,
  onSearch,
  placeholder = 'Search…',
  filters,
  count,
}: {
  search: string
  onSearch: (value: string) => void
  placeholder?: string
  filters?: TableFilter[]
  count?: number
}) {
  return (
    <div className="flex flex-wrap items-center gap-2 px-5 pt-4 pb-3 border-b border-border">
      <div className="relative flex-1 min-w-[200px]">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
        <input
          value={search}
          onChange={(e) => onSearch(e.target.value)}
          placeholder={placeholder}
          className="w-full h-9 pl-9 pr-3 rounded-xl border border-input bg-card text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/40 transition"
        />
      </div>
      {filters?.map((f, i) => (
        <select
          key={i}
          value={f.value}
          aria-label={f.label}
          onChange={(e) => f.onChange(e.target.value)}
          className="h-9 rounded-xl border border-input bg-card px-2.5 text-sm text-foreground cursor-pointer focus:outline-none focus:ring-2 focus:ring-ring/40 transition"
        >
          {f.options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      ))}
      {count !== undefined && <span className="text-[11px] text-muted-foreground tabular-nums">{count} rows</span>}
    </div>
  )
}

export function ConfirmModal({
  open,
  onClose,
  title,
  message,
  confirmLabel = 'Confirm',
  tone = 'danger',
  onConfirm,
}: {
  open: boolean
  onClose: () => void
  title: string
  message: React.ReactNode
  confirmLabel?: string
  tone?: 'danger' | 'primary'
  onConfirm: () => void
}) {
  return (
    <Modal open={open} onClose={onClose} title={title} size="md">
      <div className="text-sm text-muted-foreground leading-relaxed">{message}</div>
      <div className="flex items-center justify-end gap-2 mt-6">
        <button
          type="button"
          onClick={onClose}
          className="h-10 px-4 rounded-xl border border-border bg-card text-sm font-medium text-foreground hover:bg-accent"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={() => {
            onConfirm()
            onClose()
          }}
          className={cn(
            'h-10 px-4 rounded-xl text-sm font-semibold text-white shadow-sm',
            tone === 'danger' ? 'bg-rose-600 hover:bg-rose-700' : 'bg-teal-700 hover:bg-teal-800',
          )}
        >
          {confirmLabel}
        </button>
      </div>
    </Modal>
  )
}

export function Btn({
  variant = 'primary',
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'outline' | 'ghost' | 'danger' | 'soft' | 'emerald'
}) {
  const variants = {
    primary: 'bg-teal-700 text-white hover:bg-teal-800 shadow-sm shadow-teal-700/20',
    outline: 'border border-border bg-card text-foreground hover:bg-accent shadow-sm',
    ghost: 'text-muted-foreground hover:bg-accent hover:text-foreground',
    danger: 'bg-rose-600 text-white hover:bg-rose-700 shadow-sm',
    emerald: 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm shadow-emerald-600/20',
    soft: 'bg-teal-700/10 text-teal-800 dark:text-teal-300 hover:bg-teal-700/20',
  }
  return (
    <button
      {...props}
      className={cn(
        'inline-flex items-center justify-center gap-1.5 rounded-full px-4 py-2 text-[12px] font-semibold transition disabled:opacity-50 disabled:pointer-events-none',
        variants[variant],
        className,
      )}
    />
  )
}

export function StatCard({
  icon: Icon,
  label,
  value,
  hint,
  tone = 'teal',
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value: React.ReactNode
  hint?: string
  tone?: 'teal' | 'amber' | 'rose' | 'emerald' | 'sky' | 'violet'
}) {
  const tones = {
    teal: 'bg-teal-700/10 text-teal-700 dark:text-teal-300',
    amber: 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300',
    rose: 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300',
    emerald: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300',
    sky: 'bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300',
    violet: 'bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-300',
  }
  return (
    <div className="rounded-2xl border border-border bg-card p-4 flex items-center gap-3.5 shadow-sm">
      <div className={cn('h-11 w-11 rounded-xl grid place-items-center flex-shrink-0', tones[tone])}>
        <Icon className="w-5 h-5" />
      </div>
      <div className="min-w-0">
        <p className="font-serif text-[24px] font-semibold leading-none text-foreground tabular-nums">{value}</p>
        <p className="text-[12px] font-medium text-foreground mt-1 truncate">{label}</p>
        {hint && <p className="text-[10px] text-muted-foreground mt-0.5 truncate">{hint}</p>}
      </div>
    </div>
  )
}

export function Pagination({
  page,
  pageSize,
  total,
  onPage,
  onPageSize,
  pageSizeOptions = [5, 10, 20, 50],
}: {
  page: number
  pageSize: number
  total: number
  onPage: (p: number) => void
  onPageSize: (s: number) => void
  pageSizeOptions?: number[]
}) {
  const pages = Math.max(1, Math.ceil(total / pageSize))
  const safePage = Math.min(page, pages)
  const from = total === 0 ? 0 : (safePage - 1) * pageSize + 1
  const to = Math.min(total, safePage * pageSize)
  const windowStart = Math.max(1, Math.min(safePage - 2, pages - 4))
  const pageNums: number[] = []
  for (let i = windowStart; i <= Math.min(pages, windowStart + 4); i++) pageNums.push(i)

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 border-t border-border">
      <div className="flex items-center gap-2">
        <select
          aria-label="Rows per page"
          value={pageSize}
          onChange={(e) => onPageSize(Number(e.target.value))}
          className="h-8 rounded-lg border border-input bg-card px-2 text-[12px] text-foreground cursor-pointer focus:outline-none focus:ring-2 focus:ring-ring/40"
        >
          {pageSizeOptions.map((s) => (
            <option key={s} value={s}>{s} per page</option>
          ))}
        </select>
        <span className="text-[11px] text-muted-foreground tabular-nums">
          {from}–{to} of {total}
        </span>
      </div>
      <div className="flex items-center gap-1">
        <button
          type="button"
          aria-label="Previous page"
          disabled={safePage <= 1}
          onClick={() => onPage(safePage - 1)}
          className="h-8 w-8 rounded-lg border border-border bg-card grid place-items-center text-foreground hover:bg-accent disabled:opacity-40 disabled:pointer-events-none transition"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        {safePage > 3 && <span className="px-1 text-[11px] text-muted-foreground">…</span>}
        {pageNums.map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => onPage(p)}
            className={cn(
              'h-8 min-w-8 px-2 rounded-lg text-[12px] font-semibold transition',
              p === safePage
                ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900'
                : 'text-muted-foreground hover:bg-accent hover:text-foreground',
            )}
          >
            {p}
          </button>
        ))}
        {safePage < pages - 3 && <span className="px-1 text-[11px] text-muted-foreground">…</span>}
        <button
          type="button"
          aria-label="Next page"
          disabled={safePage >= pages}
          onClick={() => onPage(safePage + 1)}
          className="h-8 w-8 rounded-lg border border-border bg-card grid place-items-center text-foreground hover:bg-accent disabled:opacity-40 disabled:pointer-events-none transition"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}

export function Tabs({
  tabs,
  value,
  onChange,
  className,
}: {
  tabs: { value: string; label: string; icon?: React.ComponentType<{ className?: string }>; badge?: number }[]
  value: string
  onChange: (v: string) => void
  className?: string
}) {
  return (
    <div className={cn('inline-flex flex-wrap items-center gap-1 rounded-full border border-border bg-card p-1 shadow-sm', className)}>
      {tabs.map((t) => {
        const Icon = t.icon
        const active = value === t.value
        return (
          <button
            key={t.value}
            type="button"
            onClick={() => onChange(t.value)}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[12px] font-semibold transition',
              active
                ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 shadow-sm'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {Icon && <Icon className="w-3.5 h-3.5" />}
            {t.label}
            {t.badge !== undefined && t.badge > 0 && (
              <span className={cn('min-w-4 h-4 px-1 rounded-full text-[9px] font-bold flex items-center justify-center', active ? 'bg-white/20 text-white' : 'bg-zinc-200 dark:bg-zinc-800 text-muted-foreground')}>
                {t.badge}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}

export function usePaged<T>(items: T[], pageSize = 10) {
  const [page, setPage] = React.useState(1)
  const [size, setSize] = React.useState(pageSize)
  const total = items.length
  const pages = Math.max(1, Math.ceil(total / size))
  const safePage = Math.min(Math.max(1, page), pages)
  React.useEffect(() => {
    if (safePage !== page) setPage(safePage)
  }, [safePage, page])
  return {
    page: safePage,
    size,
    total,
    setPage,
    setSize: (s: number) => {
      setSize(s)
      setPage(1)
    },
    items: items.slice((safePage - 1) * size, safePage * size),
  }
}