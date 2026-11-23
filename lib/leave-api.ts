/**
 * leave-api.ts
 * -----------
 * Typed client for the Laravel "Mfumo wa Likizo" backend.
 * All calls go to /api/* (proxied to Laravel by next.config rewrites).
 * The bearer token is injected automatically once auth.tsx sets it.
 */

export interface Paginated<T> {
  current_page: number
  data: T[]
  from: number | null
  last_page: number
  per_page: number
  to: number | null
  total: number
}

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------
export interface AuthEmployee {
  id: string
  full_name: string
  first_name?: string | null
  middle_name?: string | null
  last_name?: string | null
  initials: string
  avatar_initials?: string
  avatar_url?: string | null
  payroll_no: string | null
  gender: 'M' | 'F'
  position_id: string | null
  department_id: string | null
  zone_id: string | null
  hire_date: string | null
}

export interface AuthRole {
  role_id: string
  name: string | null
  department_id: string | null
  zone_id: string | null
  effective_from: string | null
  effective_to: string | null
}

/**
 * Resolved data-visibility scope, mirrored from the backend AccessScope value
 * object. RBAC answers "which codes do you hold"; this answers "which records
 * may those codes be applied to".
 */
export interface AuthAccessScope {
  can_view_all_zones: boolean
  allowed_zone_ids: string[]
  allowed_department_ids: string[]
  own_records_only: boolean
}

/**
 * Server-authoritative capability payload on `/api/me`. The frontend must never
 * infer zone reach from a role name — a ZONAL_HEAD grant is expressed here as a
 * concrete zone list.
 */
export interface AuthAccess {
  can_view_cross_zone: boolean
  can_view_cross_zone_staff: boolean
  can_view_cross_zone_reports: boolean
  request_scope: AuthAccessScope
  staff_scope: AuthAccessScope
}

export interface AuthUser {
  id: string
  username: string
  email: string | null
  employee: AuthEmployee | null
  roles: AuthRole[]
  permissions: string[]
  access?: AuthAccess
}

export interface LoginResponse {
  token: string
  user: AuthUser
}

// ---------------------------------------------------------------------------
// Organization
// ---------------------------------------------------------------------------
export interface ZoneDto {
  id: string
  name: string
  short: string
  is_hq: boolean
  is_pemba: boolean
  is_coordination: boolean
  parent_zone_id: string | null
  head?: { employee_id: string; full_name: string } | null
}

export interface DepartmentDto {
  id: string
  name: string
  zone_id: string | null
  parent_department_id: string | null
  unit_type: string | null
  reports_directly_to_leadership: boolean
  is_active?: boolean
  head?: { employee_id: string; full_name: string } | null
}

export interface DivisionDto {
  id: string
  code?: string
  name: string
  name_sw?: string | null
  parent_department_id: string | null
  parent_department?: string | null
  zone_id: string | null
  zone?: string | null
  unit_type?: string | null
  is_active?: boolean
  sort_order?: number
  reports_directly_to_leadership?: boolean
  active_employees_count?: number
  head?: { employee_id: string; full_name: string } | null
}

export interface UnitDto {
  id: string
  code?: string
  name: string
  name_sw?: string | null
  parent_department_id?: string | null
  reports_to?: string | null
  zone_id: string | null
  zone?: string | null
  unit_type?: string | null
  is_active?: boolean
  sort_order?: number
  reports_directly_to_leadership?: boolean
  active_employees_count?: number
  head?: { employee_id: string; full_name: string } | null
}

export interface ApprovalRoleDto {
  id: string
  code: string
  name: string
  name_sw?: string | null
  description?: string | null
  resolution_type: string
  is_active: boolean
  is_system_protected: boolean
}

export interface PositionDto {
  id: string
  code?: string | null
  title: string
  title_sw?: string | null
  department_id: string | null
  division_id: string | null
  unit_id: string | null
  zone_id: string | null
  is_active: boolean
}

export interface EmployeeDto {
  id: string
  user_id: string | null
  payroll_no: string | null
  full_name: string
  first_name?: string | null
  middle_name?: string | null
  last_name?: string | null
  initials: string | null
  /** Server-derived two-letter initials (first + last name). */
  avatar_initials?: string
  /** Present only when a profile photo is on file. */
  avatar_url?: string | null
  profile_photo_path?: string | null
  position_id: string | null
  department_id: string | null
  division_id?: string | null
  unit_id?: string | null
  zone_id: string | null
  gender: 'M' | 'F'
  email: string | null
  hire_date: string | null
  is_active: boolean
  role_ids?: string[]
  department?: DepartmentDto | null
  zone?: ZoneDto | null
  position?: PositionDto | null
  scoped_grants?: Array<{ role_id: string; department_id: string | null; scope_zone_id: string | null }>
}

export interface OrgBranch {
  id: string
  name: string
  unit_type: string | null
  reports_directly_to_leadership: boolean
  children: OrgBranch[]
}

// ---------------------------------------------------------------------------
// Leave types / policies / balances
// ---------------------------------------------------------------------------
export interface LeaveTypeDto {
  id: string
  code: string
  name: string
  swahili: string | null
  short: string | null
  is_paid_default: boolean
  description: string | null
}

export interface PolicyCompactDto {
  id: string
  leave_type_id: string
  code: string | null
  version: number
  max_days_per_year: number | null
  max_days_per_request: number | null
  min_tenure_months: number
  min_notice_days: number
  requires_documents: boolean
  required_docs: string[]
  carry_over_max: number
  allow_half_day: boolean
  effective_from: string | null
  effective_to: string | null
  is_current: boolean
}

export interface PolicyDto {
  id: string
  leave_type_id: string
  version: number
  max_days_per_year: number | null
  max_days_per_request: number | null
  min_tenure_months: number | null
  min_notice_days: number | null
  requires_documents: boolean
  required_docs: string[] | null
  carry_over_max: number | null
  carry_over_expiry_month: number | null
  allow_half_day: boolean
  notes: string | null
  effective_from: string | null
  effective_to: string | null
  created_by: string | null
  approved_by: string | null
}

export interface BalanceDto {
  accrued: number
  carryOver: number
  used: number
  remaining: number
  pct: number
}

export interface TipDto {
  tone: 'warn' | 'ok' | 'info'
  text: string
}

// ---------------------------------------------------------------------------
// Workflows
// ---------------------------------------------------------------------------
export type WorkflowAssignmentMode = 'assigned_approver' | 'shared_queue'
export type WorkflowStepScope =
  | 'requester_department'
  | 'requester_division'
  | 'requester_unit'
  | 'requester_zone'
  | 'office_wide'

export interface WorkflowStepDto {
  id: number
  workflow_def_id: string
  step_order: number
  /** Legacy pointer kept for pre-catalog consumers; routing reads approval_role_id. */
  role_required: string | null
  approval_role_id: string | null
  /** Employee explicitly chosen for this step (new builder). */
  approver_employee_id: string | null
  fallback_approval_role_id: string | null
  assignment_mode: WorkflowAssignmentMode
  scope_type: WorkflowStepScope
  allow_same_person_as_previous_steps: boolean
  sla_days: number
  is_mandatory: boolean
  escalation_after_sla: boolean
  note: string | null
  approval_role?: ApprovalRoleDto | null
  approver?: EmployeeDto | null
}

export interface WorkflowDefDto {
  id: string
  /** Required human label; the primary identifier in Workflow Management. */
  workflow_title: string
  leave_type_id: string
  version: number
  min_duration_days: number
  /** Optional upper bound for the hidden "Advanced Duration Rule". */
  max_duration_days: number | null
  zone_id: string | null
  department_id: string | null
  /** Multi-scope placement set (pivot rows + legacy mirror). */
  department_ids?: string[]
  effective_from: string | null
  effective_to: string | null
  created_by: string | null
  approved_by: string | null
  notes: string | null
  is_active: boolean
  created_at?: string | null
  updated_at?: string | null
  leave_type: LeaveTypeDto | null
  /** Server-computed presentation fields from WorkflowController::decorate. */
  leave_type_name?: string | null
  zone_name?: string | null
  department_name?: string | null
  department_unit_type?: string | null
  scope_kind?: 'office_wide' | 'zone' | 'department'
  scope_label?: string
  applies_to?: string
  duration_label?: string
  steps: WorkflowStepDto[]
}

export interface WorkflowStepInput {
  /** Catalog role id — the backend derives the legacy role pointer itself. */
  approval_role_id: string
  /** Employee chosen from the holders of approval_role_id. */
  approver_employee_id?: string | null
  fallback_approval_role_id?: string | null
  assignment_mode?: WorkflowAssignmentMode
  scope_type?: WorkflowStepScope
  /** Legacy pointer; omitted by the new builder so it cannot be mistyped. */
  role_required?: string | null
  sla_days: number
  is_mandatory?: boolean
  allow_same_person_as_previous_steps?: boolean
  escalation_after_sla?: boolean
  note?: string | null
}

export interface WorkflowStoreInput {
  id?: string
  workflow_title: string
  leave_type_id: string
  min_duration_days?: number
  max_duration_days?: number | null
  zone_id?: string | null
  department_id?: string | null
  department_ids?: string[]
  effective_from?: string
  effective_to?: string | null
  notes?: string | null
  is_active?: boolean
  /** New builder contract: every step must name an approver. */
  strict_approvers?: boolean
  steps: WorkflowStepInput[]
}

export interface WorkflowListParams {
  page?: number
  per_page?: number
  search?: string
  leave_type_id?: string
  status?: 'active' | 'inactive' | ''
  scope?: 'office_wide' | 'zone' | 'department' | 'division' | 'unit' | ''
  zone_id?: string
  department_id?: string
  sort?: 'title' | 'leave_type' | 'version' | 'created_at' | 'updated_at' | ''
  direction?: 'asc' | 'desc'
}

export interface WorkflowCheckInput {
  id?: string
  leave_type_id: string
  workflow_title?: string
  min_duration_days?: number
  max_duration_days?: number | null
  zone_id?: string | null
  department_id?: string | null
  department_ids?: string[]
  effective_from?: string
  effective_to?: string | null
  steps?: Partial<WorkflowStepInput>[]
}

export interface WorkflowCheckStep {
  step_order: number
  approval_role_id: string | null
  approval_role_name: string | null
  approver_employee_id: string | null
  approver_name: string | null
  assignment_mode: WorkflowAssignmentMode
  scope_type: WorkflowStepScope
  is_mandatory: boolean
  note: string | null
}

export interface WorkflowCheckResult {
  conflict: boolean
  message: string | null
  conflict_title: string | null
  applies_to: string
  duration_label: string
  leave_type_name: string | null
  steps: WorkflowCheckStep[]
  final_authority: { auto: boolean; reasons: string[] }
}

// ---------------------------------------------------------------------------
// Requests
// ---------------------------------------------------------------------------
export interface RequestAssignment {
  id: number
  /** Configured workflow step this assignment belongs to. */
  step_id?: number | null
  role: string
  /** Catalog display name (e.g. "HR Reviewer"); falls back to `role`. */
  role_label?: string | null
  assignee_id: string | null
  assignee_name: string | null
  assignee_initials?: string | null
  /** `delegation` when this step was routed through an active delegation. */
  via?: string
  delegated_from_id?: string | null
  status: 'pending' | 'queued' | 'done' | 'skipped'
  due_at: string | null
  decided_at: string | null
  /** Latest decision on the assignment (approved/returned/rejected). */
  decision?: 'approved' | 'returned' | 'rejected' | null
  /** Comment recorded with that decision — shown to the current approver. */
  decision_comment?: string | null
}

export interface RequestCompact {
  id: number
  ref: string
  reference_number?: string | null
  employee_id: string | null
  leave_type_id: string
  policy_id: string | null
  start_date: string
  end_date: string | null
  days: number | null
  approved_days?: number | null
  letter_body?: string | null
  letter_issued_at?: string | null
  is_paid?: boolean | null
  reason: string | null
  status: string
  current_owner_id: string | null
  submitted_at: string | null
  decided_at: string | null
  is_half_day: boolean
  is_emergency_exception: boolean
  exception_reason: string | null
  employee: { id: string; full_name: string } | null
  leave_type: { code: string; name: string } | null
  assignments: RequestAssignment[]
  documents?: DocumentDto[]
  signature_path?: string
  signature_hash?: string
}

export interface RequestDto {
  id: number
  ref: string
  reference_number?: string | null
  employee_id: string | null
  leave_type_id: string
  policy_id: string | null
  start_date: string
  end_date: string | null
  days: number | null
  approved_days?: number | null
  letter_body?: string | null
  letter_issued_at?: string | null
  is_paid?: boolean | null
  is_half_day: boolean
  is_emergency_exception: boolean
  exception_reason: string | null
  reason: string | null
  status: string
  current_owner_id: string | null
  submitted_at: string | null
  decided_at: string | null
  created_at: string
  updated_at: string
  employee?: EmployeeDto | null
  leave_type?: LeaveTypeDto | null
  policy?: PolicyDto | null
  current_owner?: EmployeeDto | null
  assignments?: WorkflowAssignmentRaw[]
  documents?: DocumentDto[]
  signature_path?: string
  signature_hash?: string
}

export interface SignatureSeal {
  id: number
  /** Employee id of the signer — matches step.assigneeId on the chain. */
  actor_id: string
  actor_name: string | null
  approval_action: 'approved' | 'rejected' | 'returned'
  signature_type: 'digital' | 'wet_ink_reference'
  signature_hash: string
  signature_hash_prefix: string
  signed_at: string | null
  /** Stored ceremony image as a base64 data URL; null for seals without one. */
  image_data_url: string | null
}

export interface WorkflowAssignmentRaw {
  id: number
  request_id: number
  step_id: number
  assigned_employee_id: string | null
  assigned_role_id: string
  /** Catalog display name appended by the API (e.g. "HR Reviewer"). */
  role_label?: string | null
  /** `delegation` when the step was routed through a delegation. */
  via?: string
  delegated_from_employee_id?: string | null
  status: 'pending' | 'queued' | 'done' | 'skipped'
  due_at: string | null
  decided_at: string | null
  /** Latest decision on the assignment (approved/returned/rejected). */
  decision?: 'approved' | 'returned' | 'rejected' | null
  /** Comment recorded with that decision — shown to the current approver. */
  decision_comment?: string | null
  assignee?: EmployeeDto | null
}

export interface ChainItem {
  step_id: number | null
  role: string
  role_label: string
  assignee_id: string | null
  assignee_name: string | null
  assignee_initials?: string | null
  via: string
  sla_days: number
  due_at: string
  note: string | null
}

export interface ApprovalInsight {
  annual_balance: { accrued: number; used: number; remaining: number; carryOver: number } | null
  annual_request_number: number | null
  payment_eligible: boolean
  balance_breakdown?: BalanceBreakdown | null
}

export interface BalanceBreakdown {
  service_year_start: string
  service_year_end: string
  earned: number
  carry_over: number
  used: number
  remaining: number
  used_by_type: { code: string | null; name: string | null; days: number }[]
  ledger_rows: { transaction_type: string; direction: string; amount: number; reason_code: string | null; reason: string | null; created_at: string | null }[]
}

export interface DecideResponse {
  message: string
  blocked_by_handover: boolean
  data: RequestCompact
}

export interface InboxItem {
  assignment_id: number
  request_ref: string | null
  employee: string | null
  leave_type: string | null
  days: number | null
  start_date: string | null
  due_at: string | null
  role: string | null
  /** Assignment landed outside the caller's zone/department record scope. */
  out_of_scope: boolean
}

export interface DocumentDto {
  id: number
  request_id: number
  file_ref: string
  document_type: string
  name: string
  size: string
  uploaded_by_user_id: string | null
  uploaded_at: string
}

export interface StoreLeaveRequestInput {
  leave_type_id: string
  start_date: string
  end_date?: string | null
  is_half_day?: boolean
  reason?: string | null
  is_emergency_exception?: boolean
  exception_reason?: string | null
}

export interface EligibilityDto {
  leave_type_id: string
  code: string
  name: string
  eligible: boolean
  policy_ok: boolean
  tenure_ok: boolean
  balance_remaining: number
  max_days_per_request: number
  min_notice_days: number
  blockers: string[]
}

export interface OrgEligibility {
  total_eligible: number
  total_employees: number
  per_department: { department_id: string | null; eligible: number; total: number }[]
  per_zone: { zone_id: string | null; eligible: number; total: number }[]
}

export interface RegisterEmployeeInput {
  full_name: string
  initials?: string
  payroll_no?: string | null
  position_id: string | null
  department_id: string
  division_id?: string | null
  unit_id?: string | null
  zone_id: string
  gender?: 'M' | 'F'
  email?: string | null
  hire_date: string
  username: string
  password: string
  role_ids?: string[]
  supervisor_employee_id?: string
  is_active?: boolean
}

// ---------------------------------------------------------------------------
// Delegations / cases / handovers
// ---------------------------------------------------------------------------
export interface DelegationDto {
  id: string
  delegator_employee_id: string
  delegate_employee_id: string
  role_id: string
  start_date: string
  end_date: string
  authorized_by: string
  active: boolean
  delegator?: EmployeeDto | null
  delegate?: EmployeeDto | null
  role?: RoleDto | null
}

export interface CaseDto {
  id: number
  ref: string
  kind: 'court_case' | 'docket'
  request_id: number | null
  assigned_prosecutor_id: string | null
  next_hearing_date: string | null
  status: 'active' | 'closed'
  owner_id: string | null
  note: string | null
  prosecutor?: EmployeeDto | null
  owner?: EmployeeDto | null
}

export interface HandoverDto {
  id: number
  request_id: number
  case_id: number
  from_employee_id: string
  to_employee_id: string
  status: 'proposed' | 'accepted' | 'rejected' | 'completed'
  proposed_at: string | null
  responded_at: string | null
  reviewed_by: string | null
  reviewed_at: string | null
  notes: string | null
  case?: CaseDto | null
  from?: EmployeeDto | null
  to?: EmployeeDto | null
  reviewer?: EmployeeDto | null
}

export interface HandoverIndexResponse {
  data: HandoverDto[]
  missing: { empty: boolean; refs: string[]; cases?: { id: number; ref: string; next_hearing_date: string | null }[] }
}

export interface PendingHandoverDto {
  id: number
  case_id: number
  case_ref: string | null
  case_kind: string | null
  next_hearing_date: string | null
  request_id: number
  request_ref: string | null
  requester_name: string | null
  from_name: string | null
  reason: string | null
  proposed_at: string | null
}

// ---------------------------------------------------------------------------
// Notifications / audit / roles
// ---------------------------------------------------------------------------
export interface NotificationDto {
  id: number
  recipient_employee_id: string
  channel: string
  event_type: string
  related_entity_type: string | null
  related_entity_id: number | string | null
  message: string
  is_privacy_safe: boolean
  sent_at: string | null
  read_at: string | null
}

export interface AuditDto {
  id: number
  entity_type: string
  entity_id: string
  action: string
  actor_user_id: string | null
  payload: Record<string, unknown> | string
  reason: string | null
  prev_hash: string | null
  row_hash: string
  created_at: string | null
  actor?: {
    id: string
    username: string
    employee?: { id: string; full_name: string } | null
  } | null
}

export interface VerifyResult {
  valid: boolean
  broken_at_id: number | null
  last_hash: string | null
  count: number
}

export interface PermissionDto {
  id: number
  code: string
  module: string
  action: string
  label: string | null
  hint: string | null
  /** False for planned/deactivated codes: the backend refuses to grant them, so
   *  the matrix must not offer them as toggleable either. */
  is_grantable?: boolean
}

export interface RoleDto {
  id: string
  name: string
  /** Human-readable explanation of what the role is for. Nullable for seeded roles. */
  description: string | null
  approval_tier: number | null
  is_final_authority: boolean
  is_system: boolean
  /** Archived roles (delete = deactivate) keep their row but grant nothing. */
  active?: boolean
  permissions: PermissionDto[]
}

// ---------------------------------------------------------------------------
// Reports
// ---------------------------------------------------------------------------
export interface ZoneReportRow { zone_id: string | null; name: string; days: number; employees: number; requests: number }
export interface DepartmentReportRow { department_id: string | null; name: string; days: number; employees: number; requests: number }
export interface ReportFilters {
  [key: string]: string | number | boolean | undefined
  from?: string; to?: string; leave_cycle?: string
  department_id?: string; zone_id?: string; employee_id?: string
  leave_type_id?: string; leave_status?: string; payment_status?: string
  eligibility_status?: string; payment_type?: string; gender?: string
  search?: string; sort?: string; direction?: 'asc' | 'desc'
  page?: number; per_page?: number
}

export interface ReportPageMeta {
  current_page: number; per_page: number; total: number
  last_page: number; from: number | null; to: number | null
  filters: ReportFilters; audience?: string
}

export interface ReportPageLinks { first: string | null; last: string | null; prev: string | null; next: string | null }

export interface ReportPage<T> { data: T[]; meta: ReportPageMeta; links: ReportPageLinks }

export interface ReportExportDto {
  id: number
  report_type: string
  format: 'csv' | 'pdf'
  status: 'queued' | 'processing' | 'completed' | 'failed' | 'expired' | 'cancelled'
  row_count: number | null
  column_count: number | null
  generated_at: string | null
  expires_at: string | null
  failure_reason: string | null
  is_downloadable: boolean
}

export interface DetailRequestRow {
  id: number; ref: string
  employee: { id: string; full_name: string } | null
  department: { id: string; name: string } | null
  zone: { id: string; name: string; short: string } | null
  leave_type: { id: string; code: string; name: string } | null
  days: number | null; status: string
  start_date: string | null; end_date: string | null; submitted_at: string | null
}

export interface DetailStaffRow {
  id: string; full_name: string; initials: string | null
  avatar_initials?: string | null
  department: { id: string; name: string } | null
  zone: { id: string; name: string; short: string } | null
  gender: string | null; hire_date: string | null
}

export interface ReportSummary {
  cards: {
    approved_days: { total: number }; pending: { total: number }; staff: { total: number }
    gender: { F: number; M: number } | null; requests_logged: { total: number }
  }
  by_zone: { zone_id: string | null; zone: string; requests: number; days: number }[]
  by_type: { leave_type_id: string; name: string; days: number }[]
  status_mix: { status: string; count: number }[]
}

export interface PaymentSummary {
  cards: {
    total_eligible: { total: number }; paid: { total: number }
    eligible_unpaid: { total: number }; without_payment_request: { total: number }
    leave_taken_unpaid: { total: number }; eligible_no_leave: { total: number }
    pending_hr: { total: number }; pending_accounting: { total: number }
    processing: { total: number }; rejected: { total: number }
  }
  amounts: {
    total_eligible_amount: number; total_approved_amount: number
    total_paid_amount: number; outstanding_amount: number; currency: string
  }
}

export interface PaymentCaseRow {
  id: number; payment_type: string; status: string; currency: string | null
  eligible_amount: number | null; calculated_amount: number | null
  employee?: { id: string; full_name: string; department?: unknown; zone?: unknown } | null
  leave_type?: { id: string; code?: string; name?: string } | null
  leave_request?: { id: number; ref?: string; status?: string; start_date?: string | null; end_date?: string | null; days?: number | null } | null
  [key: string]: unknown
}

export interface LeavePaymentCaseDto {
  id: number
  employee_id: string | null
  leave_request_id: number | null
  leave_type_id: string | null
  payment_type: string
  status: string
  eligible_amount: number | null
  calculated_amount: number | null
  currency: string | null
  salary_basis?: string | null
  salary_amount?: number | null
  employee?: { id: string; full_name: string; department_id?: string | null; zone_id?: string | null } | null
  leave_type?: { id: string; code?: string; name?: string } | null
  leave_request?: { id: number; ref?: string; status?: string; start_date?: string | null; end_date?: string | null; days?: number | null } | null
}

export interface PaymentPairRow {
  employee: { id: string; full_name: string; department: unknown; zone: unknown }
  leave_type: { id: string; code?: string; name?: string }
  leave_request: { id: number; ref: string; status: string; start_date: string | null; end_date: string | null; days: number | null } | null
  payment_case: PaymentCaseRow | null
  eligibility: string
}

export interface TypeReportRow { leave_type: string; name: string; days: number; requests: number }
export interface GenderReportRow { gender: 'M' | 'F'; employees: number; requests: number }
export interface BottleneckRow { role: string; pending: number; overdue: number; tip: string | null }
export interface UpcomingRow { ref: string; employee: string; department_id: string | null; zone_id: string | null; leave_type: string; start_date: string; end_date: string; days: number }
export interface MonthlyRow { month: string; days: number; employees: number }
export interface ForecastRow { department: string; requests: number; days: number; window: { earliest: string | null; latest: string | null } }
export interface StaffingRow { date: string; absent_total: number; per_department: { department_id: string | null; absent: number }[]; tip: string | null }

// ---------------------------------------------------------------------------
// Transport
// ---------------------------------------------------------------------------
let bearerToken: string | null = null

export function setApiToken(token: string | null) {
  bearerToken = token
}

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public fieldErrors?: Record<string, string[]>,
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = {
    Accept: 'application/json',
    ...(options.body ? { 'Content-Type': 'application/json' } : {}),
  }
  if (bearerToken) headers.Authorization = `Bearer ${bearerToken}`

  const url = `/api${path}`
  const res = await fetch(url, { ...options, headers })

  if (res.status === 204) return undefined as T

  let data: unknown = null
  try {
    data = await res.json()
  } catch {
    data = null
  }

  if (!res.ok) {
    const msg =
      (data as { message?: string })?.message ??
      (data as { detail?: string })?.detail ??
      `Request failed (${res.status})`
    const errors = (data as { errors?: Record<string, string[]> })?.errors
    throw new ApiError(res.status, msg, errors)
  }

  return data as T
}

function qs(params: Record<string, string | number | boolean | undefined>): string {
  const p = new URLSearchParams()
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== '') p.set(k, String(v))
  }
  const s = p.toString()
  return s ? `?${s}` : ''
}

// ---------------------------------------------------------------------------
// Client
// ---------------------------------------------------------------------------
export const leaveApi = {
  auth: {
    login: (email: string, password: string) =>
      request<LoginResponse>('/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
    me: () => request<{ user: AuthUser }>('/me'),
    logout: () => request<{ message: string }>('/logout', { method: 'POST' }),
    updateMe: (body: { email?: string | null; payroll_no?: string | null; current_password?: string; new_password?: string }) =>
      request<{ user: AuthUser }>('/me', { method: 'PATCH', body: JSON.stringify(body) }),
  },

  org: {
    zones: () => request<{ data: ZoneDto[] }>('/org/zones'),
    departments: () => request<{ data: DepartmentDto[] }>('/org/departments'),
    positions: () => request<{ data: PositionDto[] }>('/org/positions'),
    employees: (params?: { department_id?: string; active?: boolean }) =>
      request<{ data: EmployeeDto[] }>(`/org/employees${qs({ ...(params ?? {}) })}`),
    createEmployee: (body: {
      full_name: string
      first_name?: string | null
      middle_name?: string | null
      last_name?: string | null
      profile_photo_path?: string | null
      initials?: string
      payroll_no?: string | null
      position_id: string | null
      department_id: string
      division_id?: string | null
      unit_id?: string | null
      zone_id: string
      gender?: 'M' | 'F'
      email?: string | null
      hire_date: string
      username: string
      password: string
      role_ids?: string[]
      supervisor_employee_id?: string
      is_active?: boolean
    }) => request<{ data: EmployeeDto }>('/org/employees', { method: 'POST', body: JSON.stringify(body) }),
    tree: () => request<{ data: OrgBranch[] }>('/org/tree'),
    updateEmployee: (id: string, body: Partial<Pick<EmployeeDto, 'full_name' | 'initials' | 'payroll_no' | 'position_id' | 'department_id' | 'zone_id' | 'gender' | 'email' | 'hire_date' | 'is_active'> & { role_ids?: string[] } & { password?: string }>) =>
      request<{ data: EmployeeDto }>(`/org/employees/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
    /** Force-delete a staff member; linked leave history is removed, evidence/payment records are preserved. */
    deleteEmployee: (id: string, reason: string) =>
      request<{ message: string; detached_documents?: number; detached_payment_cases?: number }>(`/org/employees/${id}`, { method: 'DELETE', body: JSON.stringify({ reason }) }),
    /** Toggle a single unscoped role grant. Preferred over a full role_ids
     *  replacement, which would materialise unscoped duplicates of scoped
     *  department/zonal grants. */
    grantRole: (employeeId: string, roleId: string) =>
      request<{ data: EmployeeDto & { unscoped_role_ids: string[] } }>(`/org/employees/${employeeId}/roles/${roleId}`, { method: 'POST' }),
    revokeRole: (employeeId: string, roleId: string) =>
      request<{ data: EmployeeDto & { unscoped_role_ids: string[] } }>(`/org/employees/${employeeId}/roles/${roleId}`, { method: 'DELETE' }),
    storePosition: (body: { title: string; department_id?: string | null; division_id?: string | null; unit_id?: string | null; zone_id?: string | null }) =>
      request<{ data: PositionDto }>('/org/positions', { method: 'POST', body: JSON.stringify(body) }),
    updatePosition: (id: string, body: Partial<{ title: string; department_id?: string | null; division_id?: string | null; unit_id?: string | null; zone_id?: string | null }>) =>
      request<{ data: PositionDto }>(`/org/positions/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
    deletePosition: (id: string) => request<{ message: string; detached_employees?: number }>(`/org/positions/${id}`, { method: 'DELETE' }),
    storeZone: (body: { name: string; short?: string | null; is_hq?: boolean; is_pemba?: boolean; is_coordination?: boolean }) =>
      request<{ data: ZoneDto }>('/org/zones', { method: 'POST', body: JSON.stringify(body) }),
    updateZone: (id: string, body: Partial<{ name: string; short?: string | null; is_hq?: boolean; is_pemba?: boolean; is_coordination?: boolean }>) =>
      request<{ data: ZoneDto }>(`/org/zones/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
    deleteZone: (id: string) => request<{ message: string }>(`/org/zones/${id}`, { method: 'DELETE' }),
    storeDepartment: (body: { name: string; zone_id: string }) =>
      request<{ data: DepartmentDto }>('/org/departments', { method: 'POST', body: JSON.stringify(body) }),
    updateDepartment: (id: string, body: Partial<{ name: string; zone_id: string }>) =>
      request<{ data: DepartmentDto }>(`/org/departments/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
    deleteDepartment: (id: string) => request<{ message: string }>(`/org/departments/${id}`, { method: 'DELETE' }),
    setDepartmentHead: (departmentId: string, employeeId: string) =>
      request<{ data: DepartmentDto }>(`/org/departments/${departmentId}/head`, { method: 'PUT', body: JSON.stringify({ employee_id: employeeId }) }),
    clearDepartmentHead: (departmentId: string) =>
      request<{ data: DepartmentDto }>(`/org/departments/${departmentId}/head`, { method: 'DELETE' }),
    divisions: (params?: { parent_department_id?: string; zone_id?: string; is_active?: boolean }) => {
      const q = new URLSearchParams()
      if (params?.parent_department_id) q.set('parent_department_id', params.parent_department_id)
      if (params?.zone_id) q.set('zone_id', params.zone_id)
      if (params?.is_active !== undefined) q.set('is_active', String(params.is_active))
      const qs = q.toString()
      return request<{ data: DivisionDto[]; pagination?: any }>(`/org/divisions${qs ? '?' + qs : ''}`)
    },
    getDivision: (id: string) => request<{ data: DivisionDto; employees?: any[] }>(`/org/divisions/${id}`),
    getDivisionEmployees: (id: string, params?: { active?: boolean; page?: number; per_page?: number }) => {
      const q = new URLSearchParams()
      if (params?.active !== undefined) q.set('active', String(params.active))
      if (params?.page) q.set('page', String(params.page))
      if (params?.per_page) q.set('per_page', String(params.per_page))
      const qs = q.toString()
      return request<{ data: any[]; pagination?: any }>(`/org/divisions/${id}/employees${qs ? '?' + qs : ''}`)
    },
    assignDivisionHead: (divisionId: string, employeeId: string) =>
      request<{ data: any }>(`/org/divisions/${divisionId}/head`, { method: 'POST', body: JSON.stringify({ employee_id: employeeId }) }),
    units: (params?: { zone_id?: string; is_active?: boolean }) => {
      const q = new URLSearchParams()
      if (params?.zone_id) q.set('zone_id', params.zone_id)
      if (params?.is_active !== undefined) q.set('is_active', String(params.is_active))
      const qs = q.toString()
      return request<{ data: UnitDto[]; pagination?: any }>(`/org/units${qs ? '?' + qs : ''}`)
    },
    getUnit: (id: string) => request<{ data: UnitDto; employees?: any[] }>(`/org/units/${id}`),
    getUnitEmployees: (id: string, params?: { active?: boolean; page?: number; per_page?: number }) => {
      const q = new URLSearchParams()
      if (params?.active !== undefined) q.set('active', String(params.active))
      if (params?.page) q.set('page', String(params.page))
      if (params?.per_page) q.set('per_page', String(params.per_page))
      const qs = q.toString()
      return request<{ data: any[]; pagination?: any }>(`/org/units/${id}/employees${qs ? '?' + qs : ''}`)
    },
    assignUnitHead: (unitId: string, employeeId: string) =>
      request<{ data: any }>(`/org/units/${unitId}/head`, { method: 'POST', body: JSON.stringify({ employee_id: employeeId }) }),
    approvalRoles: () => request<{ data: ApprovalRoleDto[] }>('/org/approval-roles'),
    storeDivision: (body: { name: string; code?: string; parent_department_id?: string | null; unit_type?: string; reports_directly_to_leadership?: boolean }) =>
      request<{ data: DivisionDto }>('/org/divisions', { method: 'POST', body: JSON.stringify(body) }),
    updateDivision: (id: string, body: Partial<{ name: string; code: string; parent_department_id?: string | null; unit_type?: string; reports_directly_to_leadership?: boolean }>) =>
      request<{ data: DivisionDto }>(`/org/divisions/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
    deleteDivision: (id: string) => request<{ message: string }>(`/org/divisions/${id}`, { method: 'DELETE' }),
    storeUnit: (body: { name: string; code?: string; reports_directly_to_leadership?: boolean }) =>
      request<{ data: UnitDto }>('/org/units', { method: 'POST', body: JSON.stringify(body) }),
    updateUnit: (id: string, body: Partial<{ name: string; code: string; reports_directly_to_leadership?: boolean }>) =>
      request<{ data: UnitDto }>(`/org/units/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
    deleteUnit: (id: string) => request<{ message: string }>(`/org/units/${id}`, { method: 'DELETE' }),
    setZoneHead: (zoneId: string, employeeId: string) =>
      request<{ data: ZoneDto }>(`/org/zones/${zoneId}/head`, { method: 'PUT', body: JSON.stringify({ employee_id: employeeId }) }),
    clearZoneHead: (zoneId: string) =>
      request<{ data: ZoneDto }>(`/org/zones/${zoneId}/head`, { method: 'DELETE' }),
  },

  leave: {
    types: () => request<{ data: LeaveTypeDto[] }>('/leave/types'),
    storeType: (body: { code: string; name: string; swahili?: string; short?: string; is_paid_default?: boolean; description?: string }) =>
      request<{ data: LeaveTypeDto }>('/leave/types', { method: 'POST', body: JSON.stringify(body) }),
    updateType: (id: string, body: Partial<{ code: string; name: string; swahili: string; short: string; is_paid_default: boolean; description: string }>) =>
      request<{ data: LeaveTypeDto }>(`/leave/types/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
    /** Delete — the API refuses types carrying history (422) and removes their policies + workflow. */
    destroyType: (id: string) => request<{ message: string }>(`/leave/types/${id}`, { method: 'DELETE' }),
    currentPolicies: () => request<{ data: PolicyCompactDto[] }>('/leave/policies/current'),
    policyHistory: (leaveTypeId: string) => request<{ data: PolicyDto[] }>(`/leave/policies/${leaveTypeId}/history`),
    myBalance: () => request<{ data: Record<string, BalanceDto> }>('/leave/balance'),
    balanceFor: (leaveTypeId: string) => request<{ data: BalanceDto }>(`/leave/balance/${leaveTypeId}`),
    tips: (leaveTypeId: string) => request<{ data: TipDto[] | null }>(`/leave/tips/${leaveTypeId}`),
  },

  eligibility: {
    my: () => request<{ data: EligibilityDto[]; org: OrgEligibility }>('/eligibility'),
  },

  requests: {
    list: (params?: { scope?: 'all' | 'mine'; per_page?: number }) =>
      request<{ data: Paginated<RequestDto> }>(`/requests${qs(params ?? {})}`),
    get: (id: number | string) => request<RequestCompact>(`/requests/${id}`),
    create: (body: StoreLeaveRequestInput) =>
      request<{ data: RequestDto }>('/requests', { method: 'POST', body: JSON.stringify(body) }),
    update: (id: number | string, body: StoreLeaveRequestInput) =>
      request<{ data: RequestCompact }>(`/requests/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
    submit: (id: number | string) =>
      request<{ data: RequestCompact; workflow: ChainItem[] }>(`/requests/${id}/submit`, { method: 'POST' }),
    resubmit: (id: number | string) =>
      request<{ data: RequestCompact; workflow: ChainItem[] }>(`/requests/${id}/resubmit`, { method: 'POST' }),
    decide: (id: number | string, body: { decision: 'approved' | 'rejected' | 'returned'; comments?: string; end_date?: string | null; signature_hash?: string; signature_image?: string | null; is_paid?: boolean | null; reference_number?: string | null; approved_days?: number | null; letter_body?: string | null }) =>
      request<DecideResponse>(`/requests/${id}/decide`, { method: 'POST', body: JSON.stringify(body) }),
    /** Approval signature seals for the letter — one per recorded decision, with the stored ceremony image inlined as a data URL. */
    signaturesFor: (id: number | string) => request<{ data: SignatureSeal[] }>(`/requests/${id}/signatures`),
    withdraw: (id: number | string, body: { reason?: string } = {}) =>
      request<{ data: RequestDto }>(`/requests/${id}/withdraw`, { method: 'POST', body: JSON.stringify(body) }),
    /** Hard delete — drafts only; the API keeps submitted history forever. */
    destroy: (id: number | string) =>
      request<{ message: string; id: number | string }>(`/requests/${id}`, { method: 'DELETE' }),
    /** Force-delete a request of any status; audit/evidence and payment history are retained. */
    forceDelete: (id: number | string, reason: string) =>
      request<{ message: string; id: number | string; detached_documents?: number; preserved_payment_cases?: number }>(`/requests/${id}/force`, { method: 'DELETE', body: JSON.stringify({ reason }) }),
    workflow: (id: number | string) => request<{ data: ChainItem[] }>(`/requests/${id}/workflow`),
    approvalInsight: (id: number | string) => request<{ data: ApprovalInsight }>(`/requests/${id}/approval-insight`),
    inbox: () => request<{ data: InboxItem[] }>('/requests/inbox'),
    preview: (body: { employee_id: string; leave_type_id: string; days?: number | null }) =>
      request<{ data: ChainItem[] }>('/requests/preview', { method: 'POST', body: JSON.stringify(body) }),
    attachDocument: (id: number | string, file: File, kind?: string) => {
      const fd = new FormData()
      fd.append('file', file)
      if (kind) fd.append('kind', kind)
      const headers: Record<string, string> = { Accept: 'application/json', 'X-Requested-With': 'XMLHttpRequest' }
      if (bearerToken) headers.Authorization = `Bearer ${bearerToken}`
      return fetch(`/api/requests/${id}/documents`, { method: 'POST', body: fd, headers }).then(async (res) => {
        const data = await res.json().catch(() => null)
        if (!res.ok) {
          // Surface the field-level validation message ("the file must be a
          // file of type: pdf, doc, docx...") instead of a generic failure so
          // the uploader knows whether it was the type or the size.
          const first = data?.errors && typeof data.errors === 'object'
            ? (Object.values(data.errors as Record<string, unknown>)[0] as unknown)
            : null
          const fieldMessage = Array.isArray(first) ? String(first[0]) : null
          throw new ApiError(res.status, fieldMessage ?? data?.message ?? 'Upload failed', data?.errors)
        }
        return data as { data: DocumentDto }
      })
    },
    /** Documents attached to a request that the caller is allowed to see. */
    documents: (id: number | string) =>
      request<{ data: DocumentDto[] }>(`/requests/${id}/documents`),
    /** Fetch the stored file with the bearer token and hand it to the browser. */
    downloadDocument: async (id: number | string, docId: number | string) => {
      const headers: Record<string, string> = { Accept: 'application/json' }
      if (bearerToken) headers.Authorization = `Bearer ${bearerToken}`
      const res = await fetch(`/api/requests/${id}/documents/${docId}/download`, { headers })
      if (!res.ok) throw new ApiError(res.status, 'Document download failed')
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.target = '_blank'
      link.rel = 'noopener'
      link.click()
      // Revoke on the next tick so the browser can start the request.
      setTimeout(() => URL.revokeObjectURL(url), 60_000)
    },
  },

  workflows: {
    /**
     * Unpaginated list — still `{data: [...]}` and used by the leave-context
     * loader (coverage stats, routing tips). The Workflow Management table
     * uses `paginate()` below.
     */
    list: () => request<{ data: WorkflowDefDto[] }>('/workflows'),
    paginate: (params: WorkflowListParams = {}) =>
      request<Paginated<WorkflowDefDto>>(
        `/workflows${qs({
          page: params.page,
          per_page: params.per_page,
          search: params.search,
          leave_type_id: params.leave_type_id,
          status: params.status,
          scope: params.scope,
          zone_id: params.zone_id,
          department_id: params.department_id,
          sort: params.sort,
          direction: params.direction,
        })}`,
      ),
    get: (id: string) => request<{ data: WorkflowDefDto }>(`/workflows/${id}`),
    /** Employees holding an approval role, for the step's approver dropdown. */
    roleHolders: (approvalRoleId: string) =>
      request<{ data: EmployeeDto[] }>(`/workflows/role-holders/${encodeURIComponent(approvalRoleId)}`),
    /** Dry-run for the live preview: coverage, resolved chain, overlap warning. */
    check: (body: WorkflowCheckInput) =>
      request<{ data: WorkflowCheckResult }>('/workflows/check', { method: 'POST', body: JSON.stringify(body) }),
    store: (body: WorkflowStoreInput) => request<{ data: WorkflowDefDto }>('/workflows', { method: 'POST', body: JSON.stringify(body) }),
    update: (id: string, body: Partial<Omit<WorkflowStoreInput, 'leave_type_id' | 'id'>>) =>
      request<{ data: WorkflowDefDto }>(`/workflows/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
    /** Delete — the API refuses definitions carrying history or the type's last active chain (422). */
    destroy: (id: string) => request<{ message: string }>(`/workflows/${id}`, { method: 'DELETE' }),
  },

  delegations: {
    list: () => request<{ data: DelegationDto[] }>('/delegations'),
    store: (body: { delegate_employee_id: string; role_id: string; start_date: string; end_date: string }) =>
      request<{ data: DelegationDto }>('/delegations', { method: 'POST', body: JSON.stringify(body) }),
    revoke: (id: string) => request<{ data: DelegationDto }>(`/delegations/${id}/revoke`, { method: 'POST' }),
  },

  cases: {
    list: () => request<{ data: CaseDto[] }>('/cases'),
    canFinalApprove: () => request<{ can_final_approve: boolean }>('/cases/can-final-approve'),
  },

  handovers: {
    list: (requestId: number | string) => request<HandoverIndexResponse>(`/handovers/${requestId}`),
    propose: (requestId: number | string, body: { to_employee_id: string; case_ids?: number[]; reason?: string }) =>
      request<{ data: HandoverDto[] }>(`/handovers/${requestId}/propose`, { method: 'POST', body: JSON.stringify(body) }),
    pendingMine: () => request<{ data: PendingHandoverDto[] }>('/handovers/pending-mine'),
    accept: (handoverId: number, notes?: string) =>
      request<{ data: HandoverDto }>(`/handovers/${handoverId}/accept`, { method: 'POST', body: JSON.stringify({ notes }) }),
    reject: (handoverId: number, notes?: string) =>
      request<{ data: HandoverDto }>(`/handovers/${handoverId}/reject`, { method: 'POST', body: JSON.stringify({ notes }) }),
    complete: (handoverId: number) =>
      request<{ data: HandoverDto }>(`/handovers/${handoverId}/complete`, { method: 'POST' }),
  },

  notifications: {
    list: (params?: { per_page?: number }) => request<{ data: Paginated<NotificationDto> }>(`/notifications${qs(params ?? {})}`),
    unreadCount: () => request<{ unread: number }>('/notifications/unread-count'),
    markRead: (id: number) => request<{ data: NotificationDto }>(`/notifications/${id}/read`, { method: 'POST' }),
  },

  audit: {
    list: (params?: { entity_type?: string; entity_id?: string; per_page?: number }) =>
      request<{ data: Paginated<AuditDto> }>(`/audit${qs(params ?? {})}`),
    verify: () => request<{ data: VerifyResult }>('/audit/verify'),
  },

  roles: {
    list: () => request<{ data: RoleDto[] }>('/roles'),
    permissions: () => request<{ data: PermissionDto[] }>('/roles/permissions'),
    store: (body: { id?: string; name: string; description?: string | null; approval_tier?: number | null; is_final_authority?: boolean; permissions?: string[] }) =>
      request<{ data: RoleDto }>('/roles', { method: 'POST', body: JSON.stringify(body) }),
    update: (id: string, body: Partial<{ name: string; description: string | null; approval_tier: number | null; is_final_authority: boolean; permissions: string[] }>) =>
      request<{ data: RoleDto }>(`/roles/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
    /** Workflow-referenced roles are refused with a 422 + `blockers` list unless
     *  `reassignTo` hands those steps to another live role in the same call. */
    destroy: (id: string, reassignTo?: string) =>
      request<{ data: { id: string; archived: boolean; reassign_to?: string } }>(`/roles/${id}`, {
        method: 'DELETE',
        ...(reassignTo ? { body: JSON.stringify({ reassign_to: reassignTo }) } : {}),
      }),
  },

  policies: {
    store: (body: {
      leave_type_id: string
      max_days_per_year?: number
      max_days_per_request?: number
      min_tenure_months?: number
      min_notice_days?: number
      requires_documents?: boolean
      required_docs?: string[]
      carry_over_max?: number
      allow_half_day?: boolean
      effective_from: string
      notes?: string | null
    }) => request<{ data: PolicyDto }>('/policies', { method: 'POST', body: JSON.stringify(body) }),
  },

  reports: {
    createExport: (body: { report_type: string; format: 'csv' | 'pdf'; filters?: Record<string, string | undefined> }) =>
      request<{ data: ReportExportDto }>('/reports/exports', { method: 'POST', body: JSON.stringify(body) }),
    /** Streams the generated file with the bearer token; the browser saves the blob. */
    downloadExport: async (id: number): Promise<Blob> => {
      const headers: Record<string, string> = {}
      if (bearerToken) headers.Authorization = `Bearer ${bearerToken}`
      const res = await fetch(`/api/reports/exports/${id}/download`, { headers })
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { message?: string } | null
        throw new ApiError(res.status, body?.message ?? `Download failed (${res.status})`)
      }
      return res.blob()
    },
    listExports: (params?: { status?: string; report_type?: string; per_page?: number }) =>
      request<{ data: ReportExportDto[]; meta: ReportPageMeta }>(`/reports/exports${qs(params ?? {})}`),
    zone: (params?: { from?: string; to?: string }) => request<{ data: ZoneReportRow[] }>(`/reports/zone${qs(params ?? {})}`),
    department: (params?: { from?: string; to?: string }) => request<{ data: DepartmentReportRow[] }>(`/reports/department${qs(params ?? {})}`),
    type: (params?: { from?: string; to?: string }) => request<{ data: TypeReportRow[] }>(`/reports/type${qs(params ?? {})}`),
    gender: (params?: { from?: string; to?: string }) => request<{ data: GenderReportRow[] }>(`/reports/gender${qs(params ?? {})}`),
    bottleneck: () => request<{ data: BottleneckRow[] }>(`/reports/bottleneck`),
    upcoming: (params?: { from?: string; to?: string }) => request<{ data: UpcomingRow[] }>(`/reports/upcoming${qs(params ?? {})}`),
    monthly: (params?: { from?: string; to?: string }) => request<{ data: MonthlyRow[] }>(`/reports/monthly${qs(params ?? {})}`),
    forecast: () => request<{ data: ForecastRow[] }>(`/reports/forecast`),
    staffing: (params?: { from?: string; to?: string }) => request<{ data: StaffingRow[] }>(`/reports/staffing${qs(params ?? {})}`),
    /** Office summary: card totals + zone/type/status aggregates, one definition shared with every detail endpoint. */
    summary: (params?: ReportFilters) => request<{ data: ReportSummary; meta: { filters: ReportFilters } }>(`/reports/summary${qs(params ?? {})}`),
    /** Generic drill-down: kind selects the detail endpoint, params carry the shared filters. */
    details: (kind: 'approved-days' | 'pending' | 'staff' | 'requests', params?: ReportFilters) =>
      request<ReportPage<DetailRequestRow | DetailStaffRow>>(`/reports/${kind}/details${qs(params ?? {})}`),
    genderDetails: (gender: 'M' | 'F', params?: ReportFilters) =>
      request<ReportPage<DetailRequestRow>>(`/reports/gender/${gender}/details${qs(params ?? {})}`),
    zoneDetails: (zone: string, params?: ReportFilters) =>
      request<ReportPage<DetailRequestRow>>(`/reports/leave-usage-by-zone/${zone}/details${qs(params ?? {})}`),
    typeDetails: (leaveType: string, params?: ReportFilters) =>
      request<ReportPage<DetailRequestRow>>(`/reports/leave-types/${leaveType}/details${qs(params ?? {})}`),
    statusDetails: (status: string, params?: ReportFilters) =>
      request<ReportPage<DetailRequestRow>>(`/reports/status/${status}/details${qs(params ?? {})}`),
    paymentSummary: (params?: ReportFilters) =>
      request<{ data: PaymentSummary; meta: { filters: ReportFilters; audience: string } }>(`/reports/payment/summary${qs(params ?? {})}`),
    paymentCategory: (
      kind: 'paid' | 'eligible-unpaid' | 'without-payment-request' | 'leave-taken-unpaid' | 'eligible-no-leave' | 'pending-hr' | 'pending-accounting' | 'processing' | 'rejected',
      params?: ReportFilters,
    ) => request<ReportPage<PaymentCaseRow | PaymentPairRow>>(`/reports/payment/${kind}${qs(params ?? {})}`),
    paymentHistory: (employeeId: string, params?: ReportFilters) =>
      request<ReportPage<PaymentCaseRow>>(`/reports/payment/employees/${employeeId}/history${qs(params ?? {})}`),
  },
  leavePayments: {
    list: () => request<{ data: LeavePaymentCaseDto[] }>('/leave-payments'),
    create: (body: { employee_id: string; leave_type_id: string; leave_request_id: number; payment_type?: 'leave_encashment' | 'leave_purchase'; salary_basis?: string; salary_amount?: number; days?: number; eligible_days?: number; currency?: string; idempotency_key?: string }) =>
      request<{ data: LeavePaymentCaseDto }>('/leave-payments', { method: 'POST', body: JSON.stringify(body) }),
    submit: (id: number) => request<{ data: LeavePaymentCaseDto }>(`/leave-payments/${id}/submit`, { method: 'POST', body: JSON.stringify({}) }),
    approve: (id: number) => request<{ data: LeavePaymentCaseDto }>(`/leave-payments/${id}/approve`, { method: 'POST', body: JSON.stringify({}) }),
    reject: (id: number, reason: string) => request<{ data: LeavePaymentCaseDto }>(`/leave-payments/${id}/reject`, { method: 'POST', body: JSON.stringify({ reason }) }),
    sendToAccounting: (id: number) => request<{ data: LeavePaymentCaseDto }>(`/leave-payments/${id}/send-to-accounting`, { method: 'POST', body: JSON.stringify({}) }),
    receive: (id: number) => request<{ data: LeavePaymentCaseDto }>(`/leave-payments/${id}/receive`, { method: 'POST', body: JSON.stringify({}) }),
    markPaid: (id: number) => request<{ data: LeavePaymentCaseDto }>(`/leave-payments/${id}/paid`, { method: 'POST', body: JSON.stringify({}) }),
    rejectPayment: (id: number, reason: string) => request<{ data: LeavePaymentCaseDto }>(`/leave-payments/${id}/reject-payment`, { method: 'POST', body: JSON.stringify({ reason }) }),
  },
}

export interface PermissionAuditReport {
  generated_at: string
  summary: Record<string, number>
  permissions: Array<{
    code: string
    module: string
    action: string
    label: string
    status: string
    active: boolean
    is_grantable: boolean
    enforcement_reference: string | null
    roles_count: number
    holders_count: number
  }>
  roles: Array<{ id: string; name: string; active: boolean; holders_count: number; permissions: string[] }>
  approval_roles: Array<Record<string, unknown>>
  force_delete_holders: Array<Record<string, unknown>>
  anomalies: Array<{ severity: 'critical' | 'warning' | 'info'; code: string; message: string; entity_type: string | null; entity_id: string | null }>
}
// Permission audit (read-only, admin.view)
export const getPermissionAudit = () => request<{ data: PermissionAuditReport }>('/roles/permissions/audit')

// Force delete leave request (reason required)
export const forceDeleteLeaveRequest = (id: string, reason: string) => leaveApi.requests.forceDelete(id, reason)

// Force delete employee (reason required, employees.force_delete)
export const forceDeleteEmployee = (id: string, reason: string) => leaveApi.org.deleteEmployee(id, reason)
