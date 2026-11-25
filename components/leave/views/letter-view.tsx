'use client'

import * as React from 'react'
import { useLeave } from '@/components/leave/leave-context'
import {
  addDays,
  getDept,
  getEmployee,
  getLeaveTypeSafe,
  getZone,
  type Approver,
  type ApprovalStep,
  type LeaveRequest,
  type LetterData,
} from '@/lib/leave'
import type { ChainItem, SignatureSeal } from '@/lib/leave-api'

const INK = '#14202B'
const MUTED = '#4A5A66'
const RULE = '#1B2A36'
const ACCENT = '#0F5C54'
const FONT_LINK = 'https://fonts.googleapis.com/css2?family=Source+Serif+4:wght@400;600;700&display=swap'

const MONTHS = ['Januari', 'Februari', 'Machi', 'Aprili', 'Mei', 'Juni', 'Julai', 'Agosti', 'Septemba', 'Oktoba', 'Novemba', 'Desemba']

function formatSwDate(value?: string | null): string {
  if (!value) return '—'
  const date = new Date(value.length <= 10 ? `${value}T00:00:00` : value.replace(' ', 'T'))
  if (Number.isNaN(date.getTime())) return '—'
  return `${String(date.getDate()).padStart(2, '0')} ${MONTHS[date.getMonth()]} ${date.getFullYear()}`
}

function letterSteps(request: LeaveRequest, chain: ChainItem[]): ApprovalStep[] {
  if (request.steps.length > 0) return request.steps
  return chain.map((c, i) => ({
    order: i + 1,
    role: c.role as ApprovalStep['role'],
    roleLabel: c.role_label,
    assigneeId: c.assignee_id ?? '',
    assigneeName: c.assignee_name ?? '—',
    via: c.via,
    slaDays: c.sla_days,
    dueAt: c.due_at,
    status: 'pending' as ApprovalStep['status'],
    decision: null,
  }))
}

function dedupeApprovers(rows: Approver[]): Approver[] {
  const seen = new Set<string>()
  return rows.filter((row) => {
    const name = row.name?.trim()
    if (!name) return false
    const key = `${name}::${row.role}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

function Paragraphs({ text }: { text: string }) {
  return (
    <>
      {text
        .split(/\n{2,}/)
        .map((paragraph) => paragraph.trim())
        .filter(Boolean)
        .map((paragraph, index) => (
          <p key={index} style={{ margin: '0 0 10px' }}>
            {paragraph.split('\n').map((line, lineIndex, lines) => (
              <React.Fragment key={lineIndex}>
                {line}
                {lineIndex < lines.length - 1 ? <br /> : null}
              </React.Fragment>
            ))}
          </p>
        ))}
    </>
  )
}

export interface LetterViewProps {
  request: LeaveRequest
  /** Kept for existing call sites; the letter itself is signed by the DPP. */
  signatures?: SignatureSeal[]
  /** Resolved chain when the request payload does not carry assignments. */
  chain?: ChainItem[]
  /** The payload captured by the HR final-processing modal. */
  letter?: LetterData | null
  /** Explicit approver list for the NAKALA section. */
  approvers?: Approver[]
}

/**
 * Official DPP Zanzibar response letter. Designed as an A4 sheet (794 × 1123
 * px at 96 dpi) so browser print / PDF export keeps the government layout.
 */
export function LetterView({ request, chain = [], letter = null, approvers }: LetterViewProps) {
  const { employees, allZones, allDepts } = useLeave()

  const employee = employees.find((row) => row.id === request.employeeId) ?? getEmployee(request.employeeId)
  const leaveType = getLeaveTypeSafe(request.leaveTypeId)
  const leaveName = leaveType?.name ?? request.leaveTypeId
  const department = allDepts.find((row) => row.id === employee?.departmentId)?.name ?? (employee ? getDept(employee.departmentId)?.name : undefined) ?? '—'
  const zone = allZones.find((row) => row.id === employee?.zoneId)?.name ?? (employee ? getZone(employee.zoneId)?.name : undefined) ?? '—'

  const reference = letter?.referenceNumber?.trim() || request.referenceNumber?.trim() || request.ref
  const approvedDays = letter?.approvedDays ?? request.approvedDays ?? request.days
  const body = letter?.letterBody?.trim() || request.letterBody?.trim() || ''

  const issuedAt = request.letterIssuedAt ?? request.decidedAt ?? request.submittedAt ?? request.createdAt
  const issueDate = formatSwDate(issuedAt)

  const returnDate = request.endDate ? addDays(request.endDate, 1) : ''
  const period = request.endDate
    ? `${formatSwDate(request.startDate)} hadi ${formatSwDate(request.endDate)}`
    : `${formatSwDate(request.startDate)} (tarehe ya kurudi itawekwa na mwidhinishaji)`

  // Approvers come from the explicit prop when the caller has it; otherwise
  // from the resolved chain, and finally from the request's own step history.
  const chainApprovers: Approver[] = approvers && approvers.length > 0
    ? approvers
    : letterSteps(request, chain).map((step) => ({
        name: step.assigneeName ?? '—',
        role: step.roleLabel ?? String(step.role ?? ''),
      }))

  const copyApprovers = dedupeApprovers(chainApprovers)

  // NAKALA list originates from the approval workflow chain (the people who
  // actually approved the request), rather than a hand-written list. The
  // accounting officer is appended only when the leave is paid.
  const copies = dedupeApprovers([
    ...copyApprovers,
    ...(request.isPaid
      ? [{ name: 'Mhasibu / Accounting Officer, Afisi ya Mkurugenzi wa Mashtaka, Zanzibar.', role: '' }]
      : []),
  ])

  // If HR wrote a fully custom body that already states the period, do not
  // repeat the facts block; otherwise append it so the letter always carries
  // the start date, end date, return date and the granted number of days.
  const bodyMentionsPeriod = body.includes(formatSwDate(request.startDate))

  return (
    <div
      className="letter-page font-serif"
      lang="sw"
      style={{
        width: 794,
        minHeight: 1123,
        boxSizing: 'border-box',
        padding: '40px 56px 48px',
        background: '#fff',
        color: INK,
        display: 'flex',
        flexDirection: 'column',
        margin: '0 auto',
        boxShadow: '0 12px 40px rgba(20,32,43,0.12)',
      }}
    >
      <style>{`@page{size:A4;margin:0}@media print{.letter-page{box-shadow:none!important;margin:0!important}}`}</style>
      <link href={FONT_LINK} rel="stylesheet" />
      {/* ── Letterhead ────────────────────────────────────────────────── */}
      <header style={{ textAlign: 'center' }}>
        <img
          src="/smz.png"
          alt="Nembo ya Serikali ya Mapinduzi ya Zanzibar"
          style={{ height: 68, width: 'auto', objectFit: 'contain', margin: '0 auto 6px', display: 'block' }}
        />
        <div style={{ fontSize: 13, fontWeight: 600, letterSpacing: '.06em', textTransform: 'uppercase', color: INK }}>
          Serikali ya Mapinduzi ya Zanzibar
        </div>
        <div style={{ fontSize: 16, fontWeight: 700, letterSpacing: '.04em', textTransform: 'uppercase', color: ACCENT, marginTop: 2 }}>
          Afisi ya Mkurugenzi wa Mashtaka
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 24, marginTop: 10, fontSize: 10.5, color: MUTED, textAlign: 'left' }}>
          <div>
            S.L.P 1327, MIEMBENI - ZANZIBAR
            <br />
            Barua Pepe: dppznz@dppznz.go.tz
          </div>
          <div style={{ textAlign: 'right' }}>
            Simu: +255-24-2233567
            <br />
            Nukushi: +255-24-2233564
            <br />
            Tovuti: www.dppznz.go.tz
          </div>
        </div>

        <div style={{ borderBottom: `2.5px solid ${RULE}`, marginTop: 12 }} />
      </header>

      {/* ── Reference / date ──────────────────────────────────────────── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 24, marginTop: 20, fontSize: 13 }}>
        <div>
          <strong>Kumb. Na:</strong> {reference}
        </div>
        <div style={{ textAlign: 'right' }}>{issueDate}</div>
      </div>

      {/* ── Addressee ─────────────────────────────────────────────────── */}
      <div style={{ marginTop: 18, fontSize: 13, lineHeight: 1.55 }}>
        <div>NDG. {employee?.name ?? '—'}</div>
        <div>AFISI YA MKURUGENZI WA MASHTAKA,</div>
        <div>ZANZIBAR.</div>
      </div>

      {/* ── Subject ───────────────────────────────────────────────────── */}
      <h2
        style={{
          margin: '22px 0 16px',
          fontSize: 14.5,
          fontWeight: 700,
          textTransform: 'uppercase',
          textAlign: 'center',
          textDecoration: 'underline',
          textUnderlineOffset: 4,
        }}
      >
        KUH: OMBI LA LIKIZO YA {leaveName.toUpperCase()}
      </h2>

      {/* ── Body ──────────────────────────────────────────────────────── */}
      <div style={{ flex: 1, fontSize: 13.5, lineHeight: 1.72, textAlign: 'justify' }}>
        {body ? (
          <Paragraphs text={body} />
        ) : (
          <>
            <p style={{ margin: '0 0 10px' }}>
              Ombi lako la {leaveName} la mwaka {new Date(issuedAt).getFullYear()} limeidhinishwa.
            </p>
            {request.reason?.trim() && (
              <p style={{ margin: '0 0 10px' }}>Sababu ya ombi: {request.reason.trim()}</p>
            )}
          </>
        )}

        {!bodyMentionsPeriod && (
          <p style={{ margin: '0 0 10px' }}>
            Kipindi cha likizo: <strong>{period}</strong>. Tarehe ya kurudi kazini:{' '}
            <strong>{returnDate ? formatSwDate(returnDate) : '—'}</strong>. Idadi ya siku zilizoidhinishwa:{' '}
            <strong>{approvedDays ?? '—'}</strong>.
          </p>
        )}

        <p style={{ margin: '0 0 10px' }}>
          {request.isPaid ? (
            <span style={{ color: '#0B5E40', fontWeight: 700 }}>Likizo hii italipwa / Inalipwa (Paid).</span>
          ) : (
            <span style={{ color: '#9B1C1C', fontWeight: 700 }}>Likizo hii hailipwi (Unpaid).</span>
          )}
        </p>
      </div>

      {/* ── Sign-off ──────────────────────────────────────────────────── */}
      <div style={{ marginTop: 28, textAlign: 'center', fontSize: 13, lineHeight: 1.55 }}>
        <div>Ahsante</div>
        <div style={{ marginTop: 26, letterSpacing: '.06em' }}>..................................</div>
        <div style={{ fontWeight: 700, marginTop: 6 }}>{copyApprovers.length > 0 ? copyApprovers[copyApprovers.length - 1].name.toUpperCase() + ',' : 'MWANDAWA I. OTHMAN,'}</div>
        <div>/MKURUGENZI WA MASHTAKA,</div>
        <div>AFISI YA MKURUGENZI WA MASHTAKA,</div>
        <div>ZANZIBAR.</div>
      </div>

      {/* ── Copies ────────────────────────────────────────────────────── */}
      <section style={{ marginTop: 26, fontSize: 11.5, lineHeight: 1.65 }}>
        <div style={{ fontWeight: 700, marginBottom: 4 }}>NAKALA:-</div>
        <ol style={{ margin: 0, paddingLeft: 18 }}>
          {copies.map((copy, index) => (
            <li key={`${copy.name}-${index}`}>
              {copy.name}
              {copy.role ? ` (${copy.role})` : ''}
            </li>
          ))}
        </ol>
      </section>

      <div style={{ marginTop: 14, fontSize: 9.5, color: MUTED, textAlign: 'center' }}>
        {department} · {zone}
      </div>
    </div>
  )
}

/** Print the letter through an isolated iframe so surrounding app chrome is excluded. */
export function printLetter(page: HTMLElement): void {
  const iframe = document.createElement('iframe')
  iframe.setAttribute('aria-hidden', 'true')
  iframe.style.cssText = 'position:absolute;left:-10000px;top:0;width:794px;height:1123px;border:0;visibility:hidden'
  document.body.appendChild(iframe)
  const doc = iframe.contentDocument
  if (!doc) {
    iframe.remove()
    return
  }
  doc.open()
  doc.write(`<!doctype html><html lang="sw"><head><meta charset="utf-8"><title>Barua ya Likizo</title><link href="${FONT_LINK}" rel="stylesheet"></head><body style="margin:0;background:#fff">${page.outerHTML}</body></html>`)
  doc.close()
  const go = () => {
    try {
      iframe.contentWindow?.focus()
      iframe.contentWindow?.print()
    } finally {
      window.setTimeout(() => iframe.remove(), 1500)
    }
  }
  const fonts = doc.fonts?.ready as Promise<unknown> | undefined
  if (fonts) void Promise.race([fonts, new Promise((resolve) => window.setTimeout(resolve, 1200))]).then(go, go)
  else window.setTimeout(go, 300)
}

export default LetterView
