'use client'

import { useLeave } from '@/components/leave/leave-context'
import { addDays, getDept, getEmployee, getLeaveTypeSafe, getZone, type LeaveRequest, type ApprovalStep } from '@/lib/leave'
import type { SignatureSeal, ChainItem } from '@/lib/leave-api'

const ACCENT = '#0F5C54'
const MUTED = '#4A5A66'
const BORDER = '#C9D2D8'
const INK = '#14202B'
const FONT_LINK = 'https://fonts.googleapis.com/css2?family=Source+Serif+4:wght@400;600;700&family=IBM+Plex+Sans:wght@400;500;600&display=swap'
const MONTHS = ['Januari', 'Februari', 'Machi', 'Aprili', 'Mei', 'Juni', 'Julai', 'Agosti', 'Septemba', 'Oktoba', 'Novemba', 'Desemba']

function formatSwDate(value?: string | null): string {
  if (!value) return '—'
  const date = new Date(value.length <= 10 ? `${value}T00:00:00` : value.replace(' ', 'T'))
  if (Number.isNaN(date.getTime())) return '—'
  return `${String(date.getDate()).padStart(2, '0')} ${MONTHS[date.getMonth()]} ${date.getFullYear()}`
}

/**
 * Official leave letter, DPP Zanzibar. Layout rules:
 *  1. Letterhead, then the requester block sits TOP-RIGHT of the page.
 *  2. Below it, on the LEFT, the approval workflow sign-off list — one row per
 *     PERSON (the same approver appearing on several steps is listed once).
 *  3. Status stamps reflect the chain as it stands today; each signer renders
 *     their ceremony signature image when one was stored at decision time,
 *     otherwise a blank signature rule is printed.
 */
/**
 * Letter source rows. Persisted steps win when the chain has started moving
 * (they carry real decisions); before the first decision is recorded no
 * assignment rows exist yet, so the resolved workflow chain stands in as the
 * planned sign-off list (all Inasubiri). Without this fallback the letter
 * printed no uidhinishaji block at all for a fresh request.
 */
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
    ['Aina ya likizo', leaveName],
    ['Kipindi', period],
    ['Muda', request.days > 0 ? `${request.days} siku` : 'Utaamuliwa na mwidhinishaji wa mwisho'],
    ['Hali ya uamuzi', approved ? 'Imeidhinishwa' : rejected ? 'Imekataliwa' : 'Inasubiri'],
    ['Malipo', request.isPaid === false ? 'Bila malipo / Unpaid' : request.isPaid === true ? 'Inalipwa / Paid' : '—'],
  ]

  // The distinct approval sign-offs: collapse repeated assignees into one row,
  // in first-appearance order. A person is IMEIDHINISHWA only once every step
  // of theirs is decided; any open step leaves them INASUBIRI.
  const distinctApprovers: Array<ApprovalStep & { roleLabels: string[] }> = []
  {
    const byKey = new Map<string, number>()
    for (const s of letterSteps(request, chain)) {
      const key = (s.assigneeId || s.assigneeName || '').trim()
      if (!key) continue
      const idx = byKey.get(key)
      if (idx === undefined) {
        byKey.set(key, distinctApprovers.length)
        distinctApprovers.push({ ...s, roleLabels: [s.roleLabel] })
        continue
      }
      const row = distinctApprovers[idx]
      if (!row.roleLabels.includes(s.roleLabel)) row.roleLabels.push(s.roleLabel)
      // Fold the later step into the same row: a step pending on them right now
      // wins (they still owe a signature), then rejected, else approved. Queued
      // (not-yet-reached) steps carry no decision and never downgrade a row.
      if (s.status === 'pending') row.status = 'pending'
      else if (s.status === 'rejected' && row.status !== 'pending') row.status = 'rejected'
      else if (s.status === 'returned' && row.status !== 'pending' && row.status !== 'rejected') row.status = 'returned'
      if (s.actedAt && (!row.actedAt || s.actedAt > row.actedAt)) row.actedAt = s.actedAt
    }
  }

  // Latest seal per signer, matched to the distinct approver rows by employee id.
  const sealsByActor = new Map<string, SignatureSeal>()
  for (const seal of signatures) {
    const prev = sealsByActor.get(seal.actor_id)
    if (!prev || String(seal.signed_at ?? '') > String(prev.signed_at ?? '')) sealsByActor.set(seal.actor_id, seal)
  }

  const approverState = (s: ApprovalStep): { label: string; color: string } => {
    if (s.status === 'approved') return { label: `✓ Imeidhinishwa${s.actedAt ? ` · ${formatSwDate(s.actedAt)}` : ''}`, color: '#0B5E40' }
    if (s.status === 'rejected') return { label: `✗ Imekataliwa${s.actedAt ? ` · ${formatSwDate(s.actedAt)}` : ''}`, color: '#9B1C1C' }
    if (s.status === 'returned') return { label: `↩ Irudishwa kwa marekebisho${s.actedAt ? ` · ${formatSwDate(s.actedAt)}` : ''}`, color: '#8A5A10' }
    return { label: 'Inasubiri — bado haijaidhinishwa', color: '#8A5A10' }
  }

  return (
    <div className="letter-page" lang="sw" style={{ width: 794, minHeight: 1123, boxSizing: 'border-box', padding: '44px 58px', background: '#fff', color: INK, display: 'flex', flexDirection: 'column', fontFamily: "'Source Serif 4', Georgia, serif", margin: '0 auto', boxShadow: '0 12px 40px rgba(20,32,43,0.12)' }}>
      <style>{`@page{size:A4;margin:0}.letter-sans{font-family:'IBM Plex Sans',system-ui,sans-serif}.letter-label{font-size:10px;letter-spacing:.08em;text-transform:uppercase;font-weight:600;color:${MUTED}}`}</style>
      <link href={FONT_LINK} rel="stylesheet" />
      <header className="letter-sans" style={{ textAlign: 'center', borderBottom: `3px double ${ACCENT}`, paddingBottom: 14 }}>
        <div style={{ fontSize: 12, letterSpacing: '.12em', textTransform: 'uppercase', color: MUTED }}>Jamhuri ya Mapinduzi ya Zanzibar</div>
        <h1 style={{ margin: '6px 0 2px', color: ACCENT, fontSize: 21, textTransform: 'uppercase' }}>Ofisi ya Mkurugenzi wa Mashtaka</h1>
        <div style={{ color: MUTED, fontSize: 12 }}>Zanzibar</div>
      </header>

      {/* Reference line on the left; requester block TOP-RIGHT, in the official letter position. */}
      <div className="letter-sans" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 24, marginTop: 18, fontSize: 13 }}>
        <div>
          <span className="letter-label">Kumbukumbu</span> <strong>{request.ref}</strong><br />
          <div style={{ border: `2px solid ${outcomeColor}`, color: outcomeColor, borderRadius: 8, padding: '5px 12px', fontWeight: 700, display: 'inline-block', marginTop: 12, fontSize: 13 }}>{outcome}</div>
        </div>
        <div style={{ textAlign: 'right', lineHeight: 1.55 }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: ACCENT }}>{employee?.name ?? '—'}</div>
          <div style={{ fontSize: 12 }}>{employee?.title ?? '—'}</div>
          <div style={{ fontSize: 11, color: MUTED }}>{department} · {zone}</div>
          <div style={{ fontSize: 10, color: MUTED, marginTop: 4 }}>Namba ya utumishi: {payroll}</div>
          <div style={{ fontSize: 11, color: MUTED, marginTop: 6 }}>
            <span className="letter-label">Tarehe</span> {formatSwDate(request.decidedAt ?? request.submittedAt ?? request.createdAt)}
          </div>
        </div>
      </div>

      <h2 className="letter-sans" style={{ margin: '20px 0 10px', padding: '8px 0', borderTop: `1px solid ${BORDER}`, borderBottom: `1px solid ${BORDER}`, fontSize: 15, textTransform: 'uppercase' }}>
        YAH: Maombi ya {leaveName} — {approved ? 'yameidhinishwa' : rejected ? 'yamekataliwa' : 'hali ya ombi'}
      </h2>
      <div className="letter-sans" style={{ fontSize: 14, lineHeight: 1.65, textAlign: 'justify' }}>
        <p>{approved ? `Ombi lako la ${leaveName} la mwaka ${new Date(request.decidedAt ?? request.submittedAt ?? request.createdAt).getFullYear()} limeidhinishwa.` : rejected ? `Ombi lako la ${leaveName} limekataliwa. Hati hii inathibitisha uamuzi wa ombi lako.` : `Hii ni taarifa ya ombi lako la ${leaveName} na hali yake ya sasa.`}</p>
        <p>Sababu ya ombi: {request.reason?.trim() || '—'}</p>
        <p>Kipindi cha likizo: <strong>{period}</strong>. Tarehe ya kurudi kazini: <strong>{approved && request.endDate ? formatSwDate(addDays(request.endDate, 1)) : '—'}</strong>.</p>
      </div>

      <section style={{ marginTop: 16, border: `1px solid ${BORDER}`, borderRadius: 6, overflow: 'hidden' }}>
        <div className="letter-sans" style={{ padding: '8px 12px', background: '#EDF1F3', fontWeight: 700, fontSize: 12 }}>TAARIFA ZA OMBI</div>
        <div className="letter-sans" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', fontSize: 13 }}>
          {facts.map(([label, value]) => <div key={label} style={{ padding: '9px 12px', borderTop: `1px solid ${BORDER}` }}><div className="letter-label">{label}</div><div style={{ marginTop: 3, fontWeight: 600 }}>{value}</div></div>)}
        </div>
      </section>

      {/* Approval workflow — those WHO ACT on the chain, one entry per person. */}
      <section className="letter-sans" style={{ marginTop: 18, maxWidth: '72%' }}>
        <div style={{ borderTop: `1px solid ${BORDER}`, borderBottom: `1px solid ${BORDER}`, padding: '7px 0', fontWeight: 700, fontSize: 12, letterSpacing: '.07em', textTransform: 'uppercase' }}>
          Uidhinishaji / Approval workflow
        </div>
        {distinctApprovers.length === 0 ? (
          <p style={{ fontSize: 12, color: MUTED, margin: '10px 0 0' }}>Hakuna hatua za kuidhinisha zilizorekodiwa.</p>
        ) : (
          <ol style={{ listStyle: 'none', margin: '6px 0 0', padding: 0 }}>
            {distinctApprovers.map((s, i) => {
              const state = approverState(s)
              const seal = sealsByActor.get(s.assigneeId ?? '')
              return (
                <li key={`${s.order}-${s.assigneeId || s.assigneeName}`} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 18, padding: '12px 2px', borderBottom: i < distinctApprovers.length - 1 ? `1px dashed ${BORDER}` : 'none' }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 700 }}>{i + 1}. {s.assigneeName || '—'}</div>
                    <div style={{ fontSize: 10, letterSpacing: '.06em', textTransform: 'uppercase', color: MUTED, marginTop: 1 }}>{s.roleLabels.join(' · ')}</div>
                    <div style={{ fontSize: 11, color: state.color, fontWeight: 600, marginTop: 5 }}>{state.label}</div>
                  </div>
                  <div style={{ flexShrink: 0, width: 150, textAlign: 'center' }}>
                    {seal?.image_data_url ? (
                      <>
                        {/* Stored ceremony signature — inline data URL so print/PDF carries it. */}
                        <img src={seal.image_data_url} alt={`Saini ya ${s.assigneeName}`} style={{ maxHeight: 36, maxWidth: 150, objectFit: 'contain', margin: '0 auto' }} />
                        <div style={{ borderBottom: `1.5px solid ${ACCENT}`, marginTop: 2 }} />
                        <div style={{ fontSize: 9, color: MUTED, marginTop: 3, textTransform: 'uppercase', letterSpacing: '.06em' }}>Dijiti · {formatSwDate(seal.signed_at)}</div>
                      </>
                    ) : seal ? (
                      <>
                        <div style={{ height: 30, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
                          <span style={{ fontSize: 11, color: '#0B5E40', fontWeight: 700 }}>✓ Saini ya dijiti</span>
                        </div>
                        <div style={{ borderBottom: `1.5px solid ${ACCENT}` }} />
                        <div style={{ fontSize: 9, color: MUTED, marginTop: 3, letterSpacing: '.03em' }}>Dijiti · {formatSwDate(seal.signed_at)} · {seal.signature_hash_prefix}</div>
                      </>
                    ) : (
                      <>
                        <div style={{ borderBottom: `1.5px solid ${ACCENT}`, height: 30 }} />
                        <div style={{ fontSize: 10, color: MUTED, marginTop: 3, textTransform: 'uppercase', letterSpacing: '.06em' }}>Sahihi / Signature</div>
                      </>
                    )}
                  </div>
                </li>
              )
            })}
          </ol>
        )}
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
