export type Status =
  | 'draft'
  | 'submitted'
  | 'under_review'
  | 'returned_for_correction'
  | 'approved'
  | 'rejected'
  | 'withdrawn'
  | 'paused_pending_handover'

export type StepStatus = 'pending' | 'approved' | 'rejected' | 'returned' | 'escalated' | 'skipped'

export type ApproverRole =
  | 'SUPERVISOR'
  | 'DEPT_HEAD'
  | 'ZONAL_HEAD'
  | 'HR'
  | 'FINAL_AUTHORITY'

export interface Zone {
  id: string
  name: string
  short: string
  isHQ: boolean
  isPemba: boolean
  isCoordination?: boolean
}

export interface Department {
  id: string
  name: string
  zoneId: string
  /** Parent row in the org tree — departments contain divisions and units. */
  parentId?: string
  /** department | division | unit | independent_unit | region | … */
  unitType?: string
}

export interface Position {
  id: string
  title: string
  departmentId: string
  tier: number
  isFinalAuthority?: boolean
}

export interface Employee {
  id: string
  name: string
  title: string
  initials: string
  positionId: string
  departmentId: string
  zoneId: string
  gender: 'M' | 'F'
  hireDate: string
  email: string
  gradient: string
}

export interface LeaveType {
  id: string
  code: string
  name: string
  swahili: string
  short: string
  paid: boolean
  description: string
  color: string
  soft: string
}

export interface LeavePolicy {
  id: string
  leaveTypeId: string
  version: number
  maxDaysPerYear: number
  maxDaysPerRequest: number
  minTenureMonths: number
  minNoticeDays: number
  requiresDocuments: boolean
  requiredDocs: string[]
  carryOverMax: number
  carryOverExpiryMonth?: number
  allowHalfDay: boolean
  notes: string
  effectiveFrom?: string
  effectiveTo?: string
}

export interface WorkflowStepDef {
  role: ApproverRole
  slaDays: number
  note: string
}

export interface WorkflowDef {
  id: string
  leaveTypeId: string
  /** Deactivated definitions stay on file but stop routing new submissions. */
  isActive?: boolean
  version?: number
  minDurationDays?: number
  zoneId?: string | null
  departmentId?: string | null
  effectiveFrom?: string | null
  effectiveTo?: string | null
  steps: WorkflowStepDef[]
}

export interface ApprovalStep {
  order: number
  role: ApproverRole
  roleLabel: string
  assigneeId: string
  assigneeName: string
  via: string
  slaDays: number
  dueAt: string
  status: StepStatus
  comments?: string
  actedAt?: string
}

export interface Document {
  id: string
  name: string
  type: string
  uploadedBy: string
  uploadedByLabel: string
  restricted: boolean
  size: string
  uploadedAt: string
}

export interface LeaveRequest {
  id: string
  ref: string
  employeeId: string
  leaveTypeId: string
  policyId: string
  startDate: string
  endDate: string
  days: number
  isHalfDay?: boolean
  emergency?: boolean
  emergencyReason?: string
  reason: string
  status: Status
  createdAt: string
  submittedAt?: string
  decidedAt?: string
  documents: Document[]
  steps: ApprovalStep[]
  signaturePath?: string
  signatureHash?: string
}

export interface NotificationItem {
  id: string
  userId: string
  kind: 'submitted' | 'approved' | 'rejected' | 'returned' | 'escalated' | 'upcoming' | 'delegation' | 'policy' | 'handover'
  message: string
  time: string
  read: boolean
  channel?: 'in_system' | 'sms'
  privacySafe?: boolean
}

export interface Delegation {
  id: string
  delegatorId: string
  delegateId: string
  scope: string
  startDate: string
  endDate: string
  authorizedBy: string
  active: boolean
}

export interface AuditEntry {
  id: string
  entity: string
  entityId: string
  action: string
  actorId: string
  payload: string
  reason?: string
  prevHash: string
  hash: string
  at: string
}

export type CaseStatus = 'open' | 'on_hold' | 'closed'

export type HandoverStatus = 'pending' | 'accepted' | 'rejected'

export interface CaseRecord {
  id: string
  requestId: string
  ref: string
  employeeId: string
  leaveTypeId: string
  ownerId: string
  status: CaseStatus
  createdAt: string
  updatedAt?: string
  nextHearingDate?: string
  note?: string
}

export interface HandoverRecord {
  id: string
  caseId: string
  fromOwnerId: string
  toOwnerId: string
  reason: string
  status: HandoverStatus
  createdAt: string
  acceptedAt?: string
}

/**
 * Today's civil date (local Y-M-D). NOT a constant — it follows the clock,
 * so notice periods, SLA overdue checks, "today" markers and the calendar's
 * default month always reflect the real current date. Computed once per page
 * load, exactly as the previous pinned value was.
 */
export const TODAY = iso(new Date())

/**
 * The organisation tree is NOT seeded here — it is owned entirely by the
 * database and hydrated at runtime by `hydrateOrg()` from the leave context.
 * Screens therefore render only what the administrator has actually built
 * (zones, departments, positions, staff), never bundled demo rows.
 */
export const ZONES: Zone[] = []

export const DEPARTMENTS: Department[] = []

export const POSITIONS: Position[] = []

export const EMPLOYEES: Employee[] = []

export const LEAVE_TYPES: LeaveType[] = []

export const POLICIES: LeavePolicy[] = []

export const WORKFLOW_DEFS: WorkflowDef[] = []

/**
 * Hydrates the runtime store from the database-backed rows the leave context
 * has just fetched. Each array is swapped IN PLACE so that every existing
 * import keeps its reference identity — no view needs to change how it reads
 * `ZONES`, `EMPLOYEES`, `getEmployee(...)` and friends.
 *
 * Must be called synchronously BEFORE the matching `setState` in each loader:
 * deferring it to an effect leaves one permanently stale render, because
 * mutating a module array never re-renders the tree.
 *
 * Omitted collections are left untouched, so a loader that only refreshes
 * staff does not blank out leave types.
 */
export function hydrateOrg(data: {
  zones?: Zone[]
  departments?: Department[]
  positions?: Position[]
  employees?: Employee[]
  leaveTypes?: LeaveType[]
  policies?: LeavePolicy[]
  workflows?: WorkflowDef[]
}): void {
  const swap = <T>(arr: T[], rows?: T[]) => {
    if (rows === undefined) return
    arr.length = 0
    arr.push(...rows)
  }
  swap(ZONES, data.zones)
  swap(DEPARTMENTS, data.departments)
  swap(POSITIONS, data.positions)
  swap(EMPLOYEES, data.employees)
  swap(LEAVE_TYPES, data.leaveTypes)
  swap(POLICIES, data.policies)
  swap(WORKFLOW_DEFS, data.workflows)
}

export function iso(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function toDate(s: string): Date {
  const [y, m, d] = s.split('-').map(Number)
  const date = new Date(y, m - 1, d)
  return Number.isNaN(date.getTime()) ? toDate(TODAY) : date
}

export function addDays(s: string, n: number): string {
  const d = toDate(s)
  d.setDate(d.getDate() + n)
  return iso(d)
}

export function dayCount(a: string, b: string): number {
  const ms = toDate(b).getTime() - toDate(a).getTime()
  return Math.round(ms / 86400000) + 1
}

export function serviceYearStart(hireDate: string, now: string): string {
  const hire = toDate(hireDate)
  const today = toDate(now)
  let start = new Date(hire.getFullYear(), hire.getMonth(), hire.getDate())
  while (start <= today) {
    const next = new Date(start)
    next.setFullYear(next.getFullYear() + 1)
    if (next > today) break
    start = next
  }
  return iso(start)
}

function serviceYearEnd(hireDate: string, now: string): string {
  const d = toDate(serviceYearStart(hireDate, now))
  d.setFullYear(d.getFullYear() + 1)
  return iso(d)
}

function priorServiceYearUsed(empId: string, leaveTypeId: string, requests: LeaveRequest[], hireDate: string, now: string): number {
  const syStart = serviceYearStart(hireDate, now)
  const psy = new Date(toDate(syStart))
  psy.setFullYear(psy.getFullYear() - 1)
  const psyStart = iso(psy)
  return requests
    .filter(
      (r) =>
        r.employeeId === empId &&
        r.leaveTypeId === leaveTypeId &&
        (r.status === 'approved' || r.status === 'under_review') &&
        r.startDate >= psyStart &&
        r.endDate < syStart,
    )
    .reduce((s, r) => s + r.days, 0)
}

function accrualFraction(hireDate: string, maxDaysPerYear: number, now: string): number {
  const syS = toDate(serviceYearStart(hireDate, now))
  const syE = toDate(serviceYearEnd(hireDate, now))
  const nowD = toDate(now)
  const total = syE.getTime() - syS.getTime()
  if (total <= 0) return 0
  const elapsed = Math.max(0, Math.min(nowD.getTime() - syS.getTime(), total))
  return Math.floor(maxDaysPerYear * (elapsed / total))
}

function carryOverBank(empId: string, leaveTypeId: string, requests: LeaveRequest[], hireDate: string, now: string, maxDaysPerYear: number, carryOverMax: number, expiryMonth?: number): number {
  if (carryOverMax <= 0) return 0
  const used = priorServiceYearUsed(empId, leaveTypeId, requests, hireDate, now)
  const leftover = Math.max(0, maxDaysPerYear - used)
  const syStartYear = toDate(serviceYearStart(hireDate, now)).getFullYear()
  const expiryEnd = new Date(syStartYear, expiryMonth ?? 3, 0)
  if (toDate(now) > expiryEnd) return 0
  return Math.min(carryOverMax, leftover)
}

function pad(n: number): string {
  return String(n).padStart(2, '0')
}

export function fmt(s: string): string {
  const d = toDate(s)
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  return `${pad(d.getDate())} ${months[d.getMonth()]} ${d.getFullYear()}`
}

export function fmtShort(s: string): string {
  const d = toDate(s)
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  return `${pad(d.getDate())} ${months[d.getMonth()]}`
}

export function tenureMonths(hireDate: string): number {
  const h = toDate(hireDate)
  const t = toDate(TODAY)
  return (t.getFullYear() - h.getFullYear()) * 12 + (t.getMonth() - h.getMonth())
}

export function getEmployee(id: string): Employee {
  return EMPLOYEES.find((e) => e.id === id) as Employee
}

export function getPosition(id: string): Position {
  return POSITIONS.find((p) => p.id === id) as Position
}

export function getZone(id: string): Zone {
  return ZONES.find((z) => z.id === id) as Zone
}

export function getDept(id: string): Department {
  return DEPARTMENTS.find((d) => d.id === id) as Department
}

export function getLeaveType(id: string): LeaveType {
  return LEAVE_TYPES.find((t) => t.id === id) as LeaveType
}

export function getPolicy(leaveTypeId: string): LeavePolicy {
  return getPolicySafe(leaveTypeId) as LeavePolicy
}

export function getPolicySafe(leaveTypeId: string): LeavePolicy | undefined {
  const pool = POLICIES.filter((p) => p.leaveTypeId === leaveTypeId)
  const live = pool.find((p) => !p.effectiveTo)
  if (live) return live
  return pool.sort((a, b) => (b.effectiveFrom ?? '').localeCompare(a.effectiveFrom ?? ''))[0]
}

/**
 * The policy version in force on `date` for a leave type, or `undefined` when
 * the type has no version covering that date. Types and policies are both
 * database-owned now, so "no policy yet" is a normal state — not an error.
 */
export function policyEffectiveAt(leaveTypeId: string, date: string, pool?: LeavePolicy[]): LeavePolicy | undefined {
  const list = pool ?? POLICIES
  const covered = list.filter(
    (p) => p.leaveTypeId === leaveTypeId && p.effectiveFrom && p.effectiveFrom <= date && (!p.effectiveTo || p.effectiveTo >= date),
  )
  if (covered.length > 0) return covered.sort((a, b) => b.version - a.version)[0]
  const fallback = list.filter((p) => p.leaveTypeId === leaveTypeId && p.effectiveFrom && p.effectiveFrom <= date)
  return fallback.sort((a, b) => b.version - a.version)[0] ?? getPolicySafe(leaveTypeId)
}

export function getLeaveTypeSafe(id: string): LeaveType | undefined {
  return LEAVE_TYPES.find((t) => t.id === id)
}

export function getWorkflow(leaveTypeId: string): WorkflowDef | undefined {
  return getWorkflowSafe(leaveTypeId)
}

/**
 * The active workflow definition for a leave type. Workflow reads are
 * permission-gated server-side (`policies.view`), so a plain employee
 * legitimately has none loaded — callers must treat `undefined` as "not
 * visible to this session", never as an error.
 */
export function getWorkflowSafe(leaveTypeId: string): WorkflowDef | undefined {
  return WORKFLOW_DEFS.filter((w) => w.leaveTypeId === leaveTypeId && w.isActive !== false).sort(
    (a, b) => (b.version ?? 0) - (a.version ?? 0),
  )[0]
}

export const roleLabels: Record<ApproverRole, string> = {
  SUPERVISOR: 'Immediate Supervisor',
  DEPT_HEAD: 'Department Head',
  ZONAL_HEAD: 'Zone / Regional Head',
  HR: 'Human Resources',
  FINAL_AUTHORITY: 'Final Authority — DPP',
}

export function statusLabel(s: Status): string {
  const map: Record<Status, string> = {
    draft: 'Draft',
    submitted: 'Submitted',
    under_review: 'Under review',
    returned_for_correction: 'Returned for correction',
    approved: 'Approved',
    rejected: 'Rejected',
    withdrawn: 'Withdrawn',
    paused_pending_handover: 'Paused — handover pending',
  }
  return map[s]
}

export function statusSwahili(s: Status): string {
  const map: Record<Status, string> = {
    draft: 'Rasimu',
    submitted: 'Imependekezwa',
    under_review: 'Inasubiri',
    returned_for_correction: 'Imerejeshwa',
    approved: 'Imekubaliwa',
    rejected: 'Imekataliwa',
    withdrawn: 'Imeondolewa',
    paused_pending_handover: 'Imesitishwa',
  }
  return map[s]
}

export const STAFFING_MIN = 0.4

export function staffingCheck(zoneId: string, date: string, requests: LeaveRequest[]): number {
  const zoneStaff = EMPLOYEES.filter((e) => e.zoneId === zoneId)
  const away = requests.filter(
    (r) =>
      r.employeeId &&
      getEmployee(r.employeeId)?.zoneId === zoneId &&
      (r.status === 'approved' || r.status === 'under_review') &&
      r.startDate <= date &&
      r.endDate >= date,
  ).length
  const total = zoneStaff.length
  return total === 0 ? 0 : 1 - away / total
}

export function caseFor(requestId: string, cases: CaseRecord[]): CaseRecord | undefined {
  return cases.find((c) => c.requestId === requestId)
}

export function handoversFor(caseId: string, handovers: HandoverRecord[]): HandoverRecord[] {
  return handovers.filter((h) => h.caseId === caseId).sort((a, b) => a.createdAt.localeCompare(b.createdAt))
}

export function pendingHandoversFor(caseId: string, handovers: HandoverRecord[]): HandoverRecord[] {
  return handovers.filter((h) => h.caseId === caseId && h.status === 'pending')
}

export const HOLIDAYS: { date: string; name: string }[] = [
  { date: '2026-01-12', name: 'Zanzibar Revolution Day' },
  { date: '2026-01-20', name: 'Mwalimu Nyerere Day' },
  { date: '2026-04-01', name: 'Eid al-Fitr' },
  { date: '2026-04-26', name: 'Union Day' },
  { date: '2026-05-01', name: 'Labour Day' },
  { date: '2026-05-27', name: 'Eid al-Hajj' },
  { date: '2026-07-07', name: 'Saba Saba' },
  { date: '2026-08-08', name: 'Farmers’ Day (Nane Nane)' },
  { date: '2026-08-26', name: 'Maulid' },
  { date: '2026-10-14', name: 'Mwalimu Nyerere Day' },
  { date: '2026-12-09', name: 'Independence Day' },
]

export function holidaysOn(date: string): string | undefined {
  const h = HOLIDAYS.find((x) => x.date === date)
  return h?.name
}

export function balanceOf(empId: string, leaveTypeId: string, requests: LeaveRequest[], policiesPool?: LeavePolicy[]) {
  // The type, the employee and the policy all live in the database now, so any
  // of the three can legitimately be absent (an employee who left, a type that
  // was deleted, a leave type with no policy version on file). Report a
  // zeroed balance rather than throwing inside a render.
  const leave = getLeaveType(leaveTypeId)
  const emp = getEmployee(empId)
  const policy = policiesPool
    ? policiesPool.filter((p) => p.leaveTypeId === leaveTypeId).sort((a, b) => b.version - a.version)[0] ?? getPolicySafe(leaveTypeId)
    : getPolicySafe(leaveTypeId)
  const used = requests
    .filter(
      (r) => r.employeeId === empId && r.leaveTypeId === leaveTypeId && (r.status === 'approved' || r.status === 'under_review'),
    )
    .reduce((s, r) => s + r.days, 0)

  if (!leave || !emp || !policy) {
    return { accrued: 0, carryOver: 0, used, remaining: 0, pct: used === 0 ? 0 : 100 }
  }

  const statutoryCodes: Record<string, number> = { MATERNITY: 84, PATERNITY: 7 }
  const statutory = statutoryCodes[leave.code]
  if (statutory !== undefined) {
    const remaining = Math.max(0, statutory - used)
    const pct = statutory === 0 ? 0 : Math.round((used / statutory) * 100)
    return { accrued: statutory, carryOver: 0, used, remaining, pct }
  }

  const maxDays = policy.maxDaysPerYear
  const earned = accrualFraction(emp.hireDate, maxDays, TODAY)
  const carry = carryOverBank(empId, leaveTypeId, requests, emp.hireDate, TODAY, maxDays, policy.carryOverMax, policy.carryOverExpiryMonth)
  const accrued = earned + carry
  const remaining = Math.max(0, accrued - used)
  const pct = accrued === 0 ? 0 : Math.round((used / accrued) * 100)
  // Guard against any NaN from edge cases (invalid dates, division by zero, etc.)
  const safe = (n: number) => (Number.isFinite(n) ? n : 0)
  return { accrued: safe(accrued), carryOver: safe(carry), used: safe(used), remaining: safe(remaining), pct: safe(pct) }
}

export interface TipItem {
  icon: string
  tone: 'ok' | 'warn' | 'info' | 'danger'
  text: string
}

export function recommendationsFor(emp: Employee, leaveTypeId: string, requests: LeaveRequest[]): TipItem[] {
  const policy = getPolicySafe(leaveTypeId)
  const leave = getLeaveTypeSafe(leaveTypeId)
  const tips: TipItem[] = []
  const name = leave?.name ?? 'this leave type'

  // No policy on file for this type — nothing to advise against, and no
  // `policy.*` field may be read below.
  if (!policy) {
    tips.push({
      icon: 'alert',
      tone: 'warn',
      text: `No active policy is configured for ${name} yet. Leave administrators must publish one before applications can be assessed.`,
    })
    return tips
  }

  const bal = balanceOf(emp.id, leaveTypeId, requests)
  const tenure = tenureMonths(emp.hireDate)

  if (tenure < policy.minTenureMonths) {
    tips.push({
      icon: 'lock',
      tone: 'warn',
      text: `You need at least ${policy.minTenureMonths} months of service for ${name}. You currently have ${tenure}.`,
    })
  } else {
    const eligible = addDays(TODAY, policy.minNoticeDays)
    tips.push({
      icon: 'check',
      tone: 'ok',
      text: `You are eligible to apply for ${name} from ${fmtShort(eligible)}.`,
    })
  }

  if (bal.accrued > 0) {
    tips.push({
      icon: 'wallet',
      tone: 'info',
      text: `Your ${name} balance is ${bal.remaining} day${bal.remaining === 1 ? '' : 's'} (${bal.used} used of ${bal.accrued} — includes ${bal.carryOver} carried over).`,
    })
    if (bal.carryOver > 0) {
      const syStartYear = toDate(serviceYearStart(emp.hireDate, TODAY)).getFullYear()
      const expire = new Date(syStartYear, policy.carryOverExpiryMonth ?? 3, 0)
      tips.push({
        icon: 'alert',
        tone: 'warn',
        text: `${bal.carryOver} carried-over day${bal.carryOver === 1 ? '' : 's'} expire after ${fmtShort(iso(expire))}.`,
      })
    }
  } else {
    tips.push({
      icon: 'info',
      tone: 'info',
      text: `${name} does not accrue a standing balance; entitlement is assessed per approved request.`,
    })
  }

  for (const doc of policy.requiredDocs) {
    tips.push({
      icon: 'file',
      tone: 'warn',
      text: `A ${doc.toLowerCase()} is required for this ${name.toLowerCase()} request.`,
    })
  }

  // Workflow definitions are permission-gated (policies.view), so a plain
  // employee legitimately cannot read them — show the routing tip only when
  // the definition is actually visible to this session.
  const wf = getWorkflowSafe(leaveTypeId)
  if (wf) {
    const roles = wf.steps.map((s) => roleLabels[s.role])
    tips.push({
      icon: 'users',
      tone: 'info',
      text: `Your request requires: ${roles.join(' → ')}.`,
    })
  }

  if (policy.minNoticeDays > 0) {
    tips.push({
      icon: 'clock',
      tone: 'info',
      text: `Minimum notice period is ${policy.minNoticeDays} days. Submit before ${fmtShort(addDays(TODAY, policy.minNoticeDays))}.`,
    })
  }

  const overlap = requests.find(
    (r) =>
      (r.status === 'approved' || r.status === 'under_review') &&
      r.startDate >= addDays(TODAY, policy.minNoticeDays) &&
      r.startDate <= addDays(TODAY, policy.minNoticeDays + 120),
  )
  if (overlap) {
    tips.push({
      icon: 'alert',
      tone: 'danger',
      text: `Your requested dates overlap with an approved request (${getLeaveTypeSafe(overlap.leaveTypeId)?.short ?? 'a pending request'} from ${fmtShort(overlap.startDate)}).`,
    })
  }

  tips.push({
    icon: 'shield',
    tone: 'info',
    text: 'Your request may affect minimum staffing for your department. Supervisors review coverage before recommending.',
  })

  return tips
}

export function computeAvailableDays(emp: Employee, leaveTypeId: string, requests: LeaveRequest[]): string[] {
  const tips = recommendationsFor(emp, leaveTypeId, requests)
  return tips.filter((t) => t.tone === 'ok' || t.tone === 'warn').map((t) => t.text)
}

export const STATUS_STYLE: Record<Status, string> = {
  draft: 'bg-zinc-100 text-zinc-600 border-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:border-zinc-700',
  submitted: 'bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950 dark:text-sky-300 dark:border-sky-900',
  under_review:
    'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-900',
  returned_for_correction:
    'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950 dark:text-orange-300 dark:border-orange-900',
  approved: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-900',
  rejected: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950 dark:text-rose-300 dark:border-rose-900',
  withdrawn: 'bg-zinc-100 text-zinc-500 border-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:border-zinc-700',
  paused_pending_handover:
    'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950 dark:text-purple-300 dark:border-purple-900',
}

export const CASE_STATUS_STYLE: Record<CaseStatus, string> = {
  open: 'bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-950 dark:text-teal-300 dark:border-teal-900',
  on_hold: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-900',
  closed: 'bg-zinc-100 text-zinc-600 border-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:border-zinc-700',
}

export const HANDOVER_STATUS_STYLE: Record<HandoverStatus, string> = {
  pending: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-900',
  accepted: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-900',
  rejected: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950 dark:text-rose-300 dark:border-rose-900',
}
