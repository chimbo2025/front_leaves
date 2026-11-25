'use client'

import * as React from 'react'
import { useLeave } from '@/components/leave/leave-context'
import {
  generateEmployeeRequestLetterBody,
  getDept,
  getEmployee,
  getLeaveTypeSafe,
  getZone,
  type LeaveRequest,
} from '@/lib/leave'

/**
 * The employee's APPLICATION letter. This is deliberately a different
 * document from the HR response letter (`views/letter-view.tsx`):
 *
 *  - personal sender block (employee name, position, department, zone)
 *  - addressee: the Director of Public Prosecutions
 *  - the fixed Swahili application paragraph
 *  - the factual request block (type, dates, days, reason)
 *  - the employee's own signature block
 *
 * It never carries the DPP letterhead, the approval stamp, the DPP sign-off
 * or the NAKALA list — those belong to the response letter only.
 */

const INK = '#17222B'
const MUTED = '#5A6773'
const RULE = '#D8DEE4'
const ACCENT = '#1D4E7C'
const SOFT = '#F4F7FA'
const FONT_LINK = 'https://fonts.googleapis.com/css2?family=Source+Serif+4:wght@400;600;700&display=swap'

const MONTHS = ['Januari', 'Februari', 'Machi', 'Aprili', 'Mei', 'Juni', 'Julai', 'Agosti', 'Septemba', 'Oktoba', 'Novemba', 'Desemba']

function formatSwDate(value?: string | null): string {
  if (!value) return '—'
  const date = new Date(value.length <= 10 ? `${value}T00:00:00` : value.replace(' ', 'T'))
  if (Number.isNaN(date.getTime())) return '—'
  return `${String(date.getDate()).padStart(2, '0')} ${MONTHS[date.getMonth()]} ${date.getFullYear()}`
}

export interface RequestLetterViewProps {
  request: LeaveRequest
}

export function RequestLetterView({ request }: RequestLetterViewProps) {
  const { employees, allZones, allDepts } = useLeave()

  const employee = employees.find((row) => row.id === request.employeeId) ?? getEmployee(request.employeeId)
  const leaveType = getLeaveTypeSafe(request.leaveTypeId)
  const leaveName = leaveType?.name ?? request.leaveTypeId

  const department =
    allDepts.find((row) => row.id === employee?.departmentId)?.name ??
    (employee ? getDept(employee.departmentId)?.name : undefined) ??
    ''
  const zone =
    allZones.find((row) => row.id === employee?.zoneId)?.name ??
    (employee ? getZone(employee.zoneId)?.name : undefined) ??
    ''

  // The fixed application paragraph. When the stored body is missing (older
  // rows, or a draft saved before a leave type was chosen) rebuild it from the
  // employee's department and the selected leave type so the letter is never
  // blank.
  const applicationText =
    request.requestBody?.trim() ||
    generateEmployeeRequestLetterBody(department || 'Afisi Kuu', leaveName)

  const requestedOn = formatSwDate(request.submittedAt ?? request.createdAt)
  const period = request.endDate
    ? `${formatSwDate(request.startDate)} hadi ${formatSwDate(request.endDate)}`
    : `${formatSwDate(request.startDate)} (tarehe ya mwisho itapangwa na mwidhinishaji)`
  const days = request.days ? `${request.days} siku` : 'Itapangwa na mwidhinishaji'

  const rows: Array<{ label: string; value: string }> = [
    { label: 'Aina ya likizo', value: leaveName },
    { label: 'Tarehe ya kuanza', value: formatSwDate(request.startDate) },
    { label: 'Tarehe ya mwisho', value: request.endDate ? formatSwDate(request.endDate) : 'Itapangwa na mwidhinishaji' },
    { label: 'Muda', value: days },
  ]

  return (
    <div
      className="letter-page font-serif"
      lang="sw"
      style={{
        width: 794,
        minHeight: 1123,
        boxSizing: 'border-box',
        padding: '54px 62px 48px',
        background: '#fff',
        color: INK,
        display: 'flex',
        flexDirection: 'column',
        margin: '0 auto',
        boxShadow: '0 12px 40px rgba(20,32,43,0.12)',
        position: 'relative',
      }}
    >
      <style>{`@page{size:A4;margin:0}@media print{.letter-page{box-shadow:none!important;margin:0!important}}`}</style>
      <link href={FONT_LINK} rel="stylesheet" />

      {/* Side accent rail — the visual signature of the application letter. */}
      <div
        aria-hidden="true"
        style={{ position: 'absolute', left: 26, top: 54, bottom: 48, width: 3, background: ACCENT, opacity: 0.85 }}
      />

      {/* ── Document label ─────────────────────────────────────────────── */}
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 24 }}>
        <div>
          <div style={{ fontSize: 10.5, letterSpacing: '.22em', textTransform: 'uppercase', fontWeight: 700, color: ACCENT }}>
            Ombi la Likizo
          </div>
          <div style={{ fontSize: 10.5, color: MUTED, marginTop: 4 }}>Employee leave application</div>
        </div>
        <div style={{ textAlign: 'right', fontSize: 11.5, color: MUTED, lineHeight: 1.6 }}>
          <div>
            <strong style={{ color: INK }}>Kumb. Na:</strong> {request.ref}
          </div>
          <div>{requestedOn}</div>
        </div>
      </header>

      <div style={{ borderTop: `1px solid ${RULE}`, marginTop: 14 }} />

      {/* ── Sender ─────────────────────────────────────────────────────── */}
      <section style={{ marginTop: 26, fontSize: 12.5, lineHeight: 1.6, textAlign: 'right' }}>
        <div style={{ fontWeight: 700, fontSize: 13.5 }}>{employee?.name ?? '—'}</div>
        {employee?.title && <div>{employee.title}</div>}
        {department && <div>{department}</div>}
        {zone && <div>{zone}</div>}
        <div style={{ marginTop: 4, color: MUTED }}>Afisi ya Mkurugenzi wa Mashtaka, Zanzibar</div>
      </section>

      {/* ── Addressee ──────────────────────────────────────────────────── */}
      <section style={{ marginTop: 30, fontSize: 12.5, lineHeight: 1.6 }}>
        <div style={{ color: MUTED, fontSize: 11, marginBottom: 4 }}>Kwa:</div>
        <div style={{ fontWeight: 700 }}>Mkurugenzi wa Mashtaka,</div>
        <div>Afisi ya Mkurugenzi wa Mashtaka,</div>
        <div>S.L.P 1327, Miembeni — Zanzibar.</div>
      </section>

      {/* ── Subject ────────────────────────────────────────────────────── */}
      <h1
        style={{
          margin: '30px 0 22px',
          fontSize: 13.5,
          fontWeight: 700,
          textTransform: 'uppercase',
          letterSpacing: '.03em',
          textAlign: 'left',
          color: INK,
          borderLeft: `4px solid ${ACCENT}`,
          paddingLeft: 12,
        }}
      >
        KUH: Ombi la likizo ya {leaveName}
      </h1>

      {/* ── Body ───────────────────────────────────────────────────────── */}
      <div style={{ fontSize: 13.5, lineHeight: 1.85, textAlign: 'justify' }}>
        <p style={{ margin: '0 0 14px' }}>Ndugu Mkurugenzi,</p>

        <p style={{ margin: '0 0 16px' }}>{applicationText}</p>

        <div
          style={{
            border: `1px solid ${RULE}`,
            borderLeft: `4px solid ${ACCENT}`,
            background: SOFT,
            padding: '14px 18px',
            margin: '0 0 16px',
          }}
        >
          <div style={{ fontSize: 10.5, letterSpacing: '.14em', textTransform: 'uppercase', fontWeight: 700, color: ACCENT, marginBottom: 8 }}>
            Taarifa za ombi
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
            <tbody>
              {rows.map((row) => (
                <tr key={row.label}>
                  <td style={{ padding: '3px 12px 3px 0', color: MUTED, width: 150, verticalAlign: 'top' }}>{row.label}</td>
                  <td style={{ padding: '3px 0', fontWeight: 600 }}>{row.value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p style={{ margin: '0 0 8px', fontWeight: 700, fontSize: 12.5 }}>Sababu ya ombi</p>
        <p style={{ margin: '0 0 16px' }}>
          {request.reason?.trim() || 'Hakuna sababu ya ziada iliyotolewa.'}
        </p>

        <p style={{ margin: '0 0 16px' }}>
          Kipindi nilichoomba ni <strong>{period}</strong> na muda ni <strong>{days}</strong>. Nitaendelea
          kuzingatia masharti ya sheria za utumishi na taratibu za Afisi wakati wa likizo.
        </p>

        <p style={{ margin: 0 }}>
          Nafasi ya kukubaliwa kwa ombi langu inatarajiwa kwa muda unaostahili.
        </p>
      </div>

      <div style={{ flex: 1 }} />

      {/* ── Sign-off (the employee, not the DPP) ───────────────────────── */}
      <section style={{ marginTop: 34, fontSize: 12.5, lineHeight: 1.6 }}>
        <div>Wako mtiifu,</div>
        <div style={{ marginTop: 40, letterSpacing: '.06em', color: MUTED }}>..................................</div>
        <div style={{ fontWeight: 700, marginTop: 6, textTransform: 'uppercase' }}>{employee?.name ?? '—'}</div>
        {employee?.title && <div>{employee.title}</div>}
        <div style={{ color: MUTED }}>{formatSwDate(request.submittedAt ?? request.createdAt)}</div>
      </section>

      <footer style={{ marginTop: 22, paddingTop: 10, borderTop: `1px solid ${RULE}`, fontSize: 9.5, color: MUTED, display: 'flex', justifyContent: 'space-between', gap: 16 }}>
        <span>Hati hii ni ombi la mfanyakazi — si barua ya majibu ya Mkurugenzi.</span>
        <span>{request.ref}</span>
      </footer>
    </div>
  )
}

export default RequestLetterView
