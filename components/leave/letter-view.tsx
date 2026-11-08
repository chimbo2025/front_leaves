'use client'

import { useLeave } from '@/components/leave/leave-context'
import { addDays, getDept, getEmployee, getLeaveTypeSafe, getZone, type LeaveRequest } from '@/lib/leave'

const ACCENT = '#0F5C54'
const MUTED = '#4A5A66'
const BORDER = '#C9D2D8'
const FONT_LINK = 'https://fonts.googleapis.com/css2?family=Source+Serif+4:wght@400;600;700&family=IBM+Plex+Sans:wght@400;500;600&display=swap'
const MONTHS = ['Januari', 'Februari', 'Machi', 'Aprili', 'Mei', 'Juni', 'Julai', 'Agosti', 'Septemba', 'Oktoba', 'Novemba', 'Desemba']

function formatSwDate(value?: string | null): string {
  if (!value) return '—'
  const date = new Date(value.length <= 10 ? `${value}T00:00:00` : value.replace(' ', 'T'))
  if (Number.isNaN(date.getTime())) return '—'
  return `${String(date.getDate()).padStart(2, '0')} ${MONTHS[date.getMonth()]} ${date.getFullYear()}`
}

export function LetterView({ request }: { request: LeaveRequest }) {
  const { employees, allZones, allDepts } = useLeave()
  const employee = employees.find((row) => row.id === request.employeeId) ?? getEmployee(request.employeeId)
  const leaveType = getLeaveTypeSafe(request.leaveTypeId)
  const department = allDepts.find((row) => row.id === employee?.departmentId)?.name ?? (employee ? getDept(employee.departmentId)?.name : undefined) ?? '—'
  const zone = allZones.find((row) => row.id === employee?.zoneId)?.name ?? (employee ? getZone(employee.zoneId)?.name : undefined) ?? '—'
  const approved = request.status === 'approved'
  const rejected = request.status === 'rejected'
  const outcome = approved ? 'IMEIDHINISHWA' : rejected ? 'IMEKATALIWA' : 'INASUBIRI'
  const outcomeColor = approved ? '#0B5E40' : rejected ? '#9B1C1C' : '#8A5A10'
  const leaveName = leaveType?.swahili || leaveType?.name || request.leaveTypeId
  const period = request.endDate ? `${formatSwDate(request.startDate)} hadi ${formatSwDate(request.endDate)}` : `${formatSwDate(request.startDate)} hadi tarehe ya mwisho itakayowekwa`
  const payroll = employees.find((row) => row.id === request.employeeId)?.payrollNo || request.employeeId || '—'
  const facts: [string, string][] = [
    ['Jina kamili', employee?.name ?? '—'],
    ['Namba ya utumishi', payroll],
    ['Wadhifa', employee?.title ?? '—'],
    ['Idara / kituo', `${department} · ${zone}`],
    ['Aina ya likizo', leaveName],
    ['Kipindi', period],
    ['Muda', request.days > 0 ? `${request.days} siku` : 'Utaamuliwa na mwidhinishaji wa mwisho'],
    ['Hali ya uamuzi', approved ? 'Imeidhinishwa' : rejected ? 'Imekataliwa' : 'Inasubiri'],
  ]

  return (
    <div className="letter-page" lang="sw" style={{ width: 794, minHeight: 1123, boxSizing: 'border-box', padding: '44px 58px', background: '#fff', color: '#14202B', display: 'flex', flexDirection: 'column', fontFamily: "'Source Serif 4', Georgia, serif", margin: '0 auto', boxShadow: '0 12px 40px rgba(20,32,43,0.12)' }}>
      <style>{`@page{size:A4;margin:0}.letter-sans{font-family:'IBM Plex Sans',system-ui,sans-serif}.letter-label{font-size:10px;letter-spacing:.08em;text-transform:uppercase;font-weight:600;color:${MUTED}}`}</style>
      <link href={FONT_LINK} rel="stylesheet" />
      <header className="letter-sans" style={{ textAlign: 'center', borderBottom: `3px double ${ACCENT}`, paddingBottom: 14 }}>
        <div style={{ fontSize: 12, letterSpacing: '.12em', textTransform: 'uppercase', color: MUTED }}>Jamhuri ya Mapinduzi ya Zanzibar</div>
        <h1 style={{ margin: '6px 0 2px', color: ACCENT, fontSize: 21, textTransform: 'uppercase' }}>Ofisi ya Mkurugenzi wa Mashtaka</h1>
        <div style={{ color: MUTED, fontSize: 12 }}>Zanzibar</div>
      </header>

      <div className="letter-sans" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 18, fontSize: 13 }}>
        <div><span className="letter-label">Kumbukumbu</span> <strong>{request.ref}</strong><br /><span className="letter-label">Tarehe</span> {formatSwDate(request.decidedAt ?? request.submittedAt ?? request.createdAt)}</div>
        <div style={{ border: `2px solid ${outcomeColor}`, color: outcomeColor, borderRadius: 8, padding: '6px 14px', fontWeight: 700 }}>{outcome}</div>
      </div>

      <div className="letter-sans" style={{ marginTop: 20, fontSize: 14, lineHeight: 1.5 }}>
        <strong>{employee?.name ?? '—'}</strong><br />
        {employee?.title ?? '—'}<br />
        {department} · {zone}
      </div>

      <h2 className="letter-sans" style={{ margin: '18px 0 10px', padding: '8px 0', borderTop: `1px solid ${BORDER}`, borderBottom: `1px solid ${BORDER}`, fontSize: 15, textTransform: 'uppercase' }}>
        YAH: Maombi ya {leaveName} — {approved ? 'yameidhinishwa' : rejected ? 'yamekataliwa' : 'hali ya ombi'}
      </h2>
      <div className="letter-sans" style={{ fontSize: 14, lineHeight: 1.65, textAlign: 'justify' }}>
        <p>{approved ? `Ombi lako la ${leaveName} la mwaka ${new Date(request.decidedAt ?? request.submittedAt ?? request.createdAt).getFullYear()} limeidhinishwa.` : rejected ? `Ombi lako la ${leaveName} limekataliwa. Hati hii inathibitisha uamuzi wa ombi lako.` : `Hii ni taarifa ya ombi lako la ${leaveName} na hali yake ya sasa.`}</p>
        <p>Sababu ya ombi: {request.reason?.trim() || '—'}</p>
        <p>Kipindi cha likizo: <strong>{period}</strong>. Tarehe ya kurudi kazini: <strong>{approved && request.endDate ? formatSwDate(addDays(request.endDate, 1)) : '—'}</strong>.</p>
      </div>

      <section style={{ marginTop: 16, border: `1px solid ${BORDER}`, borderRadius: 6, overflow: 'hidden' }}>
        <div className="letter-sans" style={{ padding: '8px 12px', background: '#EDF1F3', fontWeight: 700, fontSize: 12 }}>TAARIFA ZA MWOMBAJI NA OMBI</div>
        <div className="letter-sans" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', fontSize: 13 }}>
          {facts.map(([label, value]) => <div key={label} style={{ padding: '9px 12px', borderTop: `1px solid ${BORDER}` }}><div className="letter-label">{label}</div><div style={{ marginTop: 3, fontWeight: 600 }}>{value}</div></div>)}
        </div>
      </section>

      <footer className="letter-sans" style={{ marginTop: 'auto', paddingTop: 12, borderTop: `1px solid ${BORDER}`, display: 'flex', justifyContent: 'space-between', gap: 16, fontSize: 11, color: MUTED }}>
        <span>DPP Zanzibar · Mfumo wa Usimamizi wa Likizo</span>
        <span>{request.ref} · Imechapishwa {formatSwDate(new Date().toISOString())}</span>
      </footer>
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
  if (!doc) { iframe.remove(); return }
  doc.open()
  doc.write(`<!doctype html><html lang="sw"><head><meta charset="utf-8"><title>Barua ya Likizo</title><link href="${FONT_LINK}" rel="stylesheet"></head><body style="margin:0;background:#fff">${page.outerHTML}</body></html>`)
  doc.close()
  const go = () => {
    try { iframe.contentWindow?.focus(); iframe.contentWindow?.print() }
    finally { window.setTimeout(() => iframe.remove(), 1500) }
  }
  const fonts = doc.fonts?.ready as Promise<unknown> | undefined
  if (fonts) void Promise.race([fonts, new Promise((resolve) => window.setTimeout(resolve, 1200))]).then(go, go)
  else window.setTimeout(go, 300)
}
