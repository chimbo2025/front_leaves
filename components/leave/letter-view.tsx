'use client'

import type { CSSProperties, ReactElement } from 'react'
import {
  TODAY,
  addDays,
  balanceOf,
  getDept,
  getEmployee,
  getLeaveTypeSafe,
  getZone,
  policyEffectiveAt,
  type ApprovalStep,
  type LeaveRequest,
  type StepStatus,
} from '@/lib/leave'
import { useLeave } from '@/components/leave/leave-context'

/**
 * Barua ya Ombi ya Likizo — screen + print letter view.
 *
 * A faithful React port of the approved design mockup (Letter.dc.html):
 * A4 letterhead, rotated status stamp, Swahili application body, details
 * grid, applicant signature block and the approval/signature table. Every
 * style is inline (or in the <style> block carried inside the page) so the
 * exact DOM can be serialized into an isolated iframe for printing.
 */

const ACCENT = '#0F5C54'
const INK = '#14202B'
const MUTED = '#4A5A66'
const HAIRLINE = '#C9D2D8'
const GRIDLINE = '#AEBAC2'
const TABLELINE = '#8C9BA5'
const SIGNATURE_BLUE = '#1B2A6B'

const FONT_LINK =
  'https://fonts.googleapis.com/css2?family=Source+Serif+4:ital,wght@0,400;0,600;0,700;1,400&family=IBM+Plex+Sans:wght@400;500;600&family=IBM+Plex+Mono:wght@500&display=swap'

const LETTER_STYLE = `
@page { size: A4; margin: 0; }
.lbl { font-family: 'IBM Plex Sans', system-ui, sans-serif; font-size: 12px; letter-spacing: .06em; text-transform: uppercase; font-weight: 600; color: ${MUTED}; }
.sans { font-family: 'IBM Plex Sans', system-ui, sans-serif; }
.num { font-variant-numeric: tabular-nums; }
`

const SW_MONTHS = ['Januari', 'Februari', 'Machi', 'Aprili', 'Mei', 'Juni', 'Julai', 'Agosti', 'Septemba', 'Oktoba', 'Novemba', 'Desemba']
const SW_MONTHS_SHORT = ['Jan', 'Feb', 'Mac', 'Apr', 'Mei', 'Jun', 'Jul', 'Ago', 'Sep', 'Okt', 'Nov', 'Des']

function parseDate(iso?: string | null): Date | null {
  if (!iso) return null
  const d = new Date(iso.length <= 10 ? `${iso}T00:00:00` : iso.replace(' ', 'T'))
  return Number.isNaN(d.getTime()) ? null : d
}

/** 07 Oktoba 2026 */
export function swDate(iso?: string | null): string {
  const d = parseDate(iso)
  if (!d) return '—'
  return `${String(d.getDate()).padStart(2, '0')} ${SW_MONTHS[d.getMonth()]} ${d.getFullYear()}`
}

/** 26 Okt 2026 */
function swShort(iso?: string | null): string {
  const d = parseDate(iso)
  if (!d) return '—'
  return `${d.getDate()} ${SW_MONTHS_SHORT[d.getMonth()]} ${d.getFullYear()}`
}

/** Placeholder hand-drawn strokes from the design mockup — one per signer,
 * picked deterministically from the name. The electronic signature of record
 * remains the hashed approval in approval_signatures. */
const SIG_PATHS = [
  'M6 34 C14 8 22 6 20 22 C18 38 30 10 38 20 C44 28 36 36 48 26 C58 18 64 30 74 24 C84 18 90 32 104 22 C114 15 122 30 154 16 M20 41 C60 36 100 43 150 34',
  'M8 10 L12 38 M12 24 L26 24 M26 10 L24 38 C30 30 36 22 40 36 C44 20 52 18 54 36 C60 28 68 24 74 34 C84 14 94 20 98 36 C108 22 120 22 130 30 C138 24 146 28 156 20',
  'M8 36 C10 14 20 8 30 12 C22 22 18 34 34 30 C46 26 40 10 50 12 C60 14 52 34 66 28 C80 22 84 12 92 18 C100 24 94 36 110 30 C124 24 132 14 154 22 M30 42 C70 38 110 44 140 38',
  'M6 38 C10 10 24 6 28 24 C30 34 36 18 44 14 C52 10 48 30 58 30 C70 30 72 12 84 16 C94 20 88 36 104 28 C118 20 126 10 150 14 M10 44 C60 38 110 46 156 34',
]

function strokeFor(name: string): string {
  let h = 0
  for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) >>> 0
  return SIG_PATHS[h % SIG_PATHS.length]
}

const SW_ROLE: Record<string, string> = {
  SUPERVISOR: 'Msimamizi wa Moja kwa Moja',
  DEPT_HEAD: 'Mkuu wa Idara',
  ZONAL_HEAD: 'Kiongozi wa Eneo',
  HR: 'Afisa Utumishi',
  FINAL_AUTHORITY: 'Mkuu wa DPP',
}

const DECISION: Record<StepStatus, { label: string; bg: string; fg: string; dotBg: string; dotFg: string }> = {
  approved: { label: 'Imeidhinishwa', bg: '#DDF3E8', fg: '#0B5E40', dotBg: '#0B5E40', dotFg: '#ffffff' },
  rejected: { label: 'Imekataliwa', bg: '#FBE2E4', fg: '#8E1B24', dotBg: '#8E1B24', dotFg: '#ffffff' },
  returned: { label: 'Imerudishwa', bg: '#FBEBC8', fg: '#6E4306', dotBg: '#FBEBC8', dotFg: '#6E4306' },
  escalated: { label: 'Imehamishwa', bg: '#FCE7D6', fg: '#8A3B06', dotBg: '#FCE7D6', dotFg: '#8A3B06' },
  skipped: { label: 'Imepuzwa', bg: '#EDF1F3', fg: '#4A5A66', dotBg: '#EDF1F3', dotFg: '#4A5A66' },
  pending: { label: 'Inasubiri', bg: '#FBEBC8', fg: '#6E4306', dotBg: '#FBEBC8', dotFg: '#6E4306' },
}

function stampFor(request: LeaveRequest, steps: ApprovalStep[]): { text: string; sub: string; color: string } {
  const acted = steps.filter((s) => s.status === 'approved' || s.status === 'rejected' || s.status === 'returned').length
  const progress = steps.length > 0 ? `Hatua ${acted} kati ya ${steps.length} zimekamilika` : 'Inasubiri uidhinishaji'
  switch (request.status) {
    case 'draft':
      return { text: 'RASIMU', sub: 'Haijawasilishwa bado', color: MUTED }
    case 'submitted':
      return { text: 'INASUBIRI', sub: progress, color: '#8A5A10' }
    case 'under_review':
      return { text: 'INASUBIRI', sub: progress, color: '#8A5A10' }
    case 'returned_for_correction':
      return { text: 'INASUBIRI', sub: 'Imerudishwa kwa mwombaji kurekebisha', color: '#8A5A10' }
    case 'paused_pending_handover':
      return { text: 'INASUBIRI', sub: 'Imesimamishwa — inasubiri kugawanywa majukumu', color: '#8A5A10' }
    case 'approved':
      return { text: 'IMEIDHINISHWA', sub: request.decidedAt ? `Idhini ya mwisho ${swShort(request.decidedAt)}` : 'Imeidhinishwa', color: '#0B5E40' }
    case 'rejected':
      return { text: 'IMEKAATALIWA', sub: request.decidedAt ? `Imekataliwa ${swShort(request.decidedAt)}` : 'Imekataliwa', color: '#9B1C1C' }
    case 'withdrawn':
      return { text: 'IMEGHAIRIWA', sub: 'Ombi limeghairiwa na mwombaji', color: MUTED }
    default:
      return { text: 'INASUBIRI', sub: progress, color: '#8A5A10' }
  }
}

function signatureBlock(name: string, title: string, width = 200): ReactElement {
  return (
    <svg width={width} height={48} viewBox="0 0 160 48" style={{ display: 'block', marginTop: 2 }} role="img" aria-label={`Sahihi ya ${name}`}>
      <path d={strokeFor(name)} fill="none" stroke={SIGNATURE_BLUE} strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

/** Renders the A4 letter for a request. Mount inside a wide modal; use
 * `printLetter(pageEl)` for the isolated-iframe print. */
export function LetterView({ request }: { request: LeaveRequest }) {
  const { employees, requests, policies, allZones, allDepts } = useLeave()

  // Server-backed employee first; the seeded registry is only a fallback for
  // requests whose employee is not in the loaded directory.
  const emp = employees.find((e) => e.id === request.employeeId) ?? getEmployee(request.employeeId)
  const lt = getLeaveTypeSafe(request.leaveTypeId)
  const policy = policyEffectiveAt(request.leaveTypeId, request.submittedAt ?? request.createdAt, policies)
  const zoneName =
    allZones.find((z) => z.id === emp?.zoneId)?.name ?? (emp ? getZone(emp.zoneId)?.name : undefined) ?? '—'
  const deptName =
    allDepts.find((d) => d.id === emp?.departmentId)?.name ?? (emp ? getDept(emp.departmentId)?.name : undefined) ?? '—'

  const empName = emp?.name ?? '—'
  const empTitle = emp?.title ?? '—'
  const payroll = (employees.find((e) => e.id === request.employeeId)?.payrollNo) || request.employeeId || '—'

  const stamp = stampFor(request, request.steps)
  const acted = request.steps.filter(
    (s) => s.status === 'approved' || s.status === 'rejected' || s.status === 'returned',
  ).length

  const bal = emp ? balanceOf(emp.id, request.leaveTypeId, requests, policies) : null
  const usedOther = emp
    ? requests
        .filter(
          (r) =>
            r.employeeId === emp.id &&
            r.leaveTypeId === request.leaveTypeId &&
            r.id !== request.id &&
            (r.status === 'approved' || r.status === 'under_review'),
        )
        .reduce((s, r) => s + r.days, 0)
    : 0
  const before = bal ? Math.max(0, bal.accrued - usedOther) : 0
  const after = Math.max(0, before - (request.days ?? 0))

  const returnDate = request.endDate ? addDays(request.endDate, 1) : null
  const year = (parseDate(request.submittedAt ?? request.createdAt)?.getFullYear() ?? parseDate(TODAY)!.getFullYear())
  const reason = request.reason?.trim()

  const grid: Array<{ label: string; value: string; span?: number; strong?: boolean }> = [
    { label: 'Jina kamili', value: empName, span: 2, strong: true },
    { label: 'Namba ya utumishi', value: payroll, strong: true },
    { label: 'Wadhifa', value: empTitle, strong: true },
    { label: 'Idara / Kituo cha kazi', value: `${deptName} — ${zoneName}`, span: 2 },
    { label: 'Aina ya likizo', value: `${lt?.swahili || lt?.name || request.leaveTypeId} (Kanuni v${policy?.version ?? '-'})`, span: 2 },
    { label: 'Siku zilizoombwa', value: request.days ? `Siku ${request.days}` : 'Zitakamilishwa uidhinishajini', strong: true },
    { label: 'Salio la likizo', value: `Siku ${before}`, strong: true },
    { label: 'Salio baada ya ombi', value: `Siku ${after}`, strong: true },
    { label: 'Kurudi kazini', value: returnDate ? swShort(returnDate) : 'Uidhinishajini', strong: true },
  ]

  const cellBorder = (i: number, span: number): CSSProperties => {
    // Grid rows: [0 span2, 1, 2] · [3 span2, 4 span2] · [5, 6, 7, 8].
    // No right border at a row's end; no bottom border on the final row.
    const isRowEnd = i === 2 || i === 4 || i === 8
    const isLastRow = i >= 5
    return {
      padding: '6px 12px',
      borderRight: isRowEnd ? 'none' : `1px solid ${HAIRLINE}`,
      borderBottom: isLastRow ? 'none' : `1px solid ${HAIRLINE}`,
      gridColumn: span === 2 ? 'span 2' : undefined,
    }
  }

  return (
    <div
      className="letter-page"
      lang="sw"
      style={{
        width: 794,
        minHeight: 1123,
        boxSizing: 'border-box',
        padding: '40px 56px 32px',
        background: '#ffffff',
        color: INK,
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        fontFamily: "'Source Serif 4', Georgia, serif",
        margin: '0 auto',
        boxShadow: '0 12px 40px rgba(20,32,43,0.12)',
      }}
    >
      <style>{LETTER_STYLE}</style>
      <link href={FONT_LINK} rel="stylesheet" />

      {/* Letterhead */}
      <header style={{ display: 'flex', alignItems: 'center', gap: 18, paddingBottom: 12, borderBottom: `3px double ${ACCENT}` }}>
        <svg width={64} height={64} viewBox="0 0 68 68" role="img" aria-label="Nembo ya ofisi">
          <circle cx={34} cy={34} r={32} fill="none" stroke={ACCENT} strokeWidth={2.5} />
          <circle cx={34} cy={34} r={26} fill="none" stroke={ACCENT} strokeWidth={1} />
          <path d="M34 15v34M22 21h24M22 21l-6 13h12zM46 21l-6 13h12zM27 49h14" fill="none" stroke={ACCENT} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <div style={{ flex: 1, minWidth: 0, textAlign: 'center', paddingRight: 64 }}>
          <div className="sans" style={{ fontSize: 12, letterSpacing: '.12em', textTransform: 'uppercase', fontWeight: 600, color: MUTED }}>
            Jamhuri ya Mapinduzi ya Zanzibar
          </div>
          <div style={{ fontSize: 18, fontWeight: 700, lineHeight: 1.2, marginTop: 3, textTransform: 'uppercase', color: ACCENT }}>
            Ofisi ya Rais — Katiba, Sheria, Utumishi na Utawala Bora
          </div>
          <div style={{ fontSize: 14, marginTop: 2, color: '#2C3B47' }}>Idara ya Utumishi wa Umma</div>
          <div className="sans" style={{ fontSize: 12, marginTop: 2, color: MUTED, fontStyle: 'italic' }}>
            S.L.P 338, Mjini Magharibi, Zanzibar · info@utumishi.go.tz
          </div>
        </div>
      </header>

      {/* Ref / date / stamp */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, marginTop: 14 }}>
        <div className="sans" style={{ fontSize: 13, lineHeight: 1.6 }}>
          <div>
            <span className="lbl">Kumb.</span>&nbsp;{' '}
            <span className="num" style={{ fontFamily: "'IBM Plex Mono', monospace", fontWeight: 500 }}>{request.ref}</span>
          </div>
          <div>
            <span className="lbl">Tarehe</span>&nbsp; <span className="num" style={{ fontWeight: 500 }}>{swDate(request.submittedAt ?? request.createdAt)}</span>
          </div>
        </div>
        <div style={{ border: `2px solid ${stamp.color}`, color: stamp.color, borderRadius: 8, padding: '5px 16px', transform: 'rotate(-3deg)', textAlign: 'center' }}>
          <div className="sans" style={{ fontSize: 17, fontWeight: 600, letterSpacing: '.12em' }}>{stamp.text}</div>
          <div className="sans" style={{ fontSize: 12, fontWeight: 500 }}>{stamp.sub}</div>
        </div>
      </div>

      {/* Addressee */}
      <div style={{ marginTop: 10, fontSize: 14, lineHeight: 1.45 }}>
        <div style={{ fontWeight: 700 }}>Mansura M. Kassim</div>
        <div style={{ color: '#2C3B47' }}>Katibu Mkuu, Ofisi ya Rais — Katiba, Sheria, Utumishi na Utawala Bora</div>
        <div style={{ color: '#2C3B47' }}>Zanzibar.</div>
      </div>

      {/* Subject */}
      <div style={{ marginTop: 10, padding: '7px 0', borderTop: `1px solid ${HAIRLINE}`, borderBottom: `1px solid ${HAIRLINE}`, fontSize: 14.5, fontWeight: 700, letterSpacing: '.01em', textTransform: 'uppercase' }}>
        {`YAH: Maombi ya ${lt?.swahili || lt?.name || 'Likizo'}`}
      </div>

      {/* Body */}
      <div style={{ marginTop: 10, fontSize: 14, lineHeight: 1.5, textAlign: 'justify', textWrap: 'pretty' as never }}>
        <p style={{ margin: '0 0 6px' }}>
          Kwa heshima na taadhima, naomba kuwasilisha maombi yangu ya {lt?.swahili || lt?.name || 'likizo'} kwa mwaka {year} kama inavyoelekezwa katika Kanuni za Utumishi wa Umma.
        </p>
        <p style={{ margin: '0 0 6px' }}>
          Ninatarajia kuchukua likizo kuanzia <strong style={{ color: ACCENT }}>{swDate(request.startDate)}</strong> hadi{' '}
          <strong style={{ color: ACCENT }}>{request.endDate ? swDate(request.endDate) : 'tarehe itakayokamilishwa wakati wa uidhinishaji'}</strong>{' '}
          {request.days ? `(siku ${request.days} za kazi${request.emergency ? ', ombi la dharura' : ''})` : '(muda utakapotamkika uidhinishajini)'}.
          {reason ? ` Sababu iliyotolewa ni: ${reason.replace(/[.\s]+$/, '')}.` : ''}
        </p>
        <p style={{ margin: '0 0 6px' }}>
          Katika kipindi hiki cha likizo, majukumu yangu yatasimamiwa na msimamizi wangu wa moja kwa moja ili kuendeleza huduma bila usumbufu.
        </p>
        <p style={{ margin: 0 }}>
          {returnDate ? (
            <>
              Ninatazamia kurudi kazini tarehe <strong style={{ color: ACCENT }}>{swDate(returnDate)}</strong> kama ilivyopangwa.
            </>
          ) : (
            <>Tarehe ya kurudi kazini itakamilishwa wakati wa uidhinishaji wa ombi hili.</>
          )}
        </p>
      </div>

      {/* Details */}
      <div style={{ marginTop: 10, display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', border: `1px solid ${GRIDLINE}`, borderRadius: 6 }}>
        {grid.map((cell, i) => (
          <div key={cell.label} style={cellBorder(i, cell.span ?? 1)}>
            <div className="lbl">{cell.label}</div>
            <div className="sans num" style={{ fontSize: 13.5, fontWeight: cell.strong ? 600 : 400, marginTop: 1 }}>
              {cell.value}
            </div>
          </div>
        ))}
      </div>

      {/* Applicant closing */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: 10, gap: 16 }}>
        <div>
          <div style={{ fontSize: 14 }}>Wako mtiifu,</div>
          {signatureBlock(empName, empTitle)}
          <div style={{ width: 200, borderTop: `1px solid ${INK}`, marginTop: 2 }} />
          <div style={{ fontSize: 14, fontWeight: 700, marginTop: 2 }}>{empName}</div>
          <div className="sans" style={{ fontSize: 12, color: MUTED }}>{empTitle}</div>
        </div>
        <div className="sans" style={{ fontSize: 12, color: MUTED, textAlign: 'right', lineHeight: 1.5 }}>
          {request.status === 'draft' ? (
            <>Haijawasilishwa — rasimu<br /><span className="num">{swDate(request.createdAt)}</span></>
          ) : (
            <>Imewasilishwa kielektroniki<br /><span className="num">{swDate(request.submittedAt ?? request.createdAt)}</span></>
          )}
        </div>
      </div>

      {/* Approval record */}
      <section style={{ marginTop: 12 }} aria-label="Sehemu ya uidhinishaji">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 5 }}>
          <h2 style={{ margin: 0, fontSize: 14.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.05em', color: ACCENT }}>
            Sehemu ya Uidhinishaji
          </h2>
          <span className="sans" style={{ fontSize: 12, color: MUTED }}>
            {request.status === 'draft'
              ? 'Ombi bado halijawasilishwa'
              : request.steps.length > 0
                ? `Hatua ${acted} kati ya ${request.steps.length} zimekamilika`
                : 'Hatua za uidhinishaji hazijaanza'}
          </span>
        </div>
        <div style={{ border: `1px solid ${TABLELINE}`, borderRadius: 6, overflow: 'hidden' }}>
          <div
            className="lbl"
            style={{ display: 'grid', gridTemplateColumns: '26px minmax(0, 1.5fr) 112px 96px minmax(0, 1.25fr)', gap: 10, padding: '6px 12px', background: '#EDF1F3', borderBottom: `1px solid ${TABLELINE}` }}
          >
            <span>#</span>
            <span>Mwidhinishaji na wadhifa</span>
            <span>Hali</span>
            <span>Tarehe</span>
            <span>Sahihi</span>
          </div>
          {request.steps.length === 0 ? (
            <div style={{ padding: '14px 12px', textAlign: 'center' }}>
              <div className="sans" style={{ border: `1px dashed ${TABLELINE}`, borderRadius: 4, padding: '10px 6px', fontSize: 12, color: MUTED }}>
                {request.status === 'draft'
                  ? 'Ombi hili bado halijawasilishwa — hatua za uidhinishaji zitakapoanza zitaonekana hapa.'
                  : 'Hatua za uidhinishaji hazijachorwa kwa ombi hili.'}
              </div>
            </div>
          ) : (
            request.steps.map((s, i) => {
              const dec = DECISION[s.status] ?? DECISION.pending
              const signed = !!s.actedAt && s.status !== 'pending' && s.status !== 'skipped'
              return (
                <div
                  key={s.order}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '26px minmax(0, 1.5fr) 112px 96px minmax(0, 1.25fr)',
                    gap: 10,
                    padding: '7px 12px',
                    alignItems: 'center',
                    borderBottom: i < request.steps.length - 1 ? `1px solid ${HAIRLINE}` : 'none',
                  }}
                >
                  <span
                    className="sans num"
                    style={{
                      width: 24,
                      height: 24,
                      borderRadius: '50%',
                      background: dec.dotBg,
                      color: dec.dotFg,
                      fontSize: 12,
                      fontWeight: 600,
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {i + 1}
                  </span>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 700, lineHeight: 1.25 }}>{s.assigneeName || '—'}</div>
                    <div className="sans" style={{ fontSize: 12, color: MUTED, lineHeight: 1.35 }}>
                      {SW_ROLE[s.role] ?? s.roleLabel}
                      {s.via !== 'standing' && s.via !== 'direct' ? ` (${s.via === 'escalated' ? 'imehamishwa' : `kwa ${s.via}`})` : ''}
                    </div>
                  </div>
                  <div
                    className="sans"
                    style={{ fontSize: 12, fontWeight: 600, color: dec.fg, background: dec.bg, borderRadius: 999, padding: '3px 8px', textAlign: 'center', whiteSpace: 'nowrap' }}
                  >
                    {dec.label}
                  </div>
                  <div className="sans num" style={{ fontSize: 12, color: '#2C3B47', lineHeight: 1.35 }}>
                    {s.actedAt ? swShort(s.actedAt) : '—'}
                  </div>
                  <div style={{ minWidth: 0 }}>
                    {signed ? (
                      <>
                        <svg width={124} height={36} viewBox="0 0 160 48" style={{ display: 'block' }} role="img" aria-label={`Sahihi ya ${s.assigneeName}`}>
                          <path d={strokeFor(s.assigneeName || String(i))} fill="none" stroke={SIGNATURE_BLUE} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                        <div className="sans" style={{ fontSize: 12, color: MUTED, borderTop: `1px solid ${TABLELINE}`, marginTop: 2, paddingTop: 1 }}>
                          imesainiwa kielektroniki
                        </div>
                      </>
                    ) : (
                      <div className="sans" style={{ border: `1px dashed ${TABLELINE}`, borderRadius: 4, padding: '8px 6px', fontSize: 12, color: MUTED, textAlign: 'center' }}>
                        {s.status === 'skipped' ? 'Hatua imepuzwa' : 'Inasubiri sahihi'}
                      </div>
                    )}
                  </div>
                </div>
              )
            })
          )}
        </div>
      </section>

      {/* Footer */}
      <footer style={{ marginTop: 'auto', paddingTop: 8, borderTop: `1px solid ${HAIRLINE}`, display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'flex-end' }}>
        <div className="sans" style={{ fontSize: 12, color: MUTED, lineHeight: 1.5, maxWidth: 540 }}>
          Hati hii imezalishwa na Mfumo wa Usimamizi wa Likizo — DPP Zanzibar. Sahihi ni za kielektroniki na zimehifadhiwa kwa akaunti ya kila mwidhinishaji.
        </div>
        <div className="sans num" style={{ textAlign: 'right', fontSize: 12, lineHeight: 1.5, color: MUTED }}>
          <div>Kumbukumbu: {request.ref}</div>
          <div>Imepigwa chapa: {swDate(TODAY)} · Ukurasa 1 kati ya 1</div>
        </div>
      </footer>
    </div>
  )
}

/**
 * Print the letter through an isolated hidden iframe — the app's own styles
 * and layout never enter the print context, only the serialized A4 page.
 */
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
  doc.write(
    `<!doctype html><html lang="sw"><head><meta charset="utf-8"><title>Barua ya Ombi ya Likizo</title>` +
      `<link href="${FONT_LINK}" rel="stylesheet"></head>` +
      `<body style="margin:0;background:#fff">${page.outerHTML}</body></html>`,
  )
  doc.close()

  const go = () => {
    try {
      iframe.contentWindow?.focus()
      iframe.contentWindow?.print()
    } finally {
      setTimeout(() => iframe.remove(), 1500)
    }
  }

  const fonts = doc.fonts?.ready as Promise<unknown> | undefined
  if (fonts) {
    void Promise.race([fonts, new Promise((resolve) => setTimeout(resolve, 1200))]).then(go, go)
  } else {
    setTimeout(go, 300)
  }
}
