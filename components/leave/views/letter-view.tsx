'use client'

import React from 'react'
import { useLeave } from '@/components/leave/leave-context'
import { addDays, getDept, getEmployee, getLeaveTypeSafe, getZone, type LeaveRequest, type ApprovalStep } from '@/lib/leave'
import type { SignatureSeal, ChainItem } from '@/lib/leave-api'

const INK = '#14202B'
const MUTED = '#4A5A66'
const BORDER = '#C9D2D8'
const ACCENT = '#0F5C54'

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

export function LetterView({ request, signatures = [], chain = [] }: { request: LeaveRequest; signatures?: SignatureSeal[]; chain?: ChainItem[] }) {
  const { employees, allZones, allDepts } = useLeave()
  const employee = employees.find((row) => row.id === request.employeeId) ?? getEmployee(request.employeeId)
  const leaveType = getLeaveTypeSafe(request.leaveTypeId)
  const leaveName = leaveType?.name ?? request.leaveTypeId
  const department = allDepts.find((row) => row.id === employee?.departmentId)?.name ?? (employee ? getDept(employee.departmentId)?.name : undefined) ?? '—'
  const zone = allZones.find((row) => row.id === employee?.zoneId)?.name ?? (employee ? getZone(employee.zoneId)?.name : undefined) ?? '—'
  const approved = request.status === 'approved'
  const rejected = request.status === 'rejected'

  const steps = letterSteps(request, chain)
  const distinctApprovers = steps.reduce<ApprovalStep[]>((acc, s) => {
    if (!acc.find((x) => x.assigneeId && x.assigneeId === s.assigneeId)) acc.push(s)
    return acc
  }, [])

  const sealsByActor = new Map(signatures.map((s) => [s.actor_id, s]))

  const payroll = '—'
  const period = request.endDate
    ? `${formatSwDate(request.startDate)} hadi ${formatSwDate(request.endDate)}`
    : `${formatSwDate(request.startDate)} (tarehe ya kurudi itawekwa na mwidhinishaji)`

  // Dynamic copies list: previous approvers in the chain + accountant if paid.
  const previousApprovers = distinctApprovers.map((s) => s.assigneeName || '—')
  const copies = [
    'Mkurugenzi Mipango, Uendeshaji na Rasilimali Watu, Afisi ya Mkurugenzi wa Mashtaka, Zanzibar.',
    'Mkuu wa Mkoa wa Kaskazini- Unguja',
    ...previousApprovers.map((name) => `${name} (Mwidhinishaji)`),
  ]
  if (request.isPaid) {
    copies.push('Mhasibu / Accounting Officer, Afisi ya Mkurugenzi wa Mashtaka, Zanzibar.')
  }

  return (
    <div className="letter-page" lang="sw" style={{ width: 794, minHeight: 1123, boxSizing: 'border-box', padding: '44px 58px', background: '#fff', color: INK, display: 'flex', flexDirection: 'column', fontFamily: "'Source Serif 4', Georgia, serif", margin: '0 auto', boxShadow: '0 12px 40px rgba(20,32,43,0.12)' }}>
      <style>{`@page{size:A4;margin:0}.letter-sans{font-family:'IBM Plex Sans',system-ui,sans-serif}.letter-label{font-size:10px;letter-spacing:.08em;text-transform:uppercase;font-weight:600;color:${MUTED}}`}</style>
      <link href="https://fonts.googleapis.com/css2?family=Source+Serif+4:wght@400;600;700&family=IBM+Plex+Sans:wght@400;500;600&display=swap" rel="stylesheet" />

      <header className="letter-sans" style={{ textAlign: 'center', borderBottom: `3px double ${ACCENT}`, paddingBottom: 14 }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 8 }}>
          <img src="/coat-of-arms-zanzibar.png" alt="Coat of Arms" style={{ height: 64 }} />
        </div>
        <div style={{ fontSize: 12, letterSpacing: '.12em', textTransform: 'uppercase', color: MUTED }}>SERIKALI YA MAPINDUZI YA ZANZIBAR</div>
        <h1 style={{ margin: '6px 0 2px', color: ACCENT, fontSize: 21, textTransform: 'uppercase' }}>AFISI YA MKURUGENZI WA MASHTAKA</h1>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: MUTED, marginTop: 8 }}>
          <div style={{ textAlign: 'left' }}>
            S.L.P 1327, MIEMBENI - ZANZIBAR<br />
            Barua Pepe: dppznz@dppznz.go.tz
          </div>
          <div style={{ textAlign: 'right' }}>
            Simu: +255-24-2233567<br />
            Nukushi: +255-24-2233564<br />
            Tovuti: www.dppznz.go.tz
          </div>
        </div>
      </header>

      <div className="letter-sans" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 24, marginTop: 18, fontSize: 13 }}>
        <div>
          <span className="letter-label">Kumb. Na</span> <strong>{request.ref}</strong>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: ACCENT }}>{employee?.name ?? '—'}</div>
          <div style={{ fontSize: 12 }}>{employee?.title ?? '—'}</div>
          <div style={{ fontSize: 11, color: MUTED }}>{department} · {zone}</div>
          <div style={{ fontSize: 11, color: MUTED, marginTop: 6 }}>
            <span className="letter-label">Tarehe</span> {formatSwDate(request.decidedAt ?? request.submittedAt ?? request.createdAt)}
          </div>
        </div>
      </div>

      <div className="letter-sans" style={{ marginTop: 18, fontSize: 13, lineHeight: 1.6 }}>
        <div>NDG. {employee?.name ?? '—'}</div>
        <div>AFISI YA MKURUGENZI WA MASHTAKA,</div>
        <div>ZANZIBAR.</div>
      </div>

      <h2 className="letter-sans" style={{ margin: '20px 0 10px', padding: '8px 0', borderTop: `1px solid ${BORDER}`, borderBottom: `1px solid ${BORDER}`, fontSize: 15, textTransform: 'uppercase', textAlign: 'center', fontWeight: 700 }}>
        KUH: OMBI LA LIKIZO YA {leaveName.toUpperCase()}
      </h2>

      <div className="letter-sans" style={{ fontSize: 14, lineHeight: 1.65, textAlign: 'justify' }}>
        {approved && <p>{`Ombi lako la ${leaveName} la mwaka ${new Date(request.decidedAt ?? request.submittedAt ?? request.createdAt).getFullYear()} limeidhinishwa.`}</p>}
        {rejected && <p>{`Ombi lako la ${leaveName} limekataliwa. Hati hii inathibitisha uamuzi wa ombi lako.`}</p>}
        <p>Sababu ya ombi: {request.reason?.trim() || '—'}</p>
        <p>Kipindi cha likizo: <strong>{period}</strong>. Tarehe ya kurudi kazini: <strong>{approved && request.endDate ? formatSwDate(addDays(request.endDate, 1)) : '—'}</strong>.</p>
        <p>Idadi ya siku zilizoidhinishwa: <strong>{request.days ?? '—'}</strong>. {request.isPaid ? <span style={{ color: '#0B5E40', fontWeight: 700 }}>Likizo hii italipwa (Inalipwa).</span> : null}</p>
      </div>

      <div style={{ marginTop: 40, textAlign: 'right' }} className="letter-sans">
        <div>Ahsante</div>
        <div style={{ marginTop: 24 }}>..................................</div>
        <div style={{ fontWeight: 700, marginTop: 8 }}>MWANDAWA I. OTHMAN,</div>
        <div>/MKURUGENZI WA MASHTAKA,</div>
        <div>AFISI YA MKURUGENZI WA MASHTAKA,</div>
        <div>ZANZIBAR.</div>
      </div>

      <section className="letter-sans" style={{ marginTop: 32, fontSize: 12 }}>
        <div style={{ fontWeight: 700, marginBottom: 6 }}>NAKALA:-</div>
        <ul style={{ margin: 0, paddingLeft: 18, lineHeight: 1.7 }}>
          {copies.map((c, i) => <li key={i}>{c}</li>)}
        </ul>
      </section>
    </div>
  )
}

export default LetterView