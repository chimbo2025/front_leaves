'use client'

import { useEffect, useState } from 'react'
import { useLeave } from '@/components/leave/leave-context'
import {
  addDays,
  generateEmployeeRequestLetterBody,
  getDept,
  getEmployee,
  getLeaveTypeSafe,
  getZone,
  type ApprovalStep,
  type LeaveRequest,
} from '@/lib/leave'
import { leaveApi, type ChainItem, type SignatureSeal } from '@/lib/leave-api'

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
 * Employee application letter — the original request-letter design used before
 * the HR response letter existed. Layout rules:
 *  1. Letterhead, then the requester block sits TOP-RIGHT of the page.
 *  2. Status stamp on the left; the fixed application paragraph, the reason
 *     and the requested period follow under the subject.
 *  3. The approval sign-off (final approver, with signature seal) sits below.
 *  4. Footer carries the reference and print date.
 *
 * This is NOT the DPP response letter (`views/letter-view.tsx`): no NAKALA,
 * no Director sign-off, no granted-days block.
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

export interface RequestLetterViewProps {
  request: LeaveRequest
  /** Ceremony signature seals, matched to signers by employee id. */
  signatures?: SignatureSeal[]
  /** Resolved chain when the request payload does not carry assignments. */
  chain?: ChainItem[]
}

export function RequestLetterView({ request, signatures = [], chain = [] }: RequestLetterViewProps) {
  const { employees, allZones, allDepts } = useLeave()
  const employee = employees.find((row) => row.id === request.employeeId) ?? getEmployee(request.employeeId)
  const org = request.employeeOrg
  const leaveType = getLeaveTypeSafe(request.leaveTypeId)

  // The employee can be outside the viewer's scoped employee list (an approver
  // in another department, for example). The server-side org snapshot on the
  // request is the authoritative fallback so the letter never prints "—".
  const employeeName = employee?.name ?? org?.name ?? '—'
  const rawTitle = employee?.title ?? org?.title ?? ''
  const employeeTitle = rawTitle === 'No position assigned' ? '' : rawTitle

  const deptRow = allDepts.find((row) => row.id === (employee?.departmentId || org?.departmentId))
  const divisionRow = allDepts.find((row) => row.id === (employee?.divisionId || org?.divisionId))
  const unitRow = allDepts.find((row) => row.id === (employee?.unitId || org?.unitId))
  const zoneRow = allZones.find((row) => row.id === (employee?.zoneId || org?.zoneId))

  const departmentName = deptRow?.name ?? org?.department ?? (employee ? getDept(employee.departmentId)?.name : undefined) ?? ''
  const divisionName = divisionRow?.name ?? org?.division ?? ''
  const unitName = unitRow?.name ?? org?.unit ?? ''
  const zone = zoneRow?.name ?? org?.zone ?? (employee ? getZone(employee.zoneId)?.name : undefined) ?? '—'

  // Departments, divisions and units are all Department rows. Show whichever
  // the employee actually belongs to: department → division → unit.
  const organisation = departmentName || divisionName || unitName || 'Afisi Kuu'

  const approved = request.status === 'approved'
  const rejected = request.status === 'rejected'
  const outcome = approved ? 'IMEIDHINISHWA' : rejected ? 'IMEKATALIWA' : 'INASUBIRI'
  const outcomeColor = approved ? '#0B5E40' : rejected ? '#9B1C1C' : '#8A5A10'
  const leaveName = leaveType?.swahili || leaveType?.name || request.leaveTypeId
  const period = request.endDate ? `${formatSwDate(request.startDate)} hadi ${formatSwDate(request.endDate)}` : `${formatSwDate(request.startDate)} hadi tarehe ya mwisho itakayowekwa`

  // Fixed Swahili application paragraph, built from the employee's live
  // organisation (department/division/unit) and the selected leave type.
  const applicationText = generateEmployeeRequestLetterBody(organisation, leaveName)

  // The approval chain and signature seals are fetched from the backend (the
  // HR-configured workflow) whenever the caller did not supply them — e.g. the
  // approver's preview modal. That keeps "Uidhinishaji" in sync with HR.
  const [resolvedChain, setResolvedChain] = useState<ChainItem[]>([])
  const [resolvedSeals, setResolvedSeals] = useState<SignatureSeal[]>([])

  useEffect(() => {
    let cancelled = false

    if (chain.length === 0 && request.steps.length === 0) {
      leaveApi.requests
        .workflow(request.id)
        .then((res) => { if (!cancelled) setResolvedChain(res.data) })
        .catch(() => undefined)
    }
    if (signatures.length === 0) {
      leaveApi.requests
        .signaturesFor(request.id)
        .then((res) => { if (!cancelled) setResolvedSeals(res.data) })
        .catch(() => undefined)
    }

    return () => { cancelled = true }
  }, [request.id, request.steps.length, chain.length, signatures.length])

  // Caller-supplied data wins; otherwise use what we fetched from the backend.
  const effectiveChain = chain.length > 0 ? chain : resolvedChain
  const effectiveSeals = signatures.length > 0 ? signatures : resolvedSeals

  const facts: [string, string][] = [
    ['Aina ya likizo', leaveName],
    ['Kipindi', period],
    ['Muda', request.days > 0 ? `${request.days} siku` : 'Utaamuliwa na mwidhinishaji wa mwisho'],
    ['Hali ya uamuzi', approved ? 'Imeidhinishwa' : rejected ? 'Imekataliwa' : 'Inasubiri'],
    ['Malipo', request.isPaid === false ? 'Bila malipo / Unpaid' : request.isPaid === true ? 'Inalipwa / Paid' : '—'],
  ]

  // A step's assignment is stored `done` once acted on. The real outcome lives
  // on the decision, so resolve it here before folding rows or printing a
  // status stamp.
  const stepState = (s: ApprovalStep): string =>
    s.decision === 'rejected' || s.decision === 'returned' || s.decision === 'approved' ? s.decision : s.status

  // Collapse repeated assignees into one row, in first-appearance order.
  const distinctApprovers: Array<ApprovalStep & { roleLabels: string[] }> = []
  {
    const byKey = new Map<string, number>()
    for (const s of letterSteps(request, effectiveChain)) {
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
      const st = stepState(s)
      if (st === 'pending') row.status = 'pending'
      else if (st === 'rejected' && row.status !== 'pending') row.status = 'rejected'
      else if (st === 'returned' && row.status !== 'pending' && row.status !== 'rejected') row.status = 'returned'
      if (s.actedAt && (!row.actedAt || s.actedAt > row.actedAt)) row.actedAt = s.actedAt
    }
  }

  const sealsByActor = new Map<string, SignatureSeal>()
  for (const seal of effectiveSeals) {
    const prev = sealsByActor.get(seal.actor_id)
    if (!prev || String(seal.signed_at ?? '') > String(prev.signed_at ?? '')) sealsByActor.set(seal.actor_id, seal)
  }

  const approverState = (s: ApprovalStep): { label: string; color: string } => {
    const st = stepState(s)
    if (st === 'approved') return { label: `✓ Imeidhinishwa${s.actedAt ? ` · ${formatSwDate(s.actedAt)}` : ''}`, color: '#0B5E40' }
    if (st === 'rejected') return { label: `✗ Imekataliwa${s.actedAt ? ` · ${formatSwDate(s.actedAt)}` : ''}`, color: '#9B1C1C' }
    if (st === 'returned') return { label: `↩ Irudishwa kwa marekebisho${s.actedAt ? ` · ${formatSwDate(s.actedAt)}` : ''}`, color: '#8A5A10' }
    return { label: 'Inasubiri — bado haijaidhinishwa', color: '#8A5A10' }
  }

  return (
    <div className="letter-page" lang="sw" style={{ width: 794, minHeight: 1123, boxSizing: 'border-box', padding: '44px 58px', background: '#fff', color: INK, display: 'flex', flexDirection: 'column', fontFamily: "'Source Serif 4', Georgia, serif", margin: '0 auto', boxShadow: '0 12px 40px rgba(20,32,43,0.12)' }}>
      <style>{`@page{size:A4;margin:0}.letter-sans{font-family:'IBM Plex Sans',system-ui,sans-serif}.letter-label{font-size:10px;letter-spacing:.08em;text-transform:uppercase;font-weight:600;color:${MUTED}}`}</style>
      <link href={FONT_LINK} rel="stylesheet" />
      <header className="letter-sans" style={{ textAlign: 'center', borderBottom: `3px double ${ACCENT}`, paddingBottom: 14 }}>
        <div style={{ fontSize: 20, fontWeight: 700, color: ACCENT, textTransform: 'uppercase' }}>DOKEZO</div>
      </header>

      {/* Status stamp on the left; requester block TOP-RIGHT. */}
      <div className="letter-sans" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 24, marginTop: 18, fontSize: 13 }}>
        <div>
          <div style={{ border: `2px solid ${outcomeColor}`, color: outcomeColor, borderRadius: 8, padding: '5px 12px', fontWeight: 700, display: 'inline-block', marginTop: 12, fontSize: 13 }}>{outcome}</div>
        </div>
        <div style={{ textAlign: 'right', lineHeight: 1.55 }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: ACCENT }}>{employeeName}</div>
          {employeeTitle && <div style={{ fontSize: 12 }}>{employeeTitle}</div>}
          <div style={{ fontSize: 11, color: MUTED }}>{organisation} · {zone}</div>
          <div style={{ fontSize: 11, color: MUTED, marginTop: 6 }}>
            <span className="letter-label">Tarehe</span> {formatSwDate(request.decidedAt ?? request.submittedAt ?? request.createdAt)}
          </div>
        </div>
      </div>

      <h2 className="letter-sans" style={{ margin: '20px 0 10px', padding: '8px 0', borderTop: `1px solid ${BORDER}`, borderBottom: `1px solid ${BORDER}`, fontSize: 15, textTransform: 'uppercase' }}>
        KUH: OMBI LA LIKIZO YA {leaveName.toUpperCase()}
      </h2>
      <div className="letter-sans" style={{ fontSize: 14, lineHeight: 1.65, textAlign: 'justify' }}>
        {/* The pre-defined Swahili application paragraph — always present. */}
        <p>{applicationText}</p>
        {request.reason?.trim() && <p>Sababu ya ombi: {request.reason.trim()}</p>}
        <p>
          Kipindi cha likizo: <strong>{period}</strong>. Tarehe ya kurudi kazini:{' '}
          <strong>{request.endDate ? formatSwDate(addDays(request.endDate, 1)) : '—'}</strong>.
        </p>
      </div>

      <section style={{ marginTop: 16, border: `1px solid ${BORDER}`, borderRadius: 6, overflow: 'hidden' }}>
        <div className="letter-sans" style={{ padding: '8px 12px', background: '#EDF1F3', fontWeight: 700, fontSize: 12 }}>TAARIFA ZA OMBI</div>
        <div className="letter-sans" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', fontSize: 13 }}>
          {facts.map(([label, value]) => <div key={label} style={{ padding: '9px 12px', borderTop: `1px solid ${BORDER}` }}><div className="letter-label">{label}</div><div style={{ marginTop: 3, fontWeight: 600, color: label === 'Malipo' ? (request.isPaid ? '#0B5E40' : request.isPaid === false ? '#9B1C1C' : undefined) : undefined }}>{value}</div></div>)}
        </div>
      </section>

      {/* Approval workflow sign-off — those WHO ACT on the chain. */}
      <section className="letter-sans" style={{ marginTop: 18, maxWidth: '72%' }}>
        <div style={{ borderTop: `1px solid ${BORDER}`, borderBottom: `1px solid ${BORDER}`, padding: '7px 0', fontWeight: 700, fontSize: 12, letterSpacing: '.07em', textTransform: 'uppercase' }}>
          Uidhinishaji / Approval workflow
        </div>
        {distinctApprovers.length === 0 ? (
          <p style={{ fontSize: 12, color: MUTED, margin: '10px 0 0' }}>Hakuna hatua za kuidhinisha zilizorekodiwa.</p>
        ) : (
          <ol style={{ listStyle: 'none', margin: '6px 0 0', padding: 0 }}>
            {(distinctApprovers.filter((s) => s.roleLabels.some((r) => r === 'HR' || r === 'Human Resources')).slice(-1).length > 0
              ? distinctApprovers.filter((s) => s.roleLabels.some((r) => r === 'HR' || r === 'Human Resources')).slice(-1)
              : distinctApprovers.slice(-1)
            ).map((s, i) => {
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

export default RequestLetterView
