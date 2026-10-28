'use client'

import * as React from 'react'
import { toast } from 'sonner'
import {
  getEmployee,
  getLeaveTypeSafe,
  policyEffectiveAt,
  hydrateOrg,
  TODAY,
  dayCount,
  fmtShort,
  statusLabel,
  caseFor,
  balanceOf,
  roleLabels,
  getPosition,
  type Zone,
  type Department,
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
  type ZoneDto,
  type DepartmentDto,
  type AuthAccess,
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

export type EmployeeRow = Employee & {
  active: boolean
  userId: string
  payrollNo: string
  roleIds: string[]
  scopedGrants: Array<{ roleId: string; departmentId?: string | null; zoneId?: string | null }>
}

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
  parentId?: string
  unitType?: string
}

export interface CustomRoleConfig {
  id: string
  label: string
  description: string
}

export const ROLE_PERMISSION_MODULES = ['requests', 'policies', 'documents', 'delegations', 'reports', 'staff', 'admin']
export const ROLE_PERMISSION_ACTIONS = ['view', 'create', 'update', 'delete', 'approve']

export const ROLE_PERMISSION_CODE_META: { code: string; module: string; label: string; hint: string }[] = [
  { code: 'view_cross_zone', module: 'requests', label: 'view_cross_zone', hint: 'Read leave requests in every zone, not only the scoped ones (central offices only).' },
  { code: 'view_cross_zone', module: 'staff', label: 'view_cross_zone', hint: 'Read the staff directory in every zone, not only the scoped one.' },
  { code: 'view_cross_zone', module: 'reports', label: 'view_cross_zone', hint: 'Produce organisation-wide report aggregates instead of zone/department scoped ones.' },
  { code: 'approve_zone', module: 'requests', label: 'approve_zone', hint: 'Approve leave for staff outside your own zone (regional oversight).' },
  { code: 'view_medical_documents', module: 'documents', label: 'view_medical_documents', hint: 'Reveal restricted medical & birth records (HR privacy gate).' },
  { code: 'edit_policy', module: 'policies', label: 'edit_policy', hint: 'Revise leave-type policies and approval workflows.' },
  { code: 'view_gender_reports', module: 'reports', label: 'view_gender_reports', hint: 'Unlock gender-split reporting (restricted personnel data).' },
]

/**
 * Fallback matrix, used only when /api/roles returns nothing. Mirrors
 * DatabaseSeeder::seedPermissions(). Codes with no enforcement point are
 * deliberately absent - see migration 2026_10_03_120000.
 */
const SEED_ROLE_PERMISSIONS: Record<string, Record<string, string[]>> = {
  SUPERVISOR: {
    requests: ['view', 'create', 'approve', 'view_own', 'edit_own', 'submit', 'withdraw', 'reject', 'return'],
    policies: ['view'],
    documents: ['view'],
    staff: ['view_own'],
    reports: ['view'],
    approval_workflows: ['view'],
    case_handovers: ['view', 'create', 'accept', 'reject', 'complete'],
  },
  DEPT_HEAD: {
    requests: ['view', 'approve', 'view_own', 'edit_own', 'submit', 'withdraw', 'reject', 'return'],
    staff: ['view_own'],
    reports: ['view'],
    approval_workflows: ['view'],
    case_handovers: ['view', 'create', 'accept', 'reject', 'complete'],
  },
  ZONAL_HEAD: {
    requests: ['view', 'approve', 'approve_zone', 'view_own', 'edit_own', 'submit', 'withdraw', 'reject', 'return'],
    staff: ['view_own'],
    reports: ['view'],
    approval_workflows: ['view'],
    case_handovers: ['view', 'create', 'accept', 'reject', 'complete'],
  },
  HR: {
    requests: ['view', 'create', 'approve', 'approve_zone', 'view_cross_zone', 'view_own', 'edit_own', 'submit', 'withdraw', 'reject', 'return'],
    policies: ['view', 'edit_policy'],
    documents: ['view', 'create', 'view_medical_documents'],
    delegations: ['view', 'create', 'update'],
    reports: ['view', 'view_gender_reports', 'view_cross_zone'],
    staff: ['view_cross_zone', 'view_own'],
    admin: ['view', 'create', 'update', 'delete'],
    approval_workflows: ['view', 'create', 'update'],
    case_handovers: ['view', 'create', 'accept', 'reject', 'complete'],
  },
  FINAL_AUTHORITY: {
    requests: ['view', 'approve', 'view_cross_zone', 'view_own', 'edit_own', 'submit', 'withdraw', 'reject', 'return'],
    reports: ['view', 'view_gender_reports', 'view_cross_zone'],
    staff: ['view_cross_zone', 'view_own'],
    approval_workflows: ['view'],
    case_handovers: ['view', 'create', 'accept', 'reject', 'complete'],
  },
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
  access: AuthAccess | null
  setEmployee: (id: string) => void
  canViewEmployee: (employeeId: string) => boolean
  rolesOf: (employeeId: string) => ApproverRole[]
  requests: LeaveRequest[]
  notifications: NotificationItem[]
  delegations: Delegation[]
  audit: AuditEntry[]
  cases: CaseRecord[]
  handovers: HandoverRecord[]
  caseOf: (requestId: string) => CaseRecord | undefined
  policies: LeavePolicy[]
  leaveTypes: LeaveType[]
  /**
   * Resolved id of the ANNUAL leave type (by code). Views that need the annual
   * entitlement must use this rather than a hardcoded `'lt1'`, which belonged
   * to the old bundled catalogue.
   */
  annualTypeId: string
  workflowDefs: WorkflowDef[]
  rolePermissions: Record<string, Record<string, string[]>>
  roleNames: Record<string, string>
  /** Backend `roles.description` per role id — the scopes tab renders these. */
  roleDescriptions: Record<string, string>
  permissionModules: string[]
  permissionActions: string[]
  permissionCodes: PermissionCodeMeta[]
  validPermissionCodes: string[]
  can: (module: string, code: string) => boolean
  hasPerm: (code: string) => boolean
  pendingApprovals: LeaveRequest[]
  activeRequests: LeaveRequest[]
  typeOf: (id: string) => LeaveType | undefined
  balanceFor: (empId: string, leaveTypeId: string) => { accrued: number; carryOver: number; used: number; remaining: number; pct: number }
  eligibility: EligibilityDto[]
  orgEligibility: OrgEligibility | null
  submitRequest: (input: NewRequestInput) => LeaveRequest
  updateRequest: (requestId: string, patch: Partial<Pick<LeaveRequest, 'startDate' | 'endDate' | 'reason' | 'isHalfDay'>>) => void
  decide: (requestId: string, stepOrder: number, decision: 'approved' | 'rejected' | 'returned', comments: string, endDate?: string, signaturePath?: string, signatureHash?: string) => void
  resubmit: (requestId: string, documentName?: string) => void
  withdrawRequest: (requestId: string, reason?: string) => void
  /** Retry-submit an orphaned draft (create succeeded, submit failed). */
  submitDraft: (requestId: string) => void
  /** True deletion — drafts only, applicant-only, verified by the API. */
  deleteDraft: (requestId: string) => void
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
  /** Permanent staff removal — API refuses anyone with history (422 toast). */
  deleteEmployee: (employeeId: string) => Promise<boolean>
  registerEmployee: (input: RegisterEmployeeInput) => Promise<Employee | null>
  createLeaveType: (input: CreateLeaveTypeInput) => void
  updateLeaveType: (leaveTypeId: string, patch: Partial<Pick<LeaveType, 'name' | 'swahili' | 'short' | 'description' | 'color' | 'paid'>>) => void
  deleteLeaveType: (leaveTypeId: string) => Promise<boolean>
  updateWorkflow: (leaveTypeId: string, steps: { role: ApproverRole; slaDays: number; note: string }[], defId?: string) => void
  createWorkflow: (input: { leaveTypeId: string; minDurationDays?: number; zoneId?: string | null; steps: { role: ApproverRole; slaDays: number; note: string }[] }) => void
  setWorkflowActive: (workflowId: string, active: boolean) => void
  deleteWorkflow: (workflowId: string) => Promise<boolean>
  saveRolePermissions: (next: Record<string, Record<string, string[]>>) => void
  customZones: CustomZoneConfig[]
  customDepartments: CustomDeptConfig[]
  allZones: CustomZoneConfig[]
  allDepts: CustomDeptConfig[]
  customRoles: CustomRoleConfig[]
  customRoleAssignments: Record<string, string[]>
  addZone: (input: Omit<CustomZoneConfig, 'id'>) => Promise<boolean>
  updateZone: (id: string, patch: Partial<Omit<CustomZoneConfig, 'id'>>) => Promise<boolean>
  removeZone: (id: string) => Promise<boolean>
  addDepartment: (input: Omit<CustomDeptConfig, 'id'>) => Promise<boolean>
  updateDepartment: (id: string, patch: Partial<Omit<CustomDeptConfig, 'id'>>) => Promise<boolean>
  removeDepartment: (id: string) => Promise<boolean>
  createRole: (input: { label: string; description: string }) => Promise<boolean>
  updateRole: (roleId: string, patch: Partial<Pick<CustomRoleConfig, 'label' | 'description'>>) => Promise<boolean>
  /** `reassignTo` hands the role's live workflow steps to that role before archiving.
   *  Returns 'blocked' when workflows still reference the role and no target was given. */
  deleteRole: (roleId: string, reassignTo?: string) => Promise<'deleted' | 'blocked' | 'failed'>
  assignCustomRole: (employeeId: string, roleId: string, on: boolean) => Promise<boolean>
  deptHeads: Record<string, { employee_id: string; full_name: string } | null>
  zoneHeads: Record<string, { employee_id: string; full_name: string } | null>
  setDepartmentHead: (departmentId: string, employeeId: string) => Promise<boolean>
  clearDepartmentHead: (departmentId: string) => Promise<boolean>
  setZoneHead: (zoneId: string, employeeId: string) => Promise<boolean>
  clearZoneHead: (zoneId: string) => Promise<boolean>
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
    roleIds: [...new Set(j.role_ids ?? [])],
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
    scopedGrants: (j.scoped_grants ?? []).map((g) => ({
      roleId: g.role_id,
      departmentId: g.department_id,
      zoneId: g.scope_zone_id,
    })),
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
    isActive: w.is_active ?? true,
    version: w.version,
    minDurationDays: w.min_duration_days,
    zoneId: w.zone_id,
    departmentId: w.department_id,
    effectiveFrom: w.effective_from,
    effectiveTo: w.effective_to,
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
  // Only active definitions route, so only their SLAs are real.
  for (const d of defs) {
    if (d.isActive === false) continue
    for (const s of d.steps) out[s.role] = s.slaDays
  }
  return out
}

/** Cached/stale payloads may still carry pivot objects ({ position_id, role_id }) instead of role-id strings. */
function coerceRoleIds(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  const out: string[] = []
  for (const entry of value) {
    if (typeof entry === 'string') out.push(entry)
    else if (typeof entry === 'object' && entry !== null) {
      const rid = (entry as Record<string, unknown>).role_id
      if (typeof rid === 'string') out.push(rid)
      else if (typeof rid === 'number') out.push(String(rid))
    }
  }
  return out
}

function normalizePosition(p: PositionDto): PositionDto {
  // Structural heads (DEPT_HEAD/ZONAL_HEAD) are per-unit grants the server
  // refuses as unscoped mints, so they can never legitimately appear in a
  // position's defaults — strip legacy rows rather than offer them.
  return { ...p, default_roles: coerceRoleIds(p.default_roles).filter((r) => r !== 'DEPT_HEAD' && r !== 'ZONAL_HEAD') }
}

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

export function LeaveProvider({ children }: { children: React.ReactNode }) {
  const { user, token, status } = useAuth()

  // Server-authoritative capability payload from /api/me. A role name never
  // implies zone reach: the backend resolves it to concrete zone/department
  // grants, and that resolved scope is the only thing the UI may rely on.
  const access = user?.access ?? null
  const requestScope = access?.request_scope ?? null
  const supervisorMode = Boolean(
    requestScope &&
      (requestScope.can_view_all_zones ||
        requestScope.allowed_zone_ids.length > 0 ||
        requestScope.allowed_department_ids.length > 0),
  )

  /**
   * Resolved permission state from /api/me:
   *   '*'      — wildcard holder, or offline mock mode (no token)
   *   Set      — the exact codes the backend granted
   *   null     — signed in but /api/me has not resolved YET
   *
   * That third state is why this must be null and not an empty set: during the
   * very first render `user` is still null, and treating "unknown" as "allow"
   * fires every loader straight into a 403. Unknown therefore denies.
   */
  const resolvedPerms = React.useMemo<ReadonlySet<string> | '*' | null>(() => {
    if (!token) return '*'
    if (!Array.isArray(user?.permissions)) return null
    const set = new Set(user.permissions)
    return set.has('*') ? '*' : set
  }, [token, user?.permissions])

  /** Stable string so the boot effect re-fires when /api/me resolves. */
  const permSignature = React.useMemo(
    () => (Array.isArray(user?.permissions) ? user.permissions.slice().sort().join(',') : 'pending'),
    [user?.permissions],
  )

  const hasPerm = React.useCallback(
    (code: string): boolean => resolvedPerms === '*' || (resolvedPerms !== null && resolvedPerms.has(code)),
    [resolvedPerms],
  )

  // No bundled demo employee id: a signed-in user without an employee profile
  // (or during the pre-`/api/me` frame) gets '' and the `employee` memo below
  // supplies a placeholder rather than borrowing a hardcoded person.
  const [employeeId, setEmployeeId] = React.useState<string>(user?.employee?.id ?? '')
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
  const [roleDescriptions, setRoleDescriptions] = React.useState<Record<string, string>>({})
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
  /**
   * Zones and departments are owned entirely by the database. They used to be
   * merged as `[...ZONES, ...customZones]` where `ZONES` was a bundled seed
   * constant, which meant a freshly-wiped installation still rendered seven
   * phantom zones and eight departments that nobody had created.
   *
   * `orgZones`/`orgDepts` hold the server rows (fetched for every signed-in
   * user, since the endpoints are permission-free) and form the base. The
   * overrides keyed by id let an admin edit a row optimistically before the
   * re-fetch lands, and the removed sets act as tombstones so a delete is
   * representable in state at all.
   */
  const [orgZones, setOrgZones] = React.useState<Zone[]>([])
  const [orgDepts, setOrgDepts] = React.useState<Department[]>([])
  const [zoneOverrides, setZoneOverrides] = React.useState<Record<string, CustomZoneConfig>>({})
  const [deptOverrides, setDeptOverrides] = React.useState<Record<string, CustomDeptConfig>>({})
  const [removedZoneIds, setRemovedZoneIds] = React.useState<string[]>([])
  const [removedDeptIds, setRemovedDeptIds] = React.useState<string[]>([])

  const allZones = React.useMemo(() => {
    const removed = new Set(removedZoneIds)
    return [
      ...orgZones.filter((z) => !removed.has(z.id) && !(z.id in zoneOverrides)),
      ...Object.values(zoneOverrides).filter((z) => !removed.has(z.id)),
    ]
  }, [orgZones, zoneOverrides, removedZoneIds])

  const allDepts = React.useMemo(() => {
    const removed = new Set(removedDeptIds)
    // A zone that is gone takes its departments with it, so a department left
    // in the fetched list cannot outlive its parent zone.
    const goneZones = new Set(removedZoneIds)
    return [
      ...orgDepts.filter((d) => !removed.has(d.id) && !(d.id in deptOverrides) && !goneZones.has(d.zoneId)),
      ...Object.values(deptOverrides).filter((d) => !removed.has(d.id) && !goneZones.has(d.zoneId)),
    ]
  }, [orgDepts, deptOverrides, removedDeptIds, removedZoneIds])

  /**
   * Every row is the administrator's row now — there is no bundled seed left to
   * distinguish from "custom", so these are simply the merged lists typed for
   * the Settings organisation surfaces.
   */
  const customZones = React.useMemo(() => allZones as CustomZoneConfig[], [allZones])
  const customDepartments = React.useMemo(() => allDepts as CustomDeptConfig[], [allDepts])
  const [customRoles, setCustomRoles] = React.useState<CustomRoleConfig[]>([])
  const [customRoleAssignments, setCustomRoleAssignments] = React.useState<Record<string, string[]>>({})
  const [eligibility, setEligibility] = React.useState<EligibilityDto[]>([])
  const [orgEligibility, setOrgEligibility] = React.useState<OrgEligibility | null>(null)
  const [deptHeads, setDeptHeads] = React.useState<Record<string, { employee_id: string; full_name: string } | null>>({})
  const [zoneHeads, setZoneHeads] = React.useState<Record<string, { employee_id: string; full_name: string } | null>>({})

  const requestsRef = React.useRef<LeaveRequest[]>([])
  React.useEffect(() => {
    requestsRef.current = requests
  }, [requests])

  const wfRef = React.useRef<WorkflowDef[]>([])
  React.useEffect(() => {
    wfRef.current = workflowDefs
  }, [workflowDefs])

  const employeesRef = React.useRef<EmployeeRow[]>([])
  React.useEffect(() => {
    employeesRef.current = employees
  }, [employees])

  // Role ids the backend flags is_system. The custom-role surfaces only ever
  // list the rest, so built-in roles can never be edited or deleted there.
  const systemRoleIdsRef = React.useRef<Set<string>>(new Set())

  /**
   * Custom-role holders are derived from each employee's persisted role_ids, so
   * an assignment survives a reload instead of living in local state only.
   * Scoped structural grants (department/zonal head) are built-ins and are
   * filtered out by the system-role id set. No-op until the role list has been
   * read once, since only the backend knows which ids are protected.
   */
  const syncCustomRoleAssignments = React.useCallback((rows: EmployeeRow[]) => {
    const system = systemRoleIdsRef.current
    if (system.size === 0) return

    const next: Record<string, string[]> = {}
    for (const row of rows) {
      const custom = (row.roleIds ?? []).filter((id) => !system.has(id))
      if (custom.length) next[row.id] = custom
    }
    setCustomRoleAssignments(next)
  }, [])

  // -------------------------------------------------------------------------
  // Loaders
  // -------------------------------------------------------------------------

  // Heads are display-only data (which employee covers each department/zone).
  // Failures are swallowed — an offline boot must not break on this fetch.
  const loadOrgHeads = React.useCallback(async () => {
    // Head maps are only rendered by the admin-only Settings view.
    if (!hasPerm('admin.view')) {
      setDeptHeads({})
      setZoneHeads({})
      return
    }
    const [depts, zones] = await Promise.allSettled([leaveApi.org.departments(), leaveApi.org.zones()])
    if (depts.status === 'fulfilled') {
      const map: Record<string, { employee_id: string; full_name: string } | null> = {}
      for (const d of depts.value.data) map[d.id] = d.head ?? null
      setDeptHeads(map)
    }
    if (zones.status === 'fulfilled') {
      const map: Record<string, { employee_id: string; full_name: string } | null> = {}
      for (const z of zones.value.data) map[z.id] = z.head ?? null
      setZoneHeads(map)
    }
  }, [hasPerm])

  /**
   * Zones + departments, fetched for EVERY signed-in user. Both endpoints are
   * permission-free server-side, and every screen needs the names (a request's
   * zone, a calendar filter, a letter's office line) — this used to be a
   * bundled constant that survived a database wipe as phantom rows.
   */
  const loadOrgStructure = React.useCallback(async () => {
    const [zones, depts] = await Promise.allSettled([leaveApi.org.zones(), leaveApi.org.departments()])
    if (zones.status === 'fulfilled') {
      const rows: Zone[] = zones.value.data.map((z) => ({
        id: z.id,
        name: z.name,
        short: z.short,
        isHQ: z.is_hq,
        isPemba: z.is_pemba,
        isCoordination: z.is_coordination,
      }))
      // Hydrate BEFORE setState: mutating the module array never re-renders, so
      // hydrating after would leave exactly one permanently stale frame.
      hydrateOrg({ zones: rows })
      setOrgZones(rows)
    }
    if (depts.status === 'fulfilled') {
      const rows: Department[] = depts.value.data.map((d) => ({
        id: d.id,
        name: d.name,
        zoneId: d.zone_id ?? '',
        parentId: d.parent_department_id ?? undefined,
        unitType: d.unit_type ?? undefined,
      }))
      hydrateOrg({ departments: rows })
      setOrgDepts(rows)
    }
  }, [])

  const loadEmployees = React.useCallback(async () => {
    const res = await safe(leaveApi.org.employees())
    if (res) {
      const rows = res.data.map(employeeRow)
      // Keep the ref in step here (not only in an effect) so the custom-role
      // sync is correct no matter which loader resolves first.
      employeesRef.current = rows
      // Hydrate BEFORE setState — see loadOrgStructure.
      hydrateOrg({ employees: rows as unknown as Employee[] })
      setEmployees(rows)
      syncCustomRoleAssignments(rows)
    }
    // Head maps track scoped grants too, so refresh them with the rows — an
    // edit-dialog save that drops a scoped grant must not leave a stale head.
    await loadOrgHeads()
  }, [syncCustomRoleAssignments, loadOrgHeads])

  const loadPositions = React.useCallback(async () => {
    // Positions are read permission-free server-side and their titles render
    // for everyone (a request row names its holder's post), so fetch them for
    // every signed-in user.
    const res = await safe(leaveApi.org.positions())
    if (res) {
      const rows = res.data.map(normalizePosition)
      hydrateOrg({ positions: rows as unknown as import('@/lib/leave').Position[] })
      setPositions(rows)
    }
  }, [])

  const loadLeaveTypes = React.useCallback(async () => {
    const res = await safe(leaveApi.leave.types())
    if (res) {
      const rows = res.data.map(toLeaveType)
      hydrateOrg({ leaveTypes: rows })
      setLeaveTypes(rows)
    }
  }, [])

  const loadPolicies = React.useCallback(async () => {
    const res = await safe(leaveApi.leave.currentPolicies())
    if (res) {
      const rows = res.data.map(toPolicy)
      hydrateOrg({ policies: rows })
      setPolicies(rows)
    }
  }, [])

  const loadWorkflows = React.useCallback(async () => {
    // Workflow definitions are permission-gated server-side (policies.view), so
    // a plain employee legitimately has none. `getWorkflowSafe()` treats that
    // as "not visible to this session" and simply omits the routing tip.
    if (!hasPerm('policies.view')) {
      hydrateOrg({ workflows: [] })
      setWorkflowDefs([])
      return
    }
    const res = await safe(leaveApi.workflows.list())
    if (res) {
      const rows = res.data.map(toWorkflowDef)
      hydrateOrg({ workflows: rows })
      setWorkflowDefs(rows)
    }
  }, [hasPerm])

  const loadRequests = React.useCallback(async () => {
    // /api/requests is gated by requests.view; an employee without it has no
    // list to fetch and would only collect a 403.
    if (!hasPerm('requests.view')) {
      setRequests([])
      return
    }
    const res = await safe(leaveApi.requests.list({ scope: 'all', per_page: 500 }))
    if (res) setRequests((res.data.data ?? []).map((d) => requestFromRaw(d, slaMap(wfRef.current))))
  }, [hasPerm])

  const loadNotifications = React.useCallback(async () => {
    const res = await safe(leaveApi.notifications.list({ per_page: 200 }))
    if (res) setNotifications((res.data.data ?? []).map(toNotification))
  }, [])

  const loadDelegations = React.useCallback(async () => {
    if (!hasPerm('delegations.view')) {
      setDelegations([])
      return
    }
    const res = await safe(leaveApi.delegations.list())
    if (res) setDelegations(res.data.map((d) => toDelegation(d)))
  }, [hasPerm])

  const loadCases = React.useCallback(async () => {
    // Dockets are gated by case_handovers.view like every other list loader;
    // without it the call would only collect a 403.
    if (!hasPerm('case_handovers.view')) {
      setCases([])
      return
    }
    const res = await safe(leaveApi.cases.list())
    if (res) setCases(res.data.map((c) => toCase(c, requestsRef.current)))
  }, [hasPerm])

  const loadHandovers = React.useCallback(async () => {
    // One request per in-flight row; without requests.view every call 403s.
    if (!hasPerm('requests.view')) {
      setHandovers([])
      return
    }
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
  }, [hasPerm])

  const loadAudit = React.useCallback(async () => {
    if (!hasPerm('admin.view')) {
      setAudit([])
      return
    }
    const res = await safe(leaveApi.audit.list({ per_page: 200 }))
    if (res) setAudit((res.data.data ?? []).map(toAudit))
  }, [hasPerm])

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
    // The RBAC matrix and permission catalog are admin-only surfaces.
    if (!hasPerm('admin.view')) return

    const [rolesRes, catRes] = await Promise.all([safe(leaveApi.roles.list()), safe(leaveApi.roles.permissions())])

    // Archived roles (delete = archive on the backend) grant nothing, so they
    // stay out of the matrix and the scope list; `active` is absent on older
    // payloads, which means the row is live.
    const liveRoles = (rolesRes?.data ?? []).filter((r) => r.active !== false)

    if (liveRoles.length > 0 && liveRoles.some((r) => (r.permissions ?? []).length > 0)) {
      const matrix: Record<string, Record<string, string[]>> = {}
      for (const role of liveRoles) {
        const byModule: Record<string, string[]> = {}
        for (const p of role.permissions ?? []) (byModule[p.module] ??= []).push(p.action)
        matrix[role.id] = byModule
      }
      setRolePermissions(matrix)
    } else {
      setRolePermissions(JSON.parse(JSON.stringify(SEED_ROLE_PERMISSIONS)))
    }

    if (rolesRes?.data) {
      setRoleNames(Object.fromEntries(liveRoles.map((r) => [r.id, r.name])))
      setRoleDescriptions(Object.fromEntries(liveRoles.map((r) => [r.id, r.description ?? ''])))

      // The backend is the source of truth for which roles exist and which are
      // built-ins; custom roles are exactly the non-system rows.
      systemRoleIdsRef.current = new Set(liveRoles.filter((r) => r.is_system).map((r) => r.id))
      setCustomRoles(liveRoles.filter((r) => !r.is_system).map((r) => ({ id: r.id, label: r.name, description: r.description ?? '' })))
      syncCustomRoleAssignments(employeesRef.current)
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
      // Grantable codes only. The catalog deliberately lists planned and
      // deactivated codes so an admin can see they exist, but the backend
      // refuses to grant them — offering them as toggles just produced a 422
      // on save ("not enforced yet"), which read as a broken matrix.
      setValidPermissionCodes(catRes.data.filter((p) => p.is_grantable !== false).map((p) => `${p.module}.${p.action}`))
    }
  }, [hasPerm, syncCustomRoleAssignments])

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

  // Boot when authenticated. Waits for /api/me to resolve the permission set,
  // otherwise the first pass runs with `resolvedPerms === null` and every
  // guarded loader denies itself.
  React.useEffect(() => {
    if (status !== 'authenticated') {
      setLoading(true)
      // Blank the runtime store too, so a logout never leaves the previous
      // tenant's staff / zones / departments readable by the next user.
      hydrateOrg({
        zones: [],
        departments: [],
        positions: [],
        employees: [],
        leaveTypes: [],
        policies: [],
        workflows: [],
      })
      setOrgZones([])
      setOrgDepts([])
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
      setRoleDescriptions({})
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

    // Authenticated but the capability payload has not arrived yet. Hold the
    // loading screen rather than firing requests we already know will be denied.
    if (resolvedPerms === null) {
      setLoading(true)
      return
    }

    let cancelled = false
    setLoading(true)
    setEmployeeId(user?.employee?.id ?? '')
    const fire = async () => {
      await Promise.allSettled([
        loadOrgStructure(),
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
        loadOrgHeads(),
      ])
      await loadHandovers()
      if (!cancelled) setLoading(false)
    }
    void fire()
    return () => {
      cancelled = true
    }
    // permSignature re-triggers the boot once /api/me lands the real codes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, status, user?.employee?.id, permSignature])

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
      // The server role grants are the only source of truth — there is no
      // bundled seed map left to fall back to. An unknown employee simply
      // holds no approver role.
      return row ? row.roleIds.filter(isApproverRole) : []
    },
    [token, user, employees],
  )

  const can = React.useCallback(
    (module: string, code: string): boolean => {
      // Signed in: the backend-resolved permission list is authoritative.
      if (token && user?.permissions?.length) {
        return user.permissions.includes('*') || user.permissions.includes(`${module}.${code}`)
      }
      // Offline / mock fallback only.
      const roles: ApproverRole[] = rolesOf(employeeId)
      const effective: string[] = [...roles, ...(customRoleAssignments[employeeId] ?? [])]
      return effective.some((r) => (rolePermissions[r]?.[module] ?? []).includes(code))
    },
    [token, user, employeeId, rolesOf, rolePermissions, customRoleAssignments],
  )

  /**
   * Display-layer counterpart to the backend AccessScopeService: whether a
   * record belonging to `empId` is inside the caller's request scope. Mirrors
   * the server rule so the UI never presents a row the API would refuse.
   */
  const canViewEmployee = React.useCallback(
    (empId: string): boolean => {
      if (!requestScope) return true
      if (requestScope.can_view_all_zones) return true
      if (empId === user?.employee?.id) return true
      const row = employees.find((e) => e.id === empId)
      if (!row) return false
      if (row.zoneId && requestScope.allowed_zone_ids.includes(row.zoneId)) return true
      if (row.departmentId && requestScope.allowed_department_ids.includes(row.departmentId)) return true
      return false
    },
    [requestScope, user, employees],
  )

  const employee = React.useMemo<Employee>(() => {
    const found = employees.find((e) => e.id === employeeId)
    if (found) return found
    // No staff row for this id (signed out, or a user whose employee profile
    // has not been created yet). Build a placeholder from the auth payload so
    // `.name` / `.hireDate` reads never throw; when there is no profile at all
    // every field is blank rather than borrowed from a hardcoded person.
    const a = user?.employee
    return {
      id: employeeId,
      name: a?.full_name ?? user?.username ?? '—',
      title: a?.position_id ?? '',
      initials: a?.initials ?? '—',
      positionId: a?.position_id ?? '',
      departmentId: a?.department_id ?? '',
      zoneId: a?.zone_id ?? '',
      gender: a?.gender ?? 'F',
      hireDate: a?.hire_date ?? TODAY,
      email: user?.email ?? '',
      gradient: 'from-teal-600 to-cyan-600',
    }
  }, [employees, employeeId, user])

  const typeOf = React.useCallback(
    (id: string) => leaveTypes.find((t) => t.id === id) ?? getLeaveTypeSafe(id),
    [leaveTypes],
  )

  /**
   * Annual leave resolved BY CODE, not by a hardcoded id. Leave types are
   * database rows now and their surrogate ids differ per installation, so
   * `'lt1'` would point at whichever row happened to be created first. Falls
   * back to the first type when no ANNUAL type exists, and to '' when the
   * catalogue is empty (balanceOf then reports a zeroed balance).
   */
  const annualTypeId = React.useMemo(
    () => leaveTypes.find((t) => t.code === 'ANNUAL')?.id ?? leaveTypes[0]?.id ?? '',
    [leaveTypes],
  )

  const pendingApprovals = React.useMemo(
    () =>
      requests.filter(
        (r) =>
          (r.status === 'submitted' || r.status === 'under_review' || r.status === 'returned_for_correction') &&
          r.steps.some((s) => s.status === 'pending'),
      ),
    [requests],
  )

  const activeRequests = React.useMemo(
    () => requests.filter((r) => r.status === 'approved' || r.status === 'under_review'),
    [requests],
  )

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
      // Hire-date tenure check — block annual leave until employee reaches service date
      const hire = employee.hireDate ? new Date(employee.hireDate) : null
      const annualPolicy = policies.find((p) => p.leaveTypeId === annualTypeId)
      const minMonths = (annualPolicy as unknown as { min_tenure_months?: number })?.min_tenure_months ?? 0
      if (hire && minMonths > 0) {
        const months = (new Date().getFullYear() - hire.getFullYear()) * 12 + (new Date().getMonth() - hire.getMonth())
        if (months < minMonths) {
          toast.error('You have not reached the required service tenure for annual leave.')
          throw new Error('tenure_not_met')
        }
      }
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
            assigneeName: getEmployee(input.employeeId)?.name ?? input.employeeId,
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
        if (!submitted) {
          // Create succeeded but submit failed (validation, network): the
          // row now exists as a draft. Say where it went — without this the
          // failure used to look like a success while an invisible draft
          // piled up in the list with no way to submit it again.
          toast.warning(`${created.data.ref ?? 'Request'} saved as a draft — open it in the list and choose “Submit for approval”.`)
          return
        }
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
    (requestId: string, stepOrder: number, decision: 'approved' | 'rejected' | 'returned', comments: string, endDate?: string, signaturePath?: string, signatureHash?: string) => {
      const req = requests.find((r) => r.id === requestId)
      if (!req) return
      void (async () => {
        const res = await safe(leaveApi.requests.decide(requestId, { decision, comments, end_date: endDate || null, signature_path: signaturePath || req.signaturePath, signature_hash: signatureHash || req.signatureHash }))
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

  const submitDraft = React.useCallback(
    (requestId: string) => {
      const req = requests.find((r) => r.id === requestId)
      if (!req) return
      void (async () => {
        const res = await safe(leaveApi.requests.submit(requestId))
        if (!res) {
          refreshAfterWrite()
          return
        }
        const merged = requestFromResource(req, res.data, res.workflow, slaMap(wfRef.current))
        setRequests((prev) => prev.map((r) => (r.id === String(res.data.id) ? merged : r)))
        refreshWithHandovers()
        toast.success(`${merged.ref} submitted for approval.`)
      })()
    },
    [requests, refreshAfterWrite, refreshWithHandovers],
  )

  const deleteDraft = React.useCallback(
    (requestId: string) => {
      const req = requests.find((r) => r.id === requestId)
      if (!req) return
      if (req.status !== 'draft') {
        toast.error('Only draft requests can be deleted — submitted requests stay in the audit trail.')
        return
      }
      void (async () => {
        const res = await safe(leaveApi.requests.destroy(requestId))
        if (!res) return
        setRequests((prev) => prev.filter((r) => r.id !== requestId))
        toast.success(`${req.ref} deleted — it was never submitted.`)
      })()
    },
    [requests],
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
          const name = getEmployee(input.delegateId)?.name ?? input.delegateId
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
          toast.success(`Handover recorded. ${to?.name.split(' ')[0] ?? 'The delegate'} must accept before deciding.`)
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
          toast.success(`Docket accepted. ${to?.name.split(' ')[0] ?? 'The approver'} can now decide.`)
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
        if (Object.keys(body).length) {
          // `safe` already toasts the server error; bail so a failed PATCH
          // never reaches the reload + success toast below.
          const res = await safe(leaveApi.org.updateEmployee(id, body))
          if (!res) return
        }
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

  /** Permanent removal; `safe` surfaces the API's 422 reason (history, head…). */
  const deleteEmployee = React.useCallback(
    async (id: string): Promise<boolean> => {
      const target = employees.find((e) => e.id === id)
      const res = await safe(leaveApi.org.deleteEmployee(id))
      if (!res) return false
      setEmployees((prev) => prev.filter((e) => e.id !== id))
      toast.success(`${target?.name ?? 'Staff member'} deleted.`)
      return true
    },
    [employees],
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

  const deleteLeaveType = React.useCallback(
    async (leaveTypeId: string): Promise<boolean> => {
      const existing = leaveTypes.find((t) => t.id === leaveTypeId)
      const label = existing?.name ?? leaveTypeId
      // 422 (type carries history) surfaces via `safe`'s toast; local state
      // only changes on success.
      const res = await safe(leaveApi.leave.destroyType(leaveTypeId))
      if (!res) return false
      // The API takes the type's policy versions and workflow definitions
      // with it — drop them from local state alongside the type.
      setLeaveTypes((prev) => prev.filter((t) => t.id !== leaveTypeId))
      setPolicies((prev) => prev.filter((p) => p.leaveTypeId !== leaveTypeId))
      setWorkflowDefs((prev) => prev.filter((w) => w.leaveTypeId !== leaveTypeId))
      toast.success(`${label} leave type deleted, with its policies and workflow.`)
      return true
    },
    [leaveTypes],
  )

  const updateWorkflow = React.useCallback(
    (leaveTypeId: string, steps: { role: ApproverRole; slaDays: number; note: string }[], defId?: string) => {
      // Targeted edit when the UI names a definition; otherwise the type's
      // ACTIVE definition (falling back to any), so multi-definition types
      // always edit the chain that is actually routing.
      const existing =
        (defId ? workflowDefs.find((w) => w.id === defId) : undefined) ??
        workflowDefs.find((w) => w.leaveTypeId === leaveTypeId && w.isActive !== false) ??
        workflowDefs.find((w) => w.leaveTypeId === leaveTypeId)
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

  const createWorkflow = React.useCallback(
    (input: { leaveTypeId: string; minDurationDays?: number; zoneId?: string | null; steps: { role: ApproverRole; slaDays: number; note: string }[] }) => {
      const typeName = typeOf(input.leaveTypeId)?.name ?? input.leaveTypeId
      void (async () => {
        const res = await safe(
          leaveApi.workflows.store({
            leave_type_id: input.leaveTypeId,
            min_duration_days: input.minDurationDays ?? 0,
            zone_id: input.zoneId ?? null,
            steps: input.steps.map((s) => ({ role_required: s.role, sla_days: s.slaDays, note: s.note })),
          }),
        )
        if (!res) return
        await safe(loadWorkflows())
        toast.success(`${typeName} workflow v${res.data.version} created — new submissions route through it.`)
      })()
    },
    [typeOf, loadWorkflows],
  )

  const setWorkflowActive = React.useCallback(
    (workflowId: string, active: boolean) => {
      const def = workflowDefs.find((w) => w.id === workflowId)
      const label = def ? typeOf(def.leaveTypeId)?.name ?? def.leaveTypeId : 'Workflow'
      void (async () => {
        // 422 (e.g. the type's last active chain) surfaces via `safe`'s toast;
        // local state only changes on success.
        const res = await safe(leaveApi.workflows.update(workflowId, { is_active: active }))
        if (!res) return
        setWorkflowDefs((prev) => prev.map((w) => (w.id === workflowId ? { ...w, isActive: active } : w)))
        toast.info(`${label} workflow ${active ? 'activated — new submissions will use it.' : 'deactivated — it no longer routes new submissions.'}`)
      })()
    },
    [workflowDefs, typeOf],
  )

  const deleteWorkflow = React.useCallback(
    async (workflowId: string): Promise<boolean> => {
      const def = workflowDefs.find((w) => w.id === workflowId)
      const label = def ? typeOf(def.leaveTypeId)?.name ?? def.leaveTypeId : 'Workflow'
      const res = await safe(leaveApi.workflows.destroy(workflowId))
      if (!res) return false
      setWorkflowDefs((prev) => prev.filter((w) => w.id !== workflowId))
      toast.success(`${label} workflow deleted.`)
      return true
    },
    [workflowDefs, typeOf],
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

  const addZone = React.useCallback(
    async (input: Omit<CustomZoneConfig, 'id'>): Promise<boolean> => {
      if (!hasPerm('admin.create')) {
        toast.error('You do not have permission to create zones.')
        return false
      }
      const res = await safe(
        leaveApi.org.storeZone({
          name: input.name,
          short: input.short ?? null,
          is_hq: input.isHQ,
          is_pemba: input.isPemba,
          is_coordination: input.isCoordination,
        }),
      )
      if (!res) return false
      setZoneOverrides((prev) => ({
        ...prev,
        [res.data.id]: {
          id: res.data.id,
          name: res.data.name,
          short: res.data.short ?? '',
          isHQ: res.data.is_hq,
          isPemba: res.data.is_pemba,
          isCoordination: res.data.is_coordination,
        },
      }))
      await safe(loadEmployees())
      toast.success(`Zone "${res.data.name}" created.`)
      return true
    },
    [hasPerm, loadEmployees],
  )

  const updateZone = React.useCallback(
    async (id: string, input: Partial<Omit<CustomZoneConfig, 'id'>>): Promise<boolean> => {
      if (!hasPerm('admin.update')) {
        toast.error('You do not have permission to edit zones.')
        return false
      }
      const res = await safe(
        leaveApi.org.updateZone(id, {
          ...(input.name !== undefined ? { name: input.name } : {}),
          ...(input.short !== undefined ? { short: input.short || null } : {}),
          ...(input.isHQ !== undefined ? { is_hq: input.isHQ } : {}),
          ...(input.isPemba !== undefined ? { is_pemba: input.isPemba } : {}),
          ...(input.isCoordination !== undefined ? { is_coordination: input.isCoordination } : {}),
        }),
      )
      if (!res) return false
      setZoneOverrides((prev) => {
        // Merge onto whatever is already known about this id, falling back to the
        // seed, so a partial patch never blanks the untouched fields.
        const seed = allZones.find((z) => z.id === id)
        const base: CustomZoneConfig = prev[id] ?? {
          id,
          name: seed?.name ?? id,
          short: seed?.short ?? '',
          isHQ: seed?.isHQ,
          isPemba: seed?.isPemba,
          isCoordination: seed?.isCoordination,
        }
        return { ...prev, [id]: { ...base, ...input, id } }
      })
      await safe(loadEmployees())
      toast.success('Zone updated.')
      return true
    },
    [hasPerm, loadEmployees],
  )

  const removeZone = React.useCallback(
    async (id: string): Promise<boolean> => {
      if (!hasPerm('admin.delete')) {
        toast.error('You do not have permission to delete zones.')
        return false
      }
      try {
        await leaveApi.org.deleteZone(id)
      } catch (err) {
        // 422 carries the reason: the zone still holds departments or employees.
        toast.error(err instanceof ApiError ? err.message : `Failed to delete zone ${id}.`)
        return false
      }
      // Tombstone the id so the seeded constant stops rendering, and drop any
      // override so a later re-create of the same id is not shadowed by it.
      setRemovedZoneIds((prev) => (prev.includes(id) ? prev : [...prev, id]))
      setZoneOverrides((prev) => {
        if (!(id in prev)) return prev
        const { [id]: _dropped, ...rest } = prev
        return rest
      })
      setDeptOverrides((prev) => {
        const kept = Object.entries(prev).filter(([, d]) => d.zoneId !== id)
        return kept.length === Object.keys(prev).length ? prev : Object.fromEntries(kept)
      })
      await safe(loadEmployees())
      toast.info('Zone removed.')
      return true
    },
    [hasPerm, loadEmployees],
  )

  const addDepartment = React.useCallback(
    async (input: Omit<CustomDeptConfig, 'id'>): Promise<boolean> => {
      if (!hasPerm('admin.create')) {
        toast.error('You do not have permission to create departments.')
        return false
      }
      const res = await safe(leaveApi.org.storeDepartment({ name: input.name, zone_id: input.zoneId }))
      if (!res) return false
      setDeptOverrides((prev) => ({
        ...prev,
        [res.data.id]: { id: res.data.id, name: res.data.name, zoneId: res.data.zone_id ?? input.zoneId },
      }))
      await safe(loadEmployees())
      toast.success(`Department "${res.data.name}" created.`)
      return true
    },
    [hasPerm, loadEmployees],
  )

  const updateDepartment = React.useCallback(
    async (id: string, input: Partial<Omit<CustomDeptConfig, 'id'>>): Promise<boolean> => {
      if (!hasPerm('admin.update')) {
        toast.error('You do not have permission to edit departments.')
        return false
      }
      const res = await safe(
        leaveApi.org.updateDepartment(id, {
          ...(input.name !== undefined ? { name: input.name } : {}),
          ...(input.zoneId !== undefined ? { zone_id: input.zoneId } : {}),
        }),
      )
      if (!res) return false
      setDeptOverrides((prev) => {
        const seed = allDepts.find((d) => d.id === id)
        const base: CustomDeptConfig = prev[id] ?? {
          id,
          name: seed?.name ?? id,
          zoneId: seed?.zoneId ?? input.zoneId ?? '',
        }
        return { ...prev, [id]: { ...base, ...input, id } }
      })
      await safe(loadEmployees())
      toast.success('Department updated.')
      return true
    },
    [hasPerm, loadEmployees],
  )

  const removeDepartment = React.useCallback(
    async (id: string): Promise<boolean> => {
      if (!hasPerm('admin.delete')) {
        toast.error('You do not have permission to delete departments.')
        return false
      }
      try {
        await leaveApi.org.deleteDepartment(id)
      } catch (err) {
        toast.error(err instanceof ApiError ? err.message : `Failed to delete department ${id}.`)
        return false
      }
      setRemovedDeptIds((prev) => (prev.includes(id) ? prev : [...prev, id]))
      setDeptOverrides((prev) => {
        if (!(id in prev)) return prev
        const { [id]: _dropped, ...rest } = prev
        return rest
      })
      await safe(loadEmployees())
      toast.info('Department removed.')
      return true
    },
    [hasPerm, loadEmployees],
  )

  const setDepartmentHead = React.useCallback(
    async (departmentId: string, employeeId: string): Promise<boolean> => {
      if (!hasPerm('admin.update')) {
        toast.error('You do not have permission to appoint department heads.')
        return false
      }
      const res = await safe(leaveApi.org.setDepartmentHead(departmentId, employeeId))
      if (!res) return false
      await safe(loadOrgHeads())
      await safe(loadEmployees())
      toast.success('Department head updated.')
      return true
    },
    [hasPerm, loadOrgHeads, loadEmployees],
  )

  const clearDepartmentHead = React.useCallback(
    async (departmentId: string): Promise<boolean> => {
      if (!hasPerm('admin.update')) {
        toast.error('You do not have permission to appoint department heads.')
        return false
      }
      const res = await safe(leaveApi.org.clearDepartmentHead(departmentId))
      if (!res) return false
      await safe(loadOrgHeads())
      await safe(loadEmployees())
      toast.success('Department head cleared.')
      return true
    },
    [hasPerm, loadOrgHeads, loadEmployees],
  )

  const setZoneHead = React.useCallback(
    async (zoneId: string, employeeId: string): Promise<boolean> => {
      if (!hasPerm('admin.update')) {
        toast.error('You do not have permission to appoint zonal heads.')
        return false
      }
      const res = await safe(leaveApi.org.setZoneHead(zoneId, employeeId))
      if (!res) return false
      await safe(loadOrgHeads())
      await safe(loadEmployees())
      toast.success('Zonal head updated.')
      return true
    },
    [hasPerm, loadOrgHeads, loadEmployees],
  )

  const clearZoneHead = React.useCallback(
    async (zoneId: string): Promise<boolean> => {
      if (!hasPerm('admin.update')) {
        toast.error('You do not have permission to appoint zonal heads.')
        return false
      }
      const res = await safe(leaveApi.org.clearZoneHead(zoneId))
      if (!res) return false
      await safe(loadOrgHeads())
      await safe(loadEmployees())
      toast.success('Zonal head cleared.')
      return true
    },
    [hasPerm, loadOrgHeads, loadEmployees],
  )

  /**
   * Dynamic roles live in the backend `roles` table — these three used to be
   * local React state only, which made every role vanish on reload. Writes go
   * through the API and re-read the authoritative list afterwards.
   */
  const createRole = React.useCallback(
    async (input: { label: string; description: string }): Promise<boolean> => {
      const label = input.label.trim()
      if (!label) return false

      const res = await safe(leaveApi.roles.store({
        name: label,
        description: input.description.trim() || null,
      }))
      if (!res) return false

      await safe(loadRolesAndPermissions())
      toast.success(`Role "${res.data.name}" created. Grant permissions in the matrix and assign holders.`)
      return true
    },
    [loadRolesAndPermissions],
  )

  const updateRole = React.useCallback(
    async (roleId: string, patch: Partial<Pick<CustomRoleConfig, 'label' | 'description'>>): Promise<boolean> => {
      const res = await safe(leaveApi.roles.update(roleId, {
        ...(patch.label !== undefined ? { name: patch.label.trim() } : {}),
        ...(patch.description !== undefined ? { description: patch.description.trim() || null } : {}),
      }))
      if (!res) return false

      await safe(loadRolesAndPermissions())
      toast.success('Role updated.')
      return true
    },
    [loadRolesAndPermissions],
  )

  const deleteRole = React.useCallback(
    async (roleId: string, reassignTo?: string): Promise<'deleted' | 'blocked' | 'failed'> => {
      if (!hasPerm('admin.delete')) {
        toast.error('You do not have permission to delete roles.')
        return 'failed'
      }

      try {
        await leaveApi.roles.destroy(roleId, reassignTo)
      } catch (err) {
        // 422 carries the reason. A refusal with `errors.role` means live
        // workflow steps still point at this role — the UI turns that into a
        // reassignment offer rather than a dead end.
        if (err instanceof ApiError && err.status === 422 && err.fieldErrors?.role) {
          toast.error(err.message)
          return 'blocked'
        }
        toast.error(err instanceof ApiError ? err.message : `Failed to delete role ${roleId}.`)
        return 'failed'
      }

      await safe(loadRolesAndPermissions())
      await safe(loadEmployees())
      syncCustomRoleAssignments(employeesRef.current)
      toast.info(
        reassignTo
          ? `Role ${roleId} archived — its approval steps now route to ${reassignTo}.`
          : `Role ${roleId} deleted — its holders and delegations were removed with it.`,
      )
      return 'deleted'
    },
    [hasPerm, loadRolesAndPermissions, loadEmployees, syncCustomRoleAssignments],
  )

  const assignCustomRole = React.useCallback(
    async (empId: string, roleId: string, on: boolean): Promise<boolean> => {
      const empName = getEmployee(empId)?.name ?? empId

      // Single-grant endpoints: a full role_ids PATCH would rewrite every
      // unscoped grant and re-materialise scoped department/zonal ones.
      const res = await safe(on ? leaveApi.org.grantRole(empId, roleId) : leaveApi.org.revokeRole(empId, roleId))
      if (!res) return false

      await safe(loadEmployees())
      syncCustomRoleAssignments(employeesRef.current)
      toast.success(`${on ? 'Assigned' : 'Removed'} role — ${empName}.`)
      return true
    },
    [loadEmployees, syncCustomRoleAssignments],
  )

  const positionTitle = React.useCallback(
    (id: string) =>
      positions.find((p) => p.id === id)?.title ?? getPosition(id)?.title ?? '—',
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
        access,
        setEmployee: setEmployeeId,
        canViewEmployee,
        rolesOf,
        requests,
        notifications,
        delegations,
        audit,
        cases,
        handovers,
        caseOf: (requestId: string) => caseFor(requestId, cases),
        policies,
        leaveTypes,
        annualTypeId,
        workflowDefs,
        rolePermissions,
        roleNames,
        roleDescriptions,
        permissionModules,
        permissionActions,
        permissionCodes,
        validPermissionCodes,
        can,
        hasPerm,
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
        submitDraft,
        deleteDraft,
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
        deleteEmployee,
        registerEmployee,
        createLeaveType,
        updateLeaveType,
        deleteLeaveType,
        updateWorkflow,
        createWorkflow,
        setWorkflowActive,
        deleteWorkflow,
        saveRolePermissions,
        customZones,
        customDepartments,
        allZones,
        allDepts,
        customRoles,
        customRoleAssignments,
        addZone,
        updateZone,
        removeZone,
        addDepartment,
        updateDepartment,
        removeDepartment,
        createRole,
        updateRole,
        deleteRole,
        assignCustomRole,
        deptHeads,
        zoneHeads,
        setDepartmentHead,
        clearDepartmentHead,
        setZoneHead,
        clearZoneHead,
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