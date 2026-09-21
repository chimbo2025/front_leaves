'use client'

import * as React from 'react'
import { toast } from 'sonner'
import {
  getEmployee,
  getLeaveTypeSafe,
  policyEffectiveAt,
  TODAY,
  dayCount,
  fmtShort,
  statusLabel,
  caseFor,
  balanceOf,
  EMPLOYEE_ROLES,
  roleLabels,
  POSITIONS,
  getPosition,
  type Status,
  type Employee,
  type LeaveRequest,
  type LeaveType,
  type LeavePolicy,
  type WorkflowDef,
  type ApproverRole,
  type ApprovalStep,
  type StepStatus,
  type NotificationItem,
  type Delegation,
  type AuditEntry,
  type CaseRecord,
  type HandoverRecord,
  type Document,
} from '@/lib/leave'
import {
  leaveApi,
  ApiError,
  type EmployeeDto,
  type RequestDto,
  type RequestCompact,
  type WorkflowAssignmentRaw,
  type RequestAssignment,
  type ChainItem,
  type NotificationDto,
  type CaseDto,
  type HandoverDto,
  type AuditDto,
  type LeaveTypeDto,
  type PolicyCompactDto,
  type WorkflowDefDto,
  type EligibilityDto,
  type OrgEligibility,
  type PositionDto,
} from '@/lib/leave-api'
import { useAuth } from '@/lib/auth'

interface NewRequestInput {
  employeeId: string
  leaveTypeId: string
  startDate: string
  endDate: string
  reason: string
  documentName?: string
  isHalfDay?: boolean
  emergency?: boolean
  emergencyReason?: string
}

export interface CreateLeaveTypeInput {
  code: string
  name: string
  swahili: string
  short: string
  paid: boolean
  description: string
  color: string
  maxDaysPerYear: number
  maxDaysPerRequest: number
  minTenureMonths: number
  minNoticeDays: number
  requiresDocuments: boolean
  requiredDocs: string
  carryOverMax: number
  carryOverExpiryMonth?: number
  allowHalfDay: boolean
  notes: string
  steps: { role: ApproverRole; slaDays: number; note: string }[]
}

export type EmployeeRow = Employee & { active: boolean; userId: string; payrollNo: string; roleIds: string[] }

export interface RegisterEmployeeInput {
  full_name: string
  initials?: string
  payrollNo?: string | null
  position_id: string
  department_id: string
  zone_id: string
  gender?: 'M' | 'F'
  email?: string | null
  hire_date: string
  username: string
  password: string
  role_ids?: string[]
  supervisor_employee_id?: string
}

export interface PermissionCodeMeta {
  code: string
  module: string
  label: string
  hint: string
}

export interface CustomZoneConfig {
  id: string
  name: string
  short: string
  isHQ?: boolean
  isPemba?: boolean
  isCoordination?: boolean
}

export interface CustomDeptConfig {
  id: string
  name: string
  zoneId: string
}

export interface CustomRoleConfig {
  id: string
  label: string
  description: string
}

export const ROLE_PERMISSION_MODULES = ['requests', 'policies', 'documents', 'delegations', 'reports', 'admin']
export const ROLE_PERMISSION_ACTIONS = ['view', 'create', 'update', 'delete', 'approve', 'export']

export const ROLE_PERMISSION_CODE_META: { code: string; module: string; label: string; hint: string }[] = [
  { code: 'approve_zone', module: 'requests', label: 'approve_zone', hint: 'Approve leave for staff outside your own zone (regional oversight).' },
  { code: 'view_medical_documents', module: 'documents', label: 'view_medical_documents', hint: 'Reveal restricted medical & birth records (HR privacy gate).' },
  { code: 'edit_policy', module: 'policies', label: 'edit_policy', hint: 'Revise leave-type policies and approval workflows.' },
  { code: 'view_gender_reports', module: 'reports', label: 'view_gender_reports', hint: 'Unlock gender-split reporting (restricted personnel data).' },
]

const SEED_ROLE_PERMISSIONS: Record<string, Record<string, string[]>> = {
  SUPERVISOR: {
    requests: ['view', 'create', 'update', 'approve'],
    policies: ['view'],
    documents: ['view'],
    reports: ['view'],
  },
  DEPT_HEAD: { requests: ['view', 'approve', 'return', 'reject', 'export'], reports: ['view'] },
  ZONAL_HEAD: { requests: ['view', 'approve', 'return', 'reject', 'export', 'approve_zone'], reports: ['view'] },
  HR: {
    requests: ['view', 'create', 'update', 'delete', 'return', 'approve', 'export', 'approve_zone'],
    policies: ['view', 'create', 'update', 'delete', 'edit_policy'],
    documents: ['view', 'create', 'delete', 'view_medical_documents'],
    delegations: ['view', 'create', 'update'],
    reports: ['view', 'export', 'view_gender_reports'],
    admin: ['view', 'create', 'update'],
  },
  FINAL_AUTHORITY: { requests: ['view', 'approve', 'reject'], reports: ['view', 'export', 'view_gender_reports'] },
}

interface LeaveContextValue {
  employeeId: string
  employee: Employee
  employees: EmployeeRow[]
  positions: PositionDto[]
  positionTitle: (id: string) => string
  createPosition: (input: { title: string; departmentId: string; zoneId?: string; tier?: number; isFinalAuthority?: boolean; defaultRoleIds?: string[] }) => Promise<boolean>
  updatePosition: (id: string, patch: { title?: string; departmentId?: string; zoneId?: string | null; tier?: number; isFinalAuthority?: boolean; defaultRoleIds?: string[] }) => Promise<boolean>
  deletePosition: (id: string) => Promise<boolean>
  supervisorMode: boolean
  setEmployee: (id: string) => void
  toggleSupervisor: () => void
  requests: LeaveRequest[]
  notifications: NotificationItem[]
  delegations: Delegation[]
  audit: AuditEntry[]
  cases: CaseRecord[]
  handovers: HandoverRecord[]
  caseOf: (requestId: string) => CaseRecord | undefined
  policies: LeavePolicy[]
  leaveTypes: LeaveType[]
  workflowDefs: WorkflowDef[]
  rolePermissions: Record<string, Record<string, string[]>>
  roleNames: Record<string, string>
  permissionModules: string[]
  permissionActions: string[]
  permissionCodes: PermissionCodeMeta[]
  validPermissionCodes: string[]
  can: (module: string, code: string) => boolean
  pendingApprovals: LeaveRequest[]
  activeRequests: LeaveRequest[]
  typeOf: (id: string) => LeaveType | undefined
  balanceFor: (empId: string, leaveTypeId: string) => { accrued: number; carryOver: number; used: number; remaining: number; pct: number }
  eligibility: EligibilityDto[]
  orgEligibility: OrgEligibility | null
  submitRequest: (input: NewRequestInput) => LeaveRequest
  updateRequest: (requestId: string, patch: Partial<Pick<LeaveRequest, 'startDate' | 'endDate' | 'reason' | 'isHalfDay'>>) => void
  decide: (requestId: string, stepOrder: number, decision: 'approved' | 'rejected' | 'returned', comments: string, endDate?: string) => void
  resubmit: (requestId: string, documentName?: string) => void
  withdrawRequest: (requestId: string, reason?: string) => void
  createDelegation: (input: { delegatorId: string; delegateId: string; scope: string; startDate: string; endDate: string }) => void
  revokeDelegation: (id: string) => void
  setDelegationActive: (id: string, active: boolean) => void
  recordHandover: (caseId: string, input: { fromOwnerId?: string; toOwnerId: string; reason: string }) => void
  acceptHandover: (handoverId: string) => void
  rejectHandover: (handoverId: string, reason?: string) => void
  closeCase: (caseId: string, reason?: string) => void
  markAllRead: () => void
  markRead: (id: string) => void
  updatePolicy: (policyId: string, patch: Partial<LeavePolicy>) => void
  addDocument: (requestId: string, name: string, type: string, restricted: boolean, size?: string) => void
  deleteDocument: (requestId: string, docId: string) => void
  updateEmployee: (
    employeeId: string,
    patch: Partial<Pick<Employee, 'title' | 'email' | 'gender' | 'hireDate'>> &
      { payrollNo?: string; positionId?: string; departmentId?: string; zoneId?: string; roleIds?: string[] },
  ) => void
  toggleEmployeeActive: (employeeId: string) => void
  registerEmployee: (input: RegisterEmployeeInput) => Promise<Employee | null>
  createLeaveType: (input: CreateLeaveTypeInput) => void
  updateLeaveType: (leaveTypeId: string, patch: Partial<Pick<LeaveType, 'name' | 'swahili' | 'short' | 'description' | 'color' | 'paid'>>) => void
  updateWorkflow: (leaveTypeId: string, steps: { role: ApproverRole; slaDays: number; note: string }[]) => void
  saveRolePermissions: (next: Record<string, Record<string, string[]>>) => void
  customZones: CustomZoneConfig[]
  customDepartments: CustomDeptConfig[]
  customRoles: CustomRoleConfig[]
  customRoleAssignments: Record<string, string[]>
  addZone: (input: Omit<CustomZoneConfig, 'id'>) => void
  removeZone: (id: string) => void
  addDepartment: (input: Omit<CustomDeptConfig, 'id'>) => void
  removeDepartment: (id: string) => void
  createRole: (input: { label: string; description: string }) => void
  updateRole: (roleId: string, patch: Partial<Pick<CustomRoleConfig, 'label' | 'description'>>) => void
  deleteRole: (roleId: string) => void
  assignCustomRole: (employeeId: string, roleId: string, on: boolean) => void
  resetData: () => void
}

const LeaveContext = React.createContext<LeaveContextValue | null>(null)

function day(s?: string | null): string {
  return s && s.length >= 10 ? s.slice(0, 10) : ''
}

async function safe<T>(p: Promise<T>): Promise<T | undefined> {
  try {
    return await p
  } catch (err) {
    toast.error(err instanceof ApiError ? err.message : 'Unexpected error — is the backend running?')
    return undefined
  }
}

// ---------------------------------------------------------------------------
// Backend → view adapters
// ---------------------------------------------------------------------------

function stepStatus(s: 'pending' | 'done' | 'skipped'): StepStatus {
  if (s === 'done') return 'approved'
  if (s === 'skipped') return 'skipped'
  return 'pending'
}

function stepsFromRaw(a: WorkflowAssignmentRaw[], orderBase: number, slaByRole: Record<string, number>): ApprovalStep[] {
  return a.map((x, i) => {
    const role = (x.assigned_role_id as ApproverRole) ?? 'SUPERVISOR'
    return {
      order: orderBase + i,
      role,
      roleLabel: roleLabels[role] ?? x.assigned_role_id,
      assigneeId: x.assigned_employee_id ?? '',
      assigneeName: x.assignee?.full_name ?? '',
      via: 'standing',
      slaDays: slaByRole[x.assigned_role_id] ?? 2,
      dueAt: day(x.due_at),
      status: stepStatus(x.status ?? 'pending'),
      actedAt: x.decided_at ? day(x.decided_at) : undefined,
    }
  })
}

function stepsFromCompact(a: RequestAssignment[], chain: ChainItem[] | undefined, slaByRole: Record<string, number>): ApprovalStep[] {
  const items: ChainItem[] = chain && chain.length ? chain : []
  if (items.length === 0) {
    return a.map((x, i) => {
      const role = (x.role as ApproverRole) ?? 'SUPERVISOR'
      return {
        order: i + 1,
        role,
        roleLabel: roleLabels[role] ?? x.role,
        assigneeId: x.assignee_id ?? '',
        assigneeName: x.assignee_name ?? '',
        via: 'standing',
        slaDays: slaByRole[x.role] ?? 2,
        dueAt: day(x.due_at),
        status: stepStatus(x.status ?? 'pending'),
        actedAt: day(x.decided_at) || undefined,
      }
    })
  }
  return items.map((ci, i) => {
    const x = a[i]
    return {
      order: i + 1,
      role: (ci.role as ApproverRole) ?? 'SUPERVISOR',
      roleLabel: ci.role_label ?? ci.role,
      assigneeId: ci.assignee_id ?? '',
      assigneeName: ci.assignee_name ?? '',
      via: ci.via ?? 'standing',
      slaDays: ci.sla_days,
      dueAt: day(ci.due_at ?? x?.due_at),
      status: x ? stepStatus(x.status ?? 'pending') : 'pending',
      actedAt: day(x?.decided_at) || undefined,
    }
  })
}

function requestFromRaw(d: RequestDto, slaByRole: Record<string, number>): LeaveRequest {
  return {
    id: String(d.id),
    ref: d.ref,
    employeeId: d.employee_id ?? '',
    leaveTypeId: d.leave_type_id,
    policyId: d.policy_id ?? '',
    startDate: day(d.start_date),
    endDate: day(d.end_date),
    days: d.days ?? 0,
    isHalfDay: d.is_half_day,
    emergency: d.is_emergency_exception,
    emergencyReason: d.exception_reason ?? undefined,
    reason: d.reason ?? '',
    status: d.status as Status,
    createdAt: day(d.created_at) || TODAY,
    submittedAt: day(d.submitted_at) || undefined,
    decidedAt: day(d.decided_at) || undefined,
    documents: [],
    steps: stepsFromRaw(d.assignments ?? [], 1, slaByRole),
  }
}

function requestFromResource(prev: LeaveRequest | null, r: RequestCompact, chain?: ChainItem[] | null, slaByRole?: Record<string, number>): LeaveRequest {
  const steps = stepsFromCompact(r.assignments ?? [], chain ?? undefined, slaByRole ?? {})
  return {
    ...(prev ?? {}),
    id: String(r.id),
    ref: r.ref,
    employeeId: r.employee_id ?? prev?.employeeId ?? '',
    leaveTypeId: r.leave_type_id,
    policyId: r.policy_id ?? prev?.policyId ?? '',
    startDate: day(r.start_date) || prev?.startDate || TODAY,
    endDate: day(r.end_date) || prev?.endDate || '',
    days: r.days ?? 0,
    isHalfDay: r.is_half_day,
    emergency: r.is_emergency_exception,
    emergencyReason: r.exception_reason ?? prev?.emergencyReason,
    reason: r.reason ?? prev?.reason ?? '',
    status: r.status as Status,
    createdAt: prev?.createdAt ?? TODAY,
    submittedAt: day(r.submitted_at) || prev?.submittedAt,
    decidedAt: day(r.decided_at) || prev?.decidedAt,
    documents: prev?.documents ?? [],
    steps,
  }
}

const GRADIENTS = [
  'from-teal-600 to-cyan-600',
  'from-emerald-600 to-teal-600',
  'from-cyan-600 to-sky-600',
  'from-teal-500 to-emerald-500',
  'from-sky-600 to-teal-600',
  'from-emerald-500 to-teal-500',
  'from-teal-700 to-emerald-700',
  'from-cyan-500 to-teal-600',
]

function employeeRow(j: EmployeeDto): EmployeeRow {
  const hash = j.id.split('').reduce((n, c) => (n * 31 + c.charCodeAt(0)) >>> 0, 3)
  return {
    id: j.id,
    userId: j.user_id ?? '',
    roleIds: j.role_ids ?? [],
    payrollNo: j.payroll_no ?? '',
    name: j.full_name,
    title: j.position?.title ?? j.position_id ?? '',
    initials: j.initials,
    positionId: j.position_id ?? '',
    departmentId: j.department_id ?? '',
    zoneId: j.zone_id ?? '',
    gender: j.gender,
    hireDate: j.hire_date ?? '',
    email: j.email ?? '',
    gradient: GRADIENTS[hash % GRADIENTS.length],
    active: j.is_active,
  }
}

const TYPE_COLORS: Record<string, { color: string; soft: string }> = {
  ANNUAL: {
    color: 'bg-emerald-500',
    soft: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-900',
  },
  SICK: {
    color: 'bg-sky-500',
    soft: 'bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950 dark:text-sky-300 dark:border-sky-900',
  },
  MATERNITY: {
    color: 'bg-rose-500',
    soft: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950 dark:text-rose-300 dark:border-rose-900',
  },
  PATERNITY: {
    color: 'bg-violet-500',
    soft: 'bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-950 dark:text-violet-300 dark:border-violet-900',
  },
  UNPAID: {
    color: 'bg-amber-500',
    soft: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-900',
  },
  STUDY: {
    color: 'bg-fuchsia-500',
    soft: 'bg-fuchsia-50 text-fuchsia-700 border-fuchsia-200 dark:bg-fuchsia-950 dark:text-fuchsia-300 dark:border-fuchsia-900',
  },
  COMPASSIONATE: {
    color: 'bg-indigo-500',
    soft: 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950 dark:text-indigo-300 dark:border-indigo-900',
  },
}

const FALLBACK_SOFT =
  'bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-950 dark:text-teal-300 dark:border-teal-900'

function toLeaveType(t: LeaveTypeDto): LeaveType {
  const themed = TYPE_COLORS[t.code] ?? {
    color: 'bg-teal-500',
    soft: FALLBACK_SOFT,
  }
  return {
    id: t.id,
    code: t.code,
    name: t.name,
    swahili: t.swahili ?? t.name,
    short: t.short ?? t.code,
    paid: t.is_paid_default,
    description: t.description ?? '',
    color: themed.color,
    soft: themed.soft,
  }
}

function toPolicy(p: PolicyCompactDto): LeavePolicy {
  return {
    id: p.id,
    leaveTypeId: p.leave_type_id,
    version: p.version,
    maxDaysPerYear: p.max_days_per_year ?? 30,
    maxDaysPerRequest: p.max_days_per_request ?? 30,
    minTenureMonths: p.min_tenure_months,
    minNoticeDays: p.min_notice_days,
    requiresDocuments: p.requires_documents,
    requiredDocs: p.required_docs.length ? p.required_docs : ['Supporting document'],
    carryOverMax: p.carry_over_max,
    carryOverExpiryMonth: 3,
    allowHalfDay: p.allow_half_day,
    notes: '',
    effectiveFrom: day(p.effective_from) || undefined,
    effectiveTo: day(p.effective_to) || undefined,
  }
}

function toWorkflowDef(w: WorkflowDefDto): WorkflowDef {
  return {
    id: w.id,
    leaveTypeId: w.leave_type_id,
    steps: (w.steps ?? []).map((s) => ({
      role: (s.role_required as ApproverRole) ?? 'SUPERVISOR',
      slaDays: s.sla_days,
      note: s.note ?? '',
    })),
  }
}

function toDelegation(d: { id: string; delegator_employee_id: string; delegate_employee_id: string; role_id: string; start_date: string; end_date: string; authorized_by: string; active: boolean }): Delegation {
  return {
    id: d.id,
    delegatorId: d.delegator_employee_id,
    delegateId: d.delegate_employee_id,
    scope: d.role_id,
    startDate: day(d.start_date) || TODAY,
    endDate: day(d.end_date) || TODAY,
    authorizedBy: d.authorized_by,
    active: d.active,
  }
}

const NOTIFICATION_KINDS: Record<string, NotificationItem['kind']> = {
  'request.submitted': 'submitted',
  'request.approved': 'approved',
  'request.rejected': 'rejected',
  'request.returned': 'returned',
  'request.resubmitted': 'submitted',
  'deadline_upcoming': 'upcoming',
  handover: 'handover',
  delegation: 'delegation',
  policy: 'policy',
}

function toNotification(n: NotificationDto): NotificationItem {
  return {
    id: String(n.id),
    userId: n.recipient_employee_id,
    kind: NOTIFICATION_KINDS[n.event_type] ?? 'policy',
    message: n.message,
    time: day(n.sent_at) || TODAY,
    read: n.read_at != null,
    channel: n.channel === 'sms' ? 'sms' : 'in_system',
    privacySafe: n.is_privacy_safe,
  }
}

function toAudit(a: AuditDto): AuditEntry {
  return {
    id: String(a.id),
    entity: a.entity_type,
    entityId: a.entity_id,
    action: a.action,
    actorId: a.actor?.employee?.id ?? a.actor_user_id ?? '',
    payload: typeof a.payload === 'string' ? a.payload : JSON.stringify(a.payload ?? {}),
    reason: a.reason ?? undefined,
    prevHash: a.prev_hash ?? 'GENESIS',
    hash: a.row_hash,
    at: (a.created_at ?? '').replace('T', ' ').slice(0, 16) || TODAY,
  }
}

function toCase(c: CaseDto, requests: LeaveRequest[]): CaseRecord {
  const req = c.request_id != null ? requests.find((r) => r.id === String(c.request_id)) : undefined
  return {
    id: String(c.id),
    requestId: c.request_id != null ? String(c.request_id) : '',
    ref: c.ref,
    employeeId: req?.employeeId ?? '',
    leaveTypeId: req?.leaveTypeId ?? '',
    ownerId: c.owner_id ?? c.assigned_prosecutor_id ?? '',
    status: c.status === 'closed' ? 'closed' : 'open',
    createdAt: '',
    nextHearingDate: c.next_hearing_date ? day(c.next_hearing_date) : undefined,
    note: c.note ?? undefined,
  }
}

function toHandover(h: HandoverDto): HandoverRecord {
  return {
    id: String(h.id),
    caseId: String(h.case_id),
    fromOwnerId: h.from_employee_id,
    toOwnerId: h.to_employee_id,
    reason: h.notes ?? '',
    status: h.status === 'rejected' ? 'rejected' : h.status === 'proposed' ? 'pending' : 'accepted',
    createdAt: day(h.proposed_at) || TODAY,
    acceptedAt: day(h.responded_at) || undefined,
  }
}

function slaMap(defs: WorkflowDef[]): Record<string, number> {
  const out: Record<string, number> = {}
  for (const d of defs) for (const s of d.steps) out[s.role] = s.slaDays
  return out
}

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

export function LeaveProvider({ children }: { children: React.ReactNode }) {
  const { user, token, status } = useAuth()

  const [employeeId, setEmployeeId] = React.useState<string>(user?.employee?.id ?? 'e7')
  const [supervisorMode, setSupervisorMode] = React.useState<boolean>(false)
  const [loading, setLoading] = React.useState<boolean>(true)
  const [mounted, setMounted] = React.useState<boolean>(false)

  React.useEffect(() => {
    setMounted(true)
  }, [])

  const [employees, setEmployees] = React.useState<EmployeeRow[]>([])
  const [positions, setPositions] = React.useState<PositionDto[]>([])
  const [requests, setRequests] = React.useState<LeaveRequest[]>([])
  const [notifications, setNotifications] = React.useState<NotificationItem[]>([])
  const [delegations, setDelegations] = React.useState<Delegation[]>([])
  const [audit, setAudit] = React.useState<AuditEntry[]>([])
  const [cases, setCases] = React.useState<CaseRecord[]>([])
  const [handovers, setHandovers] = React.useState<HandoverRecord[]>([])
  const [policies, setPolicies] = React.useState<LeavePolicy[]>([])
  const [leaveTypes, setLeaveTypes] = React.useState<LeaveType[]>([])
  const [workflowDefs, setWorkflowDefs] = React.useState<WorkflowDef[]>([])
  const [rolePermissions, setRolePermissions] = React.useState<Record<string, Record<string, string[]>>>(() =>
    JSON.parse(JSON.stringify(SEED_ROLE_PERMISSIONS)),
  )
  const [roleNames, setRoleNames] = React.useState<Record<string, string>>({})
  const [permissionModules, setPermissionModules] = React.useState<string[]>(ROLE_PERMISSION_MODULES)
  const [permissionActions, setPermissionActions] = React.useState<string[]>(ROLE_PERMISSION_ACTIONS)
  const [permissionCodes, setPermissionCodes] = React.useState<PermissionCodeMeta[]>(ROLE_PERMISSION_CODE_META)
  const [validPermissionCodes, setValidPermissionCodes] = React.useState<string[]>(() => {
    const codes = new Set<string>()
    for (const role of Object.values(SEED_ROLE_PERMISSIONS)) {
      for (const [module, actions] of Object.entries(role)) {
        for (const a of actions) codes.add(`${module}.${a}`)
      }
    }
    return [...codes]
  })
  const [customZones, setCustomZones] = React.useState<CustomZoneConfig[]>([])
  const [customDepartments, setCustomDepartments] = React.useState<CustomDeptConfig[]>([])
  const [customRoles, setCustomRoles] = React.useState<CustomRoleConfig[]>([])
  const [customRoleAssignments, setCustomRoleAssignments] = React.useState<Record<string, string[]>>({})
  const [eligibility, setEligibility] = React.useState<EligibilityDto[]>([])
  const [orgEligibility, setOrgEligibility] = React.useState<OrgEligibility | null>(null)

  const requestsRef = React.useRef<LeaveRequest[]>([])
  React.useEffect(() => {
    requestsRef.current = requests
  }, [requests])

  const wfRef = React.useRef<WorkflowDef[]>([])
  React.useEffect(() => {
    wfRef.current = workflowDefs
  }, [workflowDefs])

  // -------------------------------------------------------------------------
  // Loaders
  // -------------------------------------------------------------------------

  const loadEmployees = React.useCallback(async () => {
    const res = await safe(leaveApi.org.employees())
    if (res) setEmployees(res.data.map(employeeRow))
  }, [])

  const loadPositions = React.useCallback(async () => {
    const res = await safe(leaveApi.org.positions())
    if (res && res.data.length > 0) setPositions(res.data)
  }, [])

  const loadLeaveTypes = React.useCallback(async () => {
    const res = await safe(leaveApi.leave.types())
    if (res) setLeaveTypes(res.data.map(toLeaveType))
  }, [])

  const loadPolicies = React.useCallback(async () => {
    const res = await safe(leaveApi.leave.currentPolicies())
    if (res) setPolicies(res.data.map(toPolicy))
  }, [])

  const loadWorkflows = React.useCallback(async () => {
    const res = await safe(leaveApi.workflows.list())
    if (res) setWorkflowDefs(res.data.map(toWorkflowDef))
  }, [])

  const loadRequests = React.useCallback(async () => {
    const res = await safe(leaveApi.requests.list({ scope: 'all', per_page: 500 }))
    if (res) setRequests((res.data.data ?? []).map((d) => requestFromRaw(d, slaMap(wfRef.current))))
  }, [])

  const loadNotifications = React.useCallback(async () => {
    const res = await safe(leaveApi.notifications.list({ per_page: 200 }))
    if (res) setNotifications((res.data.data ?? []).map(toNotification))
  }, [])

  const loadDelegations = React.useCallback(async () => {
    const res = await safe(leaveApi.delegations.list())
    if (res) setDelegations(res.data.map((d) => toDelegation(d)))
  }, [])

  const loadCases = React.useCallback(async () => {
    const res = await safe(leaveApi.cases.list())
    if (res) setCases(res.data.map((c) => toCase(c, requestsRef.current)))
  }, [])

  const loadHandovers = React.useCallback(async () => {
    const inFlight = requestsRef.current
      .filter((r) => ['submitted', 'under_review', 'returned_for_correction', 'paused_pending_handover'].includes(r.status))
      .slice(0, 40)
    const settled = await Promise.allSettled(inFlight.map((r) => leaveApi.handovers.list(r.id)))
    const all: HandoverRecord[] = []
    for (const s of settled) {
      if (s.status !== 'fulfilled') continue
      if (Array.isArray(s.value.data)) all.push(...s.value.data.map(toHandover))
    }
    setHandovers(all)
  }, [])

  const loadAudit = React.useCallback(async () => {
    const res = await safe(leaveApi.audit.list({ per_page: 200 }))
    if (res) setAudit((res.data.data ?? []).map(toAudit))
  }, [])

  const loadEligibility = React.useCallback(async () => {
    const res = await safe(leaveApi.eligibility.my())
    if (res) {
      setEligibility(res.data ?? [])
      setOrgEligibility(res.org ?? null)
    }
  }, [])

  // Permission matrix + catalog are read from the backend; the static
  // SEED_ROLE_PERMISSIONS / module constants are only a fallback.
  const loadRolesAndPermissions = React.useCallback(async () => {
    const [rolesRes, catRes] = await Promise.all([safe(leaveApi.roles.list()), safe(leaveApi.roles.permissions())])

    if (rolesRes && rolesRes.data.length > 0 && rolesRes.data.some((r) => (r.permissions ?? []).length > 0)) {
      const matrix: Record<string, Record<string, string[]>> = {}
      for (const role of rolesRes.data) {
        const byModule: Record<string, string[]> = {}
        for (const p of role.permissions ?? []) (byModule[p.module] ??= []).push(p.action)
        matrix[role.id] = byModule
      }
      setRolePermissions(matrix)
    } else {
      setRolePermissions(JSON.parse(JSON.stringify(SEED_ROLE_PERMISSIONS)))
    }

    if (rolesRes?.data) {
      setRoleNames(Object.fromEntries(rolesRes.data.map((r) => [r.id, r.name])))
    }

    if (catRes?.data && catRes.data.length > 0) {
      const granular = new Set(['approve_zone', 'view_medical_documents', 'edit_policy', 'view_gender_reports'])
      const order = ['view', 'create', 'update', 'delete', 'approve', 'return', 'reject', 'export']
      const seen = new Set<string>()
      const actions = catRes.data
        .filter((p) => !granular.has(p.action))
        .filter((p) => (seen.has(p.action) ? false : (seen.add(p.action), true)))
        .map((p) => p.action)
        .sort((a, b) => order.indexOf(a) - order.indexOf(b))
      setPermissionActions(actions)
      setPermissionModules([...new Set(catRes.data.map((p) => p.module))].sort())
      setPermissionCodes(
        catRes.data
          .filter((p) => granular.has(p.action))
          .map((p) => ({ code: p.action, module: p.module, label: p.label ?? p.action, hint: p.hint ?? p.action })),
      )
      setValidPermissionCodes(catRes.data.map((p) => `${p.module}.${p.action}`))
    }
  }, [])

  const refreshAfterWrite = React.useCallback(() => {
    loadRequests()
    loadNotifications()
    loadCases()
    loadDelegations()
    loadEligibility()
  }, [loadRequests, loadNotifications, loadCases, loadDelegations, loadEligibility])

  const refreshWithHandovers = React.useCallback(() => {
    loadRequests()
    loadNotifications()
    loadCases()
    loadHandovers()
  }, [loadRequests, loadNotifications, loadCases, loadHandovers])

  // Boot when authenticated
  React.useEffect(() => {
    if (status !== 'authenticated') {
      setLoading(true)
      setRequests([])
      setNotifications([])
      setDelegations([])
      setAudit([])
      setCases([])
      setHandovers([])
      setPolicies([])
      setLeaveTypes([])
      setWorkflowDefs([])
      setEmployees([])
      setEligibility([])
      setOrgEligibility(null)
      setRolePermissions(JSON.parse(JSON.stringify(SEED_ROLE_PERMISSIONS)))
      setRoleNames({})
      setPermissionModules(ROLE_PERMISSION_MODULES)
      setPermissionActions(ROLE_PERMISSION_ACTIONS)
      setPermissionCodes(ROLE_PERMISSION_CODE_META)
      setValidPermissionCodes(() => {
        const codes = new Set<string>()
        for (const role of Object.values(SEED_ROLE_PERMISSIONS)) {
          for (const [module, actions] of Object.entries(role)) {
            for (const a of actions) codes.add(`${module}.${a}`)
          }
        }
        return [...codes]
      })
      return
    }
    let cancelled = false
    setLoading(true)
    setEmployeeId(user?.employee?.id ?? 'e7')
    const fire = async () => {
      await Promise.allSettled([
        loadEmployees(),
        loadLeaveTypes(),
        loadPolicies(),
        loadWorkflows(),
        loadPositions(),
        loadRequests(),
        loadNotifications(),
        loadDelegations(),
        loadCases(),
        loadAudit(),
        loadRolesAndPermissions(),
        loadEligibility(),
      ])
      await loadHandovers()
      if (!cancelled) setLoading(false)
    }
    void fire()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, status, user?.employee?.id])

  // -------------------------------------------------------------------------
  // Derived / helpers
  // -------------------------------------------------------------------------

  const isApproverRole = (r: string): r is ApproverRole =>
    r === 'SUPERVISOR' || r === 'DEPT_HEAD' || r === 'ZONAL_HEAD' || r === 'HR' || r === 'FINAL_AUTHORITY'

  const rolesOf = React.useCallback(
    (empId: string): ApproverRole[] => {
      if (token && user?.employee?.id === empId) {
        const fromAuth = (user?.roles ?? []).map((r) => r.role_id).filter(isApproverRole)
        if (fromAuth.length) return fromAuth
      }
      const row = employees.find((e) => e.id === empId)
      if (row && row.roleIds.length) return row.roleIds.filter(isApproverRole)
      return EMPLOYEE_ROLES[empId] ?? []
    },
    [token, user, employees],
  )

  const can = React.useCallback(
    (module: string, code: string): boolean => {
      const roles: ApproverRole[] = supervisorMode ? ['HR'] : rolesOf(employeeId)
      const effective: string[] = [...roles, ...(customRoleAssignments[employeeId] ?? [])]
      return effective.some((r) => (rolePermissions[r]?.[module] ?? []).includes(code))
    },
    [supervisorMode, employeeId, rolesOf, rolePermissions, customRoleAssignments],
  )

  const employee = React.useMemo<Employee>(() => {
    const found = employees.find((e) => e.id === employeeId)
    if (found) return found
    const mock = getEmployee(employeeId)
    return { ...mock, gradient: mock.gradient }
  }, [employees, employeeId])

  const typeOf = React.useCallback(
    (id: string) => leaveTypes.find((t) => t.id === id) ?? getLeaveTypeSafe(id),
    [leaveTypes],
  )

  const pendingApprovals = requests.filter(
    (r) =>
      (r.status === 'submitted' || r.status === 'under_review' || r.status === 'returned_for_correction') &&
      r.steps.some((s) => s.status === 'pending'),
  )

  const activeRequests = requests.filter((r) => r.status === 'approved' || r.status === 'under_review')

  const balanceFor = React.useCallback(
    (empId: string, leaveTypeId: string) => {
      const b = balanceOf(empId, leaveTypeId, requests, policies)
      return { accrued: b.accrued, carryOver: b.carryOver, used: b.used, remaining: b.remaining, pct: b.pct }
    },
    [requests, policies],
  )

  // -------------------------------------------------------------------------
  // Write operations → backend
  // -------------------------------------------------------------------------

  const EDITABLE_STATUSES = ['draft', 'submitted', 'under_review', 'returned_for_correction']

  const submitRequest = React.useCallback(
    (input: NewRequestInput): LeaveRequest => {
      const days = input.endDate ? (input.isHalfDay ? 0.5 : dayCount(input.startDate, input.endDate)) : 0
      const policy = policyEffectiveAt(input.leaveTypeId, TODAY, policies)
      if (!policy) {
        toast.error('No policy is configured for this leave type.')
        throw new Error('missing policy')
      }
      const now = new Date().toISOString()
      const optimistic: LeaveRequest = {
        id: `tmp_${now}`,
        ref: '…',
        employeeId: input.employeeId,
        leaveTypeId: input.leaveTypeId,
        policyId: policy.id,
        startDate: input.startDate,
        endDate: input.endDate,
        days,
        isHalfDay: input.isHalfDay,
        emergency: input.emergency,
        emergencyReason: input.emergencyReason,
        reason: input.reason,
        status: 'submitted',
        createdAt: TODAY,
        submittedAt: TODAY,
        documents: [],
        steps: [
          {
            order: 1,
            role: 'SUPERVISOR',
            roleLabel: roleLabels.SUPERVISOR,
            assigneeId: input.employeeId,
            assigneeName: getEmployee(input.employeeId).name,
            via: 'standing',
            slaDays: 2,
            dueAt: TODAY,
            status: 'pending',
          },
        ],
      }

      void (async () => {
        const created = await safe(
          leaveApi.requests.create({
            leave_type_id: input.leaveTypeId,
            start_date: input.startDate,
            end_date: input.endDate || null,
            is_half_day: input.isHalfDay,
            reason: input.reason || null,
            is_emergency_exception: input.emergency,
            exception_reason: input.emergency ? input.emergencyReason ?? '' : null,
          }),
        )
        if (!created) return
        const submitted = await safe(leaveApi.requests.submit(created.data.id))
        refreshAfterWrite()
        if (!submitted) return
        const typeName = typeOf(input.leaveTypeId)?.name ?? input.leaveTypeId
        toast.success(`${submitted.data.ref} submitted. Return date will be set at approval.`)
      })()

      return optimistic
    },
    [policies, typeOf, refreshAfterWrite],
  )

  const updateRequest = React.useCallback(
    (requestId: string, patch: Partial<Pick<LeaveRequest, 'startDate' | 'endDate' | 'reason' | 'isHalfDay'>>) => {
      const req = requests.find((r) => r.id === requestId)
      if (!req) return
      if (!EDITABLE_STATUSES.includes(req.status)) {
        toast.error('Completed requests are locked in the audit trail.')
        return
      }
      void safe(
        leaveApi.requests
          .update(requestId, {
            leave_type_id: req.leaveTypeId,
            start_date: patch.startDate ?? req.startDate,
            end_date: patch.endDate ?? (req.endDate || null),
            is_half_day: patch.isHalfDay,
            reason: patch.reason ?? (req.reason || null),
          })
          .then((res) => {
            const merged = requestFromResource(req, res.data)
            setRequests((prev) => prev.map((r) => (r.id === String(res.data.id) ? merged : r)))
            toast.success(`${merged.ref} updated.`)
          }),
      )
    },
    [requests],
  )

  const decide = React.useCallback(
    (requestId: string, stepOrder: number, decision: 'approved' | 'rejected' | 'returned', comments: string, endDate?: string) => {
      const req = requests.find((r) => r.id === requestId)
      if (!req) return
      void (async () => {
        const res = await safe(leaveApi.requests.decide(requestId, { decision, comments, end_date: endDate || null }))
        if (!res) {
          refreshAfterWrite()
          return
        }
        const merged = requestFromResource(req, res.data)
        setRequests((prev) => prev.map((r) => (r.id === String(res.data.id) ? merged : r)))
        refreshWithHandovers()
        if (res.blocked_by_handover) {
          toast.error(res.message)
          return
        }
        const tone = merged.status === 'approved' ? 'success' : merged.status === 'rejected' ? 'error' : merged.status === 'returned_for_correction' ? 'warning' : 'info'
        toast[tone](`${merged.ref} → ${statusLabel(merged.status)}`)
      })()
    },
    [requests, refreshAfterWrite, refreshWithHandovers],
  )

  const resubmit = React.useCallback(
    (requestId: string) => {
      const req = requests.find((r) => r.id === requestId)
      if (!req) return
      void (async () => {
        const res = await safe(leaveApi.requests.resubmit(requestId))
        if (!res) {
          refreshAfterWrite()
          return
        }
        const merged = requestFromResource(req, res.data, res.workflow, slaMap(wfRef.current))
        setRequests((prev) => prev.map((r) => (r.id === String(res.data.id) ? merged : r)))
        refreshWithHandovers()
        toast.success(`${merged.ref} resubmitted for continued approval.`)
      })()
    },
    [requests, refreshAfterWrite, refreshWithHandovers],
  )

  const withdrawRequest = React.useCallback(
    (requestId: string, reason?: string) => {
      const req = requests.find((r) => r.id === requestId)
      if (!req) return
      if (!EDITABLE_STATUSES.includes(req.status)) return
      void (async () => {
        const res = await safe(leaveApi.requests.withdraw(requestId, { reason: reason ?? undefined }))
        refreshWithHandovers()
        if (res) toast.success(`${res.data.ref} withdrawn. Approval chain closed.`)
      })()
    },
    [requests, refreshWithHandovers],
  )

  const createDelegation = React.useCallback(
    (input: { delegatorId: string; delegateId: string; scope: string; startDate: string; endDate: string }) => {
      void (async () => {
        const res = await safe(
          leaveApi.delegations.store({
            delegate_employee_id: input.delegateId,
            role_id: input.scope,
            start_date: input.startDate,
            end_date: input.endDate,
          }),
        )
        refreshAfterWrite()
        if (res) {
          const name = getEmployee(input.delegateId).name
          toast.success(`Delegation created for ${name}. Original authority preserved in audit history.`)
        }
      })()
    },
    [refreshAfterWrite],
  )

  const setDelegationActive = React.useCallback(
    (id: string, active: boolean) => {
      const del = delegations.find((d) => d.id === id)
      if (!del) return
      void (async () => {
        if (active) {
          await safe(
            leaveApi.delegations.store({
              delegate_employee_id: del.delegateId,
              role_id: del.scope,
              start_date: del.startDate,
              end_date: del.endDate,
            }),
          )
        } else {
          await safe(leaveApi.delegations.revoke(id))
        }
        refreshAfterWrite()
        toast.info(active ? 'Delegation re-activated.' : 'Delegation revoked.')
      })()
    },
    [delegations, refreshAfterWrite],
  )

  const revokeDelegation = React.useCallback((id: string) => setDelegationActive(id, false), [setDelegationActive])

  const recordHandover = React.useCallback(
    (caseId: string, input: { fromOwnerId?: string; toOwnerId: string; reason: string }) => {
      const c = cases.find((x) => x.id === caseId)
      if (!c) {
        toast.error('Case not found.')
        return
      }
      if (c.status === 'closed') {
        toast.error('Closed cases cannot be handed over.')
        return
      }
      if (!c.requestId) {
        toast.error('Only dockets attached to a leave request can be handed over.')
        return
      }
      void (async () => {
        const res = await safe(
          leaveApi.handovers.propose(c.requestId, {
            to_employee_id: input.toOwnerId,
            case_ids: [Number(caseId)],
          }),
        )
        refreshWithHandovers()
        if (res) {
          const to = getEmployee(input.toOwnerId)
          toast.success(`Handover recorded. ${to.name.split(' ')[0]} must accept before deciding.`)
        }
      })()
    },
    [cases, refreshWithHandovers],
  )

  const acceptHandover = React.useCallback(
    (handoverId: string) => {
      void (async () => {
        const res = await safe(leaveApi.handovers.accept(Number(handoverId)))
        refreshWithHandovers()
        if (res) {
          const to = getEmployee(res.data.to_employee_id)
          toast.success(`Docket accepted. ${to.name.split(' ')[0]} can now decide.`)
        }
      })()
    },
    [refreshWithHandovers],
  )

  const rejectHandover = React.useCallback(
    (handoverId: string, reason?: string) => {
      void (async () => {
        const res = await safe(leaveApi.handovers.reject(Number(handoverId), reason ?? undefined))
        refreshWithHandovers()
        if (res) toast.info(res.data.status === 'rejected' ? 'Handover declined. The request is paused until a new owner accepts.' : 'Handover updated.')
      })()
    },
    [refreshWithHandovers],
  )

  const closeCase = React.useCallback(
    (caseId: string, reason?: string) => {
      const c = cases.find((x) => x.id === caseId)
      if (!c) return
      setCases((prev) =>
        prev.map((x) => (x.id === caseId ? { ...x, status: 'closed' as const, note: reason || x.note } : x)),
      )
      toast.info(`${c.ref} case closed.`)
    },
    [cases],
  )

  const markAllRead = React.useCallback(() => {
    const unread = notifications.filter((n) => !n.read).slice(0, 50)
    void Promise.allSettled(unread.map((n) => leaveApi.notifications.markRead(Number(n.id)))).then(() => {
      loadNotifications()
    })
  }, [notifications, loadNotifications])

  const markRead = React.useCallback(
    (id: string) => {
      void safe(leaveApi.notifications.markRead(Number(id)).then(() => loadNotifications()))
    },
    [loadNotifications],
  )

  const updatePolicy = React.useCallback(
    (policyId: string, patch: Partial<LeavePolicy>) => {
      const existing = policies.find((p) => p.id === policyId)
      if (!existing) return
      void (async () => {
        const res = await safe(
          leaveApi.policies.store({
            leave_type_id: existing.leaveTypeId,
            max_days_per_year: patch.maxDaysPerYear ?? existing.maxDaysPerYear,
            max_days_per_request: patch.maxDaysPerRequest ?? existing.maxDaysPerRequest,
            min_tenure_months: patch.minTenureMonths ?? existing.minTenureMonths,
            min_notice_days: patch.minNoticeDays ?? existing.minNoticeDays,
            requires_documents: patch.requiresDocuments ?? existing.requiresDocuments,
            required_docs: patch.requiredDocs ?? existing.requiredDocs,
            carry_over_max: patch.carryOverMax ?? existing.carryOverMax,
            allow_half_day: patch.allowHalfDay ?? existing.allowHalfDay,
            effective_from: TODAY,
            notes: patch.notes ?? (existing.notes || null),
          }),
        )
        await safe(loadPolicies())
        const typeName = typeOf(existing.leaveTypeId)?.name ?? existing.leaveTypeId
        if (res) toast.success(`${typeName} policy updated to v${res.data.version}. Previous version preserved.`)
      })()
    },
    [policies, typeOf, loadPolicies],
  )

  const addDocument = React.useCallback(
    (requestId: string, name: string, type: string, restricted: boolean, size?: string) => {
      const doc: Document = {
        id: `doc_${Date.now()}`,
        name,
        type,
        uploadedBy: employeeId,
        uploadedByLabel: employee.name,
        restricted,
        size: size || '180 KB',
        uploadedAt: TODAY,
      }
      setRequests((prev) => prev.map((r) => (r.id === requestId ? { ...r, documents: [...r.documents, doc] } : r)))
      toast.success('Document secured and recorded.')
    },
    [employeeId, employee.name],
  )

  const deleteDocument = React.useCallback((requestId: string, docId: string) => {
    setRequests((prev) =>
      prev.map((r) => (r.id === requestId ? { ...r, documents: r.documents.filter((d) => d.id !== docId) } : r)),
    )
    toast.info('Document removed. Action recorded in audit.')
  }, [])

  const updateEmployee = React.useCallback(
    (id: string, patch: Partial<Pick<Employee, 'title' | 'email' | 'gender' | 'hireDate'>> & { payrollNo?: string; positionId?: string; departmentId?: string; zoneId?: string; roleIds?: string[]; password?: string }) => {
      const target = employees.find((e) => e.id === id)
      if (!target) return
      void (async () => {
        const body: { email?: string; payroll_no?: string; position_id?: string; department_id?: string; zone_id?: string; gender?: 'M' | 'F'; hire_date?: string; role_ids?: string[]; password?: string } = {}
        if (patch.email !== undefined) body.email = patch.email
        if (patch.payrollNo !== undefined) body.payroll_no = patch.payrollNo
        if (patch.positionId !== undefined) body.position_id = patch.positionId
        if (patch.departmentId !== undefined) body.department_id = patch.departmentId
        if (patch.zoneId !== undefined) body.zone_id = patch.zoneId
        if (patch.gender !== undefined) body.gender = patch.gender
        if (patch.hireDate !== undefined) body.hire_date = patch.hireDate
        if (patch.roleIds !== undefined) body.role_ids = patch.roleIds
        if (patch.password !== undefined) body.password = patch.password
        if (Object.keys(body).length) await safe(leaveApi.org.updateEmployee(id, body))
        await safe(loadEmployees())
        const name = target.name
        if (patch.title) toast.info(`${name} title cannot be edited via the API — update the position instead.`)
        else toast.success('Staff profile updated.')
      })()
    },
    [employees, loadEmployees],
  )

  const toggleEmployeeActive = React.useCallback(
    (id: string) => {
      const target = employees.find((e) => e.id === id)
      if (!target) return
      const nextActive = !target.active
      void (async () => {
        const res = await safe(leaveApi.org.updateEmployee(id, { is_active: nextActive }))
        await safe(loadEmployees())
        toast.info(`${target.name} ${res ? 'activated' : 'update failed'}.`)
      })()
    },
    [employees, loadEmployees],
  )

  const SOFT_BY_COLOR: Record<string, string> = {
    'bg-emerald-500':
      'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-900',
    'bg-sky-500':
      'bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950 dark:text-sky-300 dark:border-sky-900',
    'bg-rose-500':
      'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950 dark:text-rose-300 dark:border-rose-900',
    'bg-violet-500':
      'bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-950 dark:text-violet-300 dark:border-violet-900',
    'bg-amber-500':
      'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-900',
    'bg-fuchsia-500':
      'bg-fuchsia-50 text-fuchsia-700 border-fuchsia-200 dark:bg-fuchsia-950 dark:text-fuchsia-300 dark:border-fuchsia-900',
    'bg-slate-500':
      'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700',
    'bg-teal-500':
      'bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-950 dark:text-teal-300 dark:border-teal-900',
    'bg-indigo-500':
      'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950 dark:text-indigo-300 dark:border-indigo-900',
    'bg-orange-500':
      'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950 dark:text-orange-300 dark:border-orange-900',
  }

  const createLeaveType = React.useCallback(
    (input: CreateLeaveTypeInput) => {
      const code = input.code.trim().toUpperCase().replace(/\s+/g, '_')
      void (async () => {
        const lt = await safe(
          leaveApi.leave.storeType({
            code,
            name: input.name.trim(),
            swahili: input.swahili.trim() || undefined,
            short: input.short.trim() || undefined,
            is_paid_default: input.paid,
            description: input.description.trim() || undefined,
          }),
        )
        if (!lt) return
        const leaveTypeId = lt.data.id
        await safe(
          leaveApi.policies.store({
            leave_type_id: leaveTypeId,
            max_days_per_year: input.maxDaysPerYear,
            max_days_per_request: input.maxDaysPerRequest,
            min_tenure_months: input.minTenureMonths,
            min_notice_days: input.minNoticeDays,
            requires_documents: input.requiresDocuments,
            required_docs: input.requiredDocs
              .split(',')
              .map((s) => s.trim())
              .filter(Boolean),
            carry_over_max: input.carryOverMax,
            allow_half_day: input.allowHalfDay,
            effective_from: TODAY,
            notes: input.notes || 'New leave type.',
          }),
        )
        await safe(
          leaveApi.workflows.store({
            leave_type_id: leaveTypeId,
            steps: input.steps.length
              ? input.steps.map((s) => ({ role_required: s.role, sla_days: s.slaDays, note: s.note }))
              : [
                  { role_required: 'SUPERVISOR', sla_days: 2, note: 'Verifies coverage.' },
                  { role_required: 'HR', sla_days: 3, note: 'Verifies compliance.' },
                ],
          }),
        )
        await Promise.allSettled([loadLeaveTypes(), loadPolicies(), loadWorkflows()])
        toast.success(`${input.name.trim()} created. Policy v1 and approval workflow are live.`)
      })()
    },
    [loadLeaveTypes, loadPolicies, loadWorkflows],
  )

  const updateLeaveType = React.useCallback(
    (leaveTypeId: string, patch: Partial<Pick<LeaveType, 'name' | 'swahili' | 'short' | 'description' | 'color' | 'paid'>>) => {
      const existing = leaveTypes.find((t) => t.id === leaveTypeId)
      if (!existing) return
      void safe(
        leaveApi.leave
          .updateType(leaveTypeId, {
            code: existing.code,
            name: patch.name ?? existing.name,
            swahili: patch.swahili ?? existing.swahili,
            short: patch.short ?? existing.short,
            is_paid_default: patch.paid ?? existing.paid,
            description: patch.description ?? existing.description,
          })
          .then(() => {
            loadLeaveTypes()
            toast.success(`${existing.name} type updated.`)
          }),
      )
    },
    [leaveTypes, loadLeaveTypes],
  )

  const updateWorkflow = React.useCallback(
    (leaveTypeId: string, steps: { role: ApproverRole; slaDays: number; note: string }[]) => {
      const existing = workflowDefs.find((w) => w.leaveTypeId === leaveTypeId)
      const typeName = typeOf(leaveTypeId)?.name ?? leaveTypeId
      void (async () => {
        if (existing) {
          await safe(
            leaveApi.workflows.update(existing.id, {
              steps: steps.map((s) => ({ role_required: s.role, sla_days: s.slaDays, note: s.note })),
            }),
          )
        } else {
          await safe(
            leaveApi.workflows.store({
              leave_type_id: leaveTypeId,
              steps: steps.map((s) => ({ role_required: s.role, sla_days: s.slaDays, note: s.note })),
            }),
          )
        }
        await safe(loadWorkflows())
        toast.success(`${typeName} workflow updated. New requests use this chain.`)
      })()
    },
    [workflowDefs, typeOf, loadWorkflows],
  )

  const saveRolePermissions = React.useCallback(
    (next: Record<string, Record<string, string[]>>) => {
      const changed = Object.keys(next).filter((roleId) => {
        const before = JSON.stringify(rolePermissions[roleId] ?? [])
        const after = JSON.stringify(next[roleId] ?? [])
        return before !== after
      })
      if (changed.length === 0) {
        setRolePermissions(next)
        toast.success('Role permissions already up to date.')
        return
      }
      void (async () => {
        let ok = true
        for (const roleId of changed) {
          const codes = Object.entries(next[roleId] ?? {})
            .flatMap(([module, actions]) => actions.map((a) => `${module}.${a}`))
            .filter((c) => validPermissionCodes.includes(c))
          try {
            try {
              await leaveApi.roles.update(roleId, { permissions: codes })
            } catch (err) {
              if (!(err instanceof ApiError && err.status === 404)) throw err
              const name =
                customRoles.find((r) => r.id === roleId)?.label ??
                roleId.replace(/^role_/, '').replace(/_/g, ' ').trim()
              await leaveApi.roles.store({ id: roleId, name, permissions: codes })
            }
          } catch (err) {
            ok = false
            toast.error(err instanceof ApiError ? err.message : `Failed to save permissions for ${roleId}.`)
          }
        }
        if (ok) {
          setRolePermissions(next)
          await safe(loadRolesAndPermissions())
          toast.success('Role permissions saved and enforced by the backend.')
        } else {
          toast.error('Some role updates failed — permissions unchanged.')
        }
      })()
    },
    [rolePermissions, loadRolesAndPermissions, validPermissionCodes, customRoles],
  )

  const registerEmployee = React.useCallback(
    async (input: RegisterEmployeeInput): Promise<Employee | null> => {
      const res = await safe(
        leaveApi.org.createEmployee({
          full_name: input.full_name,
          initials: input.initials,
          payroll_no: input.payrollNo ?? null,
          position_id: input.position_id,
          department_id: input.department_id,
          zone_id: input.zone_id,
          gender: input.gender,
          email: input.email ?? null,
          hire_date: input.hire_date,
          username: input.username,
          password: input.password,
          role_ids: input.role_ids,
          supervisor_employee_id: input.supervisor_employee_id,
        }),
      )
      if (!res) return null
      await safe(loadEmployees())
      toast.success(`${res.data.full_name} registered.`)
      return employeeRow(res.data)
    },
    [loadEmployees],
  )

  const addZone = React.useCallback((input: Omit<CustomZoneConfig, 'id'>) => {
    const id = `z_c_${Date.now().toString(36)}`
    setCustomZones((prev) => [...prev, { ...input, id }])
    toast.success(`Zone "${input.name}" created.`)
  }, [])

  const removeZone = React.useCallback((id: string) => {
    setCustomZones((prev) => prev.filter((z) => z.id !== id))
    setCustomDepartments((prev) => prev.filter((d) => d.zoneId !== id))
    toast.info(`Zone ${id} removed.`)
  }, [])

  const addDepartment = React.useCallback((input: Omit<CustomDeptConfig, 'id'>) => {
    const id = `d_c_${Date.now().toString(36)}`
    setCustomDepartments((prev) => [...prev, { ...input, id }])
    toast.success(`Department "${input.name}" created.`)
  }, [])

  const removeDepartment = React.useCallback((id: string) => {
    setCustomDepartments((prev) => prev.filter((d) => d.id !== id))
    toast.info(`Department ${id} removed.`)
  }, [])

  const createRole = React.useCallback((input: { label: string; description: string }) => {
    const label = input.label.trim()
    const id = `role_${label.toLowerCase().replace(/[^a-z0-9]+/g, '_')}_${Date.now().toString(36)}`
    setCustomRoles((prev) => [...prev, { id, label, description: input.description.trim() }])
    setRolePermissions((prev) => ({ ...prev, [id]: {} }))
    toast.success(`Role "${label}" created. Grant permissions in the matrix and assign holders.`)
  }, [])

  const updateRole = React.useCallback((roleId: string, patch: Partial<Pick<CustomRoleConfig, 'label' | 'description'>>) => {
    setCustomRoles((prev) => prev.map((r) => (r.id === roleId ? { ...r, ...patch } : r)))
    toast.success('Role updated.')
  }, [])

  const deleteRole = React.useCallback((roleId: string) => {
    setCustomRoles((prev) => prev.filter((r) => r.id !== roleId))
    setRolePermissions((prev) => {
      const next = { ...prev }
      delete next[roleId]
      return next
    })
    setCustomRoleAssignments((prev) =>
      Object.fromEntries(Object.entries(prev).map(([eid, roles]) => [eid, roles.filter((r) => r !== roleId)])),
    )
    toast.info(`Role ${roleId} removed.`)
  }, [])

  const assignCustomRole = React.useCallback((empId: string, roleId: string, on: boolean) => {
    setCustomRoleAssignments((prev) => {
      const cur = prev[empId] ?? []
      const next = on ? (cur.includes(roleId) ? cur : [...cur, roleId]) : cur.filter((r) => r !== roleId)
      return { ...prev, [empId]: next }
    })
    const empName = getEmployee(empId).name
    toast.success(`${on ? 'Assigned' : 'Removed'} role — ${empName}.`)
  }, [])

  const positionTitle = React.useCallback(
    (id: string) => positions.find((p) => p.id === id)?.title ?? getPosition(id).title,
    [positions],
  )

  const createPosition = React.useCallback(
    async (input: { title: string; departmentId: string; zoneId?: string; tier?: number; isFinalAuthority?: boolean; defaultRoleIds?: string[] }) => {
      const res = await safe(
        leaveApi.org.storePosition({
          title: input.title.trim(),
          department_id: input.departmentId,
          zone_id: input.zoneId ?? null,
          tier: input.tier ?? 1,
          is_final_authority: input.isFinalAuthority ?? false,
          default_role_ids: input.defaultRoleIds,
        }),
      )
      if (res) {
        setPositions((prev) => [...prev, res.data])
        await safe(loadPositions())
        toast.success(`Position "${res.data.title}" created.`)
        return true
      }
      return false
    },
    [],
  )

  const updatePosition = React.useCallback(
    async (id: string, patch: { title?: string; departmentId?: string; zoneId?: string | null; tier?: number; isFinalAuthority?: boolean; defaultRoleIds?: string[] }) => {
      const res = await safe(
        leaveApi.org.updatePosition(id, {
          title: patch.title?.trim(),
          department_id: patch.departmentId,
          zone_id: patch.zoneId,
          tier: patch.tier,
          is_final_authority: patch.isFinalAuthority,
          default_role_ids: patch.defaultRoleIds,
        }),
      )
      if (res) {
        await safe(loadPositions())
        await safe(loadEmployees())
        toast.success('Position updated.')
        return true
      }
      return false
    },
    [],
  )

  const deletePosition = React.useCallback(async (id: string) => {
    const res = await safe(leaveApi.org.deletePosition(id))
    if (res) {
      setPositions((prev) => prev.filter((p) => p.id !== id))
      toast.success('Position deleted.')
      return true
    }
    return false
  }, [])

  const resetData = React.useCallback(() => {
    setCustomZones([])
    setCustomDepartments([])
    setCustomRoles([])
    setCustomRoleAssignments({})
    setRolePermissions(JSON.parse(JSON.stringify(SEED_ROLE_PERMISSIONS)))
    refreshAfterWrite()
    toast.info('Demo data reset to backend state.')
  }, [refreshAfterWrite])

  if (mounted && loading && status === 'authenticated') {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-3 bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-teal-600 border-t-transparent" />
        <p className="text-sm text-muted-foreground">Loading your leave workspace…</p>
      </div>
    )
  }

  return (
    <LeaveContext.Provider
      value={{
        employeeId,
        employee,
        employees,
        positions,
        positionTitle,
        createPosition,
        updatePosition,
        deletePosition,
        supervisorMode,
        setEmployee: setEmployeeId,
        toggleSupervisor: () => setSupervisorMode((v) => !v),
        requests,
        notifications,
        delegations,
        audit,
        cases,
        handovers,
        caseOf: (requestId: string) => caseFor(requestId, cases),
        policies,
        leaveTypes,
        workflowDefs,
        rolePermissions,
        roleNames,
        permissionModules,
        permissionActions,
        permissionCodes,
        validPermissionCodes,
        can,
        pendingApprovals,
        activeRequests,
        typeOf,
        balanceFor,
        eligibility,
        orgEligibility,
        submitRequest,
        updateRequest,
        decide,
        resubmit,
        withdrawRequest,
        createDelegation,
        revokeDelegation,
        setDelegationActive,
        recordHandover,
        acceptHandover,
        rejectHandover,
        closeCase,
        markAllRead,
        markRead,
        updatePolicy,
        addDocument,
        deleteDocument,
        updateEmployee,
        toggleEmployeeActive,
        registerEmployee,
        createLeaveType,
        updateLeaveType,
        updateWorkflow,
        saveRolePermissions,
        customZones,
        customDepartments,
        customRoles,
        customRoleAssignments,
        addZone,
        removeZone,
        addDepartment,
        removeDepartment,
        createRole,
        updateRole,
        deleteRole,
        assignCustomRole,
        resetData,
      }}
    >
      {children}
    </LeaveContext.Provider>
  )
}

export function useLeave(): LeaveContextValue {
  const ctx = React.useContext(LeaveContext)
  if (!ctx) throw new Error('useLeave must be used within LeaveProvider')
  return ctx
}