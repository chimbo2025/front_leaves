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

export const TODAY = '2026-09-09'

export const ZONES: Zone[] = [
  { id: 'z1', name: 'Unguja Island — Zanzibar Town', short: 'Unguja (HQ)', isHQ: true, isPemba: false },
  { id: 'z2', name: 'Unguja North', short: 'Unguja Kaskazini', isHQ: false, isPemba: false },
  { id: 'z3', name: 'Unguja South', short: 'Unguja Kusini', isHQ: false, isPemba: false },
  {
    id: 'z4',
    name: 'Pemba — Wete Coordination Office',
    short: 'Pemba',
    isHQ: false,
    isPemba: true,
    isCoordination: true,
  },
]

export const DEPARTMENTS: Department[] = [
  { id: 'd1', name: 'Administration & Human Resources', zoneId: 'z1' },
  { id: 'd2', name: 'Prosecutions', zoneId: 'z1' },
  { id: 'd3', name: 'Legal Research & Advisory', zoneId: 'z1' },
  { id: 'd4', name: 'Regional Prosecutions — Unguja North', zoneId: 'z2' },
  { id: 'd5', name: 'Regional Prosecutions — Pemba', zoneId: 'z4' },
  { id: 'd6', name: 'ICT', zoneId: 'z1' },
  { id: 'd7', name: 'Records & Archives', zoneId: 'z1' },
  { id: 'd8', name: 'Finance', zoneId: 'z1' },
]

export const POSITIONS: Position[] = [
  { id: 'p1', title: 'Director of Public Prosecutions', departmentId: 'd2', tier: 5, isFinalAuthority: true },
  { id: 'p2', title: 'Deputy Director of Public Prosecutions', departmentId: 'd2', tier: 4 },
  { id: 'p3', title: 'Director, Administration & HR', departmentId: 'd1', tier: 4 },
  { id: 'p4', title: 'Zonal / Regional Head', departmentId: 'd4', tier: 4 },
  { id: 'p5', title: 'Head of Prosecutions', departmentId: 'd2', tier: 3 },
  { id: 'p6', title: 'Senior State Attorney', departmentId: 'd2', tier: 2 },
  { id: 'p7', title: 'State Attorney I', departmentId: 'd2', tier: 1 },
  { id: 'p8', title: 'State Attorney II', departmentId: 'd2', tier: 1 },
  { id: 'p9', title: 'Human Resources Officer', departmentId: 'd1', tier: 1 },
  { id: 'p10', title: 'ICT Officer', departmentId: 'd6', tier: 1 },
  { id: 'p11', title: 'Records Officer', departmentId: 'd7', tier: 1 },
  { id: 'p12', title: 'Executive Assistant', departmentId: 'd1', tier: 1 },
]

export const EMPLOYEES: Employee[] = [
  {
    id: 'e1',
    name: 'Ali Mwinyi Khamis',
    title: 'Director of Public Prosecutions',
    initials: 'AK',
    positionId: 'p1',
    departmentId: 'd2',
    zoneId: 'z1',
    gender: 'M',
    hireDate: '2010-01-04',
    email: 'ali.khamis@dpp.go.tz',
    gradient: 'from-teal-600 to-cyan-600',
  },
  {
    id: 'e2',
    name: 'Salma Ali Juma',
    title: 'Deputy Director of Public Prosecutions',
    initials: 'SJ',
    positionId: 'p2',
    departmentId: 'd2',
    zoneId: 'z1',
    gender: 'F',
    hireDate: '2012-06-18',
    email: 'salma.juma@dpp.go.tz',
    gradient: 'from-teal-500 to-emerald-500',
  },
  {
    id: 'e3',
    name: 'Fatma Abdalla Hassan',
    title: 'Director, Administration & Human Resources',
    initials: 'FH',
    positionId: 'p3',
    departmentId: 'd1',
    zoneId: 'z1',
    gender: 'F',
    hireDate: '2011-03-01',
    email: 'fatma.hassan@dpp.go.tz',
    gradient: 'from-rose-500 to-pink-500',
  },
  {
    id: 'e4',
    name: 'Rashid Haji Rashid',
    title: 'Zonal Head — Unguja North',
    initials: 'RR',
    positionId: 'p4',
    departmentId: 'd4',
    zoneId: 'z2',
    gender: 'M',
    hireDate: '2013-09-15',
    email: 'rashid.rashid@dpp.go.tz',
    gradient: 'from-amber-500 to-orange-500',
  },
  {
    id: 'e5',
    name: 'Juma Mohammed Ali',
    title: 'Zonal Head — Pemba Coordination',
    initials: 'JA',
    positionId: 'p4',
    departmentId: 'd5',
    zoneId: 'z4',
    gender: 'M',
    hireDate: '2012-11-05',
    email: 'juma.ali@dpp.go.tz',
    gradient: 'from-sky-500 to-indigo-500',
  },
  {
    id: 'e6',
    name: 'Zaytuni Omar Juma',
    title: 'Head of Prosecutions',
    initials: 'ZJ',
    positionId: 'p5',
    departmentId: 'd2',
    zoneId: 'z1',
    gender: 'F',
    hireDate: '2014-02-20',
    email: 'zaytuni.juma@dpp.go.tz',
    gradient: 'from-violet-500 to-purple-500',
  },
  {
    id: 'e7',
    name: 'Asha Hassan Haji',
    title: 'State Attorney II',
    initials: 'AH',
    positionId: 'p8',
    departmentId: 'd2',
    zoneId: 'z1',
    gender: 'F',
    hireDate: '2018-05-10',
    email: 'asha.haji@dpp.go.tz',
    gradient: 'from-teal-500 to-cyan-500',
  },
  {
    id: 'e8',
    name: 'Mohammed Ali Salum',
    title: 'State Attorney I',
    initials: 'MS',
    positionId: 'p7',
    departmentId: 'd4',
    zoneId: 'z2',
    gender: 'M',
    hireDate: '2016-08-22',
    email: 'mohammed.salum@dpp.go.tz',
    gradient: 'from-emerald-500 to-teal-500',
  },
  {
    id: 'e9',
    name: 'Rehema Mzuri Hamad',
    title: 'State Attorney I',
    initials: 'RH',
    positionId: 'p7',
    departmentId: 'd5',
    zoneId: 'z4',
    gender: 'F',
    hireDate: '2017-01-30',
    email: 'rehema.hamad@dpp.go.tz',
    gradient: 'from-rose-500 to-fuchsia-500',
  },
  {
    id: 'e10',
    name: 'Baraka Said Maulid',
    title: 'ICT Officer',
    initials: 'BM',
    positionId: 'p10',
    departmentId: 'd6',
    zoneId: 'z1',
    gender: 'M',
    hireDate: '2019-04-08',
    email: 'baraka.maulid@dpp.go.tz',
    gradient: 'from-indigo-500 to-blue-500',
  },
  {
    id: 'e11',
    name: 'Khadija Suleiman Omar',
    title: 'Records Officer',
    initials: 'KO',
    positionId: 'p11',
    departmentId: 'd7',
    zoneId: 'z1',
    gender: 'F',
    hireDate: '2020-07-14',
    email: 'khadija.omar@dpp.go.tz',
    gradient: 'from-fuchsia-500 to-pink-500',
  },
  {
    id: 'e12',
    name: 'Haji Mwinyi Abdullah',
    title: 'Executive Assistant',
    initials: 'HA',
    positionId: 'p12',
    departmentId: 'd1',
    zoneId: 'z1',
    gender: 'M',
    hireDate: '2021-10-02',
    email: 'haji.abdullah@dpp.go.tz',
    gradient: 'from-cyan-500 to-sky-500',
  },
]

export const LEAVE_TYPES: LeaveType[] = [
  {
    id: 'lt1',
    code: 'ANNUAL',
    name: 'Annual Leave',
    swahili: 'Likizo ya Mwaka',
    short: 'Mwaka',
    paid: true,
    description: 'Annual recreational leave accrued per service year.',
    color: 'bg-emerald-500',
    soft: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-900',
  },
  {
    id: 'lt2',
    code: 'SICK',
    name: 'Sick Leave',
    swahili: 'Likizo ya Ugonjwa',
    short: 'Ugonjwa',
    paid: true,
    description: 'Leave for certified illness or injury.',
    color: 'bg-sky-500',
    soft: 'bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950 dark:text-sky-300 dark:border-sky-900',
  },
  {
    id: 'lt3',
    code: 'MATERNITY',
    name: 'Maternity Leave',
    swahili: 'Likizo ya Uzazi',
    short: 'Uzazi',
    paid: true,
    description: 'Statutory leave for mothers before and after delivery.',
    color: 'bg-rose-500',
    soft: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950 dark:text-rose-300 dark:border-rose-900',
  },
  {
    id: 'lt4',
    code: 'PATERNITY',
    name: 'Paternity Leave',
    swahili: 'Likizo ya Baba',
    short: 'Baba',
    paid: true,
    description: 'Short leave for fathers following the birth of a child.',
    color: 'bg-violet-500',
    soft: 'bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-950 dark:text-violet-300 dark:border-violet-900',
  },
  {
    id: 'lt5',
    code: 'EMERGENCY',
    name: 'Emergency Leave',
    swahili: 'Likizo ya Dharura',
    short: 'Dharura',
    paid: true,
    description: 'Urgent personal or family emergencies.',
    color: 'bg-amber-500',
    soft: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-900',
  },
  {
    id: 'lt6',
    code: 'STUDY',
    name: 'Study Leave',
    swahili: 'Likizo ya Masomo',
    short: 'Masomo',
    paid: true,
    description: 'Leave to pursue approved academic or professional training.',
    color: 'bg-fuchsia-500',
    soft: 'bg-fuchsia-50 text-fuchsia-700 border-fuchsia-200 dark:bg-fuchsia-950 dark:text-fuchsia-300 dark:border-fuchsia-900',
  },
  {
    id: 'lt7',
    code: 'WITHOUT_PAY',
    name: 'Leave Without Pay',
    swahili: 'Likizo Bila Malipo',
    short: 'Bila Malipo',
    paid: false,
    description: 'Unpaid leave approved for personal reasons.',
    color: 'bg-slate-500',
    soft: 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700',
  },
]

export const POLICIES: LeavePolicy[] = [
  {
    id: 'pol1_v1',
    leaveTypeId: 'lt1',
    version: 1,
    maxDaysPerYear: 24,
    maxDaysPerRequest: 24,
    minTenureMonths: 12,
    minNoticeDays: 14,
    requiresDocuments: false,
    requiredDocs: [],
    carryOverMax: 5,
    allowHalfDay: true,
    notes: 'Original annual policy — carry-over capped at 5 days.',
    effectiveFrom: '2023-04-01',
    effectiveTo: '2024-03-31',
  },
  {
    id: 'pol1_v3',
    leaveTypeId: 'lt1',
    version: 3,
    maxDaysPerYear: 27,
    maxDaysPerRequest: 27,
    minTenureMonths: 12,
    minNoticeDays: 14,
    requiresDocuments: false,
    requiredDocs: [],
    carryOverMax: 8,
    carryOverExpiryMonth: 3,
    allowHalfDay: true,
    notes: 'Annual policy v3 — 27 days, carry-over raised to 8.',
    effectiveFrom: '2024-04-01',
    effectiveTo: '2026-06-15',
  },
  {
    id: 'pol1',
    leaveTypeId: 'lt1',
    version: 4,
    maxDaysPerYear: 30,
    maxDaysPerRequest: 30,
    minTenureMonths: 12,
    minNoticeDays: 14,
    requiresDocuments: false,
    requiredDocs: [],
    carryOverMax: 10,
    carryOverExpiryMonth: 3,
    allowHalfDay: true,
    notes: 'Current annual policy v4 — 30 days, carry-over raised to 10. >20 days requires final authority.',
    effectiveFrom: '2026-06-16',
  },
  {
    id: 'pol2_v1',
    leaveTypeId: 'lt2',
    version: 1,
    maxDaysPerYear: 10,
    maxDaysPerRequest: 10,
    minTenureMonths: 0,
    minNoticeDays: 1,
    requiresDocuments: true,
    requiredDocs: ['Medical certificate'],
    carryOverMax: 0,
    allowHalfDay: true,
    notes: 'Original sick policy — 10 days.',
    effectiveFrom: '2024-01-01',
    effectiveTo: '2025-08-01',
  },
  {
    id: 'pol2_v2',
    leaveTypeId: 'lt2',
    version: 2,
    maxDaysPerYear: 12,
    maxDaysPerRequest: 12,
    minTenureMonths: 0,
    minNoticeDays: 1,
    requiresDocuments: true,
    requiredDocs: ['Medical certificate'],
    carryOverMax: 0,
    allowHalfDay: true,
    notes: 'Sick leave v2 — 12 days, extended for seasonal malaria.',
    effectiveFrom: '2025-08-02',
    effectiveTo: '2026-03-01',
  },
  {
    id: 'pol2',
    leaveTypeId: 'lt2',
    version: 3,
    maxDaysPerYear: 14,
    maxDaysPerRequest: 14,
    minTenureMonths: 0,
    minNoticeDays: 1,
    requiresDocuments: true,
    requiredDocs: ['Medical certificate'],
    carryOverMax: 0,
    allowHalfDay: true,
    notes: 'Current sick policy v3 — 14 days. Medical certificate mandatory beyond 3 days.',
    effectiveFrom: '2026-03-02',
  },
  {
    id: 'pol3_v1',
    leaveTypeId: 'lt3',
    version: 1,
    maxDaysPerYear: 84,
    maxDaysPerRequest: 84,
    minTenureMonths: 6,
    minNoticeDays: 7,
    requiresDocuments: true,
    requiredDocs: ['Antenatal record', 'Birth certificate (post-delivery)'],
    carryOverMax: 0,
    allowHalfDay: false,
    notes: 'Original maternity policy — 84 days, 6 months tenure.',
    effectiveFrom: '2023-01-01',
    effectiveTo: '2025-10-01',
  },
  {
    id: 'pol3',
    leaveTypeId: 'lt3',
    version: 2,
    maxDaysPerYear: 84,
    maxDaysPerRequest: 84,
    minTenureMonths: 6,
    minNoticeDays: 7,
    requiresDocuments: true,
    requiredDocs: ['Antenatal record', 'Birth certificate (post-delivery)'],
    carryOverMax: 0,
    allowHalfDay: false,
    notes: 'Current maternity policy v2 — final authority approval required, acting cover mandatory.',
    effectiveFrom: '2025-10-02',
  },
  {
    id: 'pol4',
    leaveTypeId: 'lt4',
    version: 2,
    maxDaysPerYear: 7,
    maxDaysPerRequest: 7,
    minTenureMonths: 0,
    minNoticeDays: 1,
    requiresDocuments: true,
    requiredDocs: ['Birth certificate'],
    carryOverMax: 0,
    allowHalfDay: false,
    notes: 'Medical/birth documentation held privately by HR only.',
    effectiveFrom: '2024-01-01',
  },
  {
    id: 'pol5',
    leaveTypeId: 'lt5',
    version: 2,
    maxDaysPerYear: 5,
    maxDaysPerRequest: 5,
    minTenureMonths: 0,
    minNoticeDays: 0,
    requiresDocuments: false,
    requiredDocs: [],
    carryOverMax: 0,
    allowHalfDay: false,
    notes: 'Zero notice period. Supporting explanation recorded at submission.',
    effectiveFrom: '2024-01-01',
  },
  {
    id: 'pol6',
    leaveTypeId: 'lt6',
    version: 1,
    maxDaysPerYear: 120,
    maxDaysPerRequest: 120,
    minTenureMonths: 24,
    minNoticeDays: 45,
    requiresDocuments: true,
    requiredDocs: ['Admission / enrolment letter', 'Study plan'],
    carryOverMax: 0,
    allowHalfDay: false,
    notes: 'Pemba requests add a Zonal Head step. Final authority approval always required.',
    effectiveFrom: '2024-01-01',
  },
  {
    id: 'pol7',
    leaveTypeId: 'lt7',
    version: 1,
    maxDaysPerYear: 60,
    maxDaysPerRequest: 60,
    minTenureMonths: 0,
    minNoticeDays: 14,
    requiresDocuments: false,
    requiredDocs: [],
    carryOverMax: 0,
    allowHalfDay: false,
    notes: 'Not applicable during probation. Final authority approval required.',
    effectiveFrom: '2024-01-01',
  },
]

export const WORKFLOW_DEFS: WorkflowDef[] = [
  {
    id: 'wf_annual',
    leaveTypeId: 'lt1',
    steps: [
      { role: 'SUPERVISOR', slaDays: 2, note: 'Verifies work coverage and minimum staffing.' },
      {
        role: 'ZONAL_HEAD',
        slaDays: 3,
        note: 'Regional sign-off for non-HQ zones; final authority only when >20 days.',
      },
      { role: 'HR', slaDays: 3, note: 'Checks balance, eligibility and policy compliance.' },
    ],
  },
  {
    id: 'wf_sick',
    leaveTypeId: 'lt2',
    steps: [
      { role: 'SUPERVISOR', slaDays: 1, note: 'Recommends on continuity and coverage.' },
      { role: 'HR', slaDays: 2, note: 'Verifies medical certificate and balance.' },
    ],
  },
  {
    id: 'wf_maternity',
    leaveTypeId: 'lt3',
    steps: [
      { role: 'DEPT_HEAD', slaDays: 2, note: 'Confirms acting cover for the position.' },
      { role: 'HR', slaDays: 3, note: 'Verifies antenatal documentation and statutory days.' },
      { role: 'FINAL_AUTHORITY', slaDays: 3, note: 'Statutory sign-off.' },
    ],
  },
  {
    id: 'wf_paternity',
    leaveTypeId: 'lt4',
    steps: [
      { role: 'SUPERVISOR', slaDays: 1, note: 'Confirms short-term cover.' },
      { role: 'HR', slaDays: 2, note: 'Verifies birth certificate; records privately.' },
    ],
  },
  {
    id: 'wf_emergency',
    leaveTypeId: 'lt5',
    steps: [
      { role: 'SUPERVISOR', slaDays: 1, note: 'Acknowledges emergency reasons.' },
      { role: 'HR', slaDays: 2, note: 'Validates balance and records exception.' },
    ],
  },
  {
    id: 'wf_study',
    leaveTypeId: 'lt6',
    steps: [
      { role: 'SUPERVISOR', slaDays: 3, note: 'Assesses operational impact.' },
      { role: 'DEPT_HEAD', slaDays: 3, note: 'Endorses training relevance.' },
      {
        role: 'ZONAL_HEAD',
        slaDays: 3,
        note: 'Pemba coordination review where applicable.',
      },
      { role: 'HR', slaDays: 3, note: 'Checks tenure, documents and bond conditions.' },
      { role: 'FINAL_AUTHORITY', slaDays: 3, note: 'Final sign-off.' },
    ],
  },
  {
    id: 'wf_lwp',
    leaveTypeId: 'lt7',
    steps: [
      { role: 'SUPERVISOR', slaDays: 2, note: 'Confirms operational impact.' },
      { role: 'DEPT_HEAD', slaDays: 3, note: 'Recommends on absence length.' },
      { role: 'HR', slaDays: 3, note: 'Checks probation and policy compliance.' },
      { role: 'FINAL_AUTHORITY', slaDays: 3, note: 'Final sign-off.' },
    ],
  },
]

export const REPORTING: Record<string, string> = {
  e7: 'e6',
  e6: 'e2',
  e8: 'e4',
  e9: 'e5',
  e2: 'e1',
  e3: 'e1',
  e4: 'e1',
  e5: 'e1',
  e10: 'e3',
  e11: 'e3',
  e12: 'e3',
}

export const DEPT_HEADS: Record<string, string> = {
  d1: 'e3',
  d2: 'e6',
  d3: 'e2',
  d4: 'e4',
  d5: 'e5',
  d6: 'e3',
  d7: 'e3',
  d8: 'e3',
}

export const ZONAL_HEADS: Record<string, string> = {
  z2: 'e4',
  z4: 'e5',
}

export const HR_ROLE = 'e3'
export const FINAL_AUTHORITY = 'e1'

export const EMPLOYEE_ROLES: Record<string, ApproverRole[]> = {
  e1: ['FINAL_AUTHORITY'],
  e3: ['HR'],
  e4: ['ZONAL_HEAD'],
  e5: ['ZONAL_HEAD'],
  e6: ['DEPT_HEAD', 'SUPERVISOR'],
  e7: ['SUPERVISOR'],
}

export function iso(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function toDate(s: string): Date {
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y, m - 1, d)
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

export function policyEffectiveAt(leaveTypeId: string, date: string, pool?: LeavePolicy[]): LeavePolicy {
  const list = pool ?? POLICIES
  const covered = list.filter(
    (p) => p.leaveTypeId === leaveTypeId && p.effectiveFrom && p.effectiveFrom <= date && (!p.effectiveTo || p.effectiveTo >= date),
  )
  if (covered.length > 0) return covered.sort((a, b) => b.version - a.version)[0]
  const fallback = list.filter((p) => p.leaveTypeId === leaveTypeId && p.effectiveFrom && p.effectiveFrom <= date)
  return fallback.sort((a, b) => b.version - a.version)[0] ?? getPolicy(leaveTypeId)
}

export function getLeaveTypeSafe(id: string): LeaveType | undefined {
  return LEAVE_TYPES.find((t) => t.id === id)
}

export function getWorkflow(leaveTypeId: string): WorkflowDef {
  return WORKFLOW_DEFS.find((w) => w.leaveTypeId === leaveTypeId) as WorkflowDef
}

export function standingHolder(emp: Employee, role: ApproverRole): Employee | undefined {
  if (role === 'SUPERVISOR') {
    const sup = REPORTING[emp.id]
    return sup ? getEmployee(sup) : undefined
  }
  if (role === 'DEPT_HEAD') {
    const sup = DEPT_HEADS[emp.departmentId]
    return sup ? getEmployee(sup) : undefined
  }
  if (role === 'ZONAL_HEAD') {
    const sup = ZONAL_HEADS[emp.zoneId]
    return sup ? getEmployee(sup) : undefined
  }
  if (role === 'HR') return getEmployee(HR_ROLE)
  if (role === 'FINAL_AUTHORITY') return getEmployee(FINAL_AUTHORITY)
  return undefined
}

export function resolveApprover(
  emp: Employee,
  role: ApproverRole,
  delegations: Delegation[],
): { assignee: Employee; via: string } {
  const holder = standingHolder(emp, role)
  const activeDel = delegations.find(
    (d) =>
      d.active &&
      d.startDate <= TODAY &&
      d.endDate >= TODAY &&
      d.delegatorId === holder?.id &&
      (d.scope === role || d.scope === 'ALL'),
  )
  if (activeDel && activeDel.delegateId !== emp.id) {
    return { assignee: getEmployee(activeDel.delegateId), via: 'delegation' }
  }
  if (holder && holder.id === emp.id) {
    return { assignee: getEmployee(FINAL_AUTHORITY), via: 'escalated' }
  }
  if (holder) return { assignee: holder, via: 'standing' }
  return { assignee: getEmployee(FINAL_AUTHORITY), via: 'default' }
}

export function resolveWorkflow(
  req: LeaveRequest,
  delegations: Delegation[],
  defs?: WorkflowDef[],
): ApprovalStep[] {
  const emp = getEmployee(req.employeeId)
  const def = (defs ?? WORKFLOW_DEFS).find((w) => w.leaveTypeId === req.leaveTypeId)
  if (!def) return []
  const zone = getZone(emp.zoneId)
  const policy = getPolicySafe(req.leaveTypeId)
  const leaveType = getLeaveTypeSafe(req.leaveTypeId)
  const steps: ApprovalStep[] = []
  const present = new Set<string>()

  const add = (role: ApproverRole, defStep: WorkflowStepDef) => {
    let via = 'standing'
    let assignee = standingHolder(emp, role)
    if (!assignee) return

    if (TAKES_DELEGATION.includes(role)) {
      const r = resolveApprover(emp, role, delegations)
      assignee = r.assignee
      via = r.via
    }

    const alreadyHolds = present.has(assignee.id)
    const note = alreadyHolds
      ? `${defStep.note} (assignee already holds a step in this chain)`
      : defStep.note
    present.add(assignee.id)

    steps.push({
      order: steps.length + 1,
      role,
      roleLabel: roleLabels[role],
      assigneeId: assignee.id,
      assigneeName: assignee.name,
      via,
      slaDays: defStep.slaDays,
      dueAt: addDays(req.submittedAt || TODAY, defStep.slaDays),
      status: 'pending',
      comments: note,
    })
  }

  for (const defStep of def.steps) {
    const role = defStep.role
    if (role === 'ZONAL_HEAD' && zone.isHQ && leaveType?.code !== 'STUDY') continue
    if (role === 'FINAL_AUTHORITY') continue
    add(role, defStep)
  }

  const needsFinal = !!(
    policy &&
    (policy.maxDaysPerRequest >= 60 ||
      req.days > 20 ||
      (leaveType && ['MATERNITY', 'STUDY', 'WITHOUT_PAY'].includes(leaveType.code)))
  )
  if (needsFinal) {
    const finalHolder = getEmployee(FINAL_AUTHORITY)
    if (!present.has(finalHolder.id)) {
      present.add(finalHolder.id)
      steps.push({
        order: steps.length + 1,
        role: 'FINAL_AUTHORITY',
        roleLabel: roleLabels['FINAL_AUTHORITY'],
        assigneeId: finalHolder.id,
        assigneeName: finalHolder.name,
        via: 'standing',
        slaDays: 3,
        dueAt: addDays(req.submittedAt || TODAY, 3),
        status: 'pending',
      })
    }
  }

  return steps
}

const TAKES_DELEGATION: ApproverRole[] = ['SUPERVISOR', 'DEPT_HEAD', 'ZONAL_HEAD']

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
      getEmployee(r.employeeId).zoneId === zoneId &&
      (r.status === 'approved' || r.status === 'under_review') &&
      r.startDate <= date &&
      r.endDate >= date,
  ).length
  const total = zoneStaff.length
  return total === 0 ? 0 : 1 - away / total
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

let auditChainCounter = 0
let lastPrevHash = 'GENESIS'

export function nextHash(payload: string): string {
  auditChainCounter += 1
  let hash = 5381
  const input = `${lastPrevHash}|${payload}|${auditChainCounter}`
  for (let i = 0; i < input.length; i++) {
    hash = (hash * 33) ^ input.charCodeAt(i)
  }
  lastPrevHash = (hash >>> 0).toString(16).padStart(8, '0')
  return lastPrevHash
}

let idCounter = 100

export function nextId(): string {
  idCounter += 1
  return `gen_${idCounter}`
}

export function seedDelegations(): Delegation[] {
  return [
    {
      id: 'del1',
      delegatorId: 'e6',
      delegateId: 'e7',
      scope: 'DEPT_HEAD',
      startDate: '2026-09-05',
      endDate: '2026-10-10',
      authorizedBy: 'e1',
      active: true,
    },
    {
      id: 'del2',
      delegatorId: 'e5',
      delegateId: 'e9',
      scope: 'ZONAL_HEAD',
      startDate: '2026-08-01',
      endDate: '2026-09-20',
      authorizedBy: 'e1',
      active: true,
    },
  ]
}

export function buildSeedRequests(defaultDelegations: Delegation[]): LeaveRequest[] {
  const base: Omit<LeaveRequest, 'steps'>[] = [
    {
      id: 'r1',
      ref: 'LVE-2026-0147',
      employeeId: 'e7',
      leaveTypeId: 'lt1',
      policyId: 'pol1',
      startDate: '2026-10-05',
      endDate: '2026-10-16',
      days: 10,
      reason: 'Family visit to Unguja North; planned well in advance.',
      status: 'approved',
      createdAt: '2026-08-20',
      submittedAt: '2026-08-20',
      decidedAt: '2026-08-28',
      documents: [],
    },
    {
      id: 'r2',
      ref: 'LVE-2026-0150',
      employeeId: 'e8',
      leaveTypeId: 'lt2',
      policyId: 'pol2',
      startDate: '2026-09-14',
      endDate: '2026-09-18',
      days: 5,
      reason: 'Malaria treatment and recovery.',
      status: 'approved',
      createdAt: '2026-09-10',
      submittedAt: '2026-09-10',
      decidedAt: '2026-09-12',
      documents: [
        {
          id: 'doc1',
          name: 'medical_certificate_e8.pdf',
          type: 'Medical certificate',
          uploadedBy: 'e8',
          uploadedByLabel: 'Mohammed Ali Salum',
          restricted: true,
          size: '146 KB',
          uploadedAt: '2026-09-10',
        },
      ],
    },
    {
      id: 'r3',
      ref: 'LVE-2026-0153',
      employeeId: 'e9',
      leaveTypeId: 'lt3',
      policyId: 'pol3',
      startDate: '2026-10-01',
      endDate: '2026-12-23',
      days: 84,
      reason: 'Statutory maternity leave; antenatal record attached.',
      status: 'under_review',
      createdAt: '2026-09-02',
      submittedAt: '2026-09-02',
      documents: [
        {
          id: 'doc2',
          name: 'antenatal_record_e9.pdf',
          type: 'Antenatal record',
          uploadedBy: 'e9',
          uploadedByLabel: 'Rehema Mzuri Hamad',
          restricted: true,
          size: '1.2 MB',
          uploadedAt: '2026-09-02',
        },
      ],
    },
    {
      id: 'r4',
      ref: 'LVE-2026-0155',
      employeeId: 'e6',
      leaveTypeId: 'lt1',
      policyId: 'pol1',
      startDate: '2026-11-02',
      endDate: '2026-11-23',
      days: 22,
      reason: 'Accrued annual leave over two years.',
      status: 'under_review',
      createdAt: '2026-08-30',
      submittedAt: '2026-08-30',
      documents: [],
    },
    {
      id: 'r5',
      ref: 'LVE-2026-0156',
      employeeId: 'e12',
      leaveTypeId: 'lt5',
      policyId: 'pol5',
      startDate: '2026-09-20',
      endDate: '2026-09-21',
      days: 2,
      reason: 'Urgent family matter — bereavement support.',
      status: 'approved',
      createdAt: '2026-09-12',
      submittedAt: '2026-09-12',
      decidedAt: '2026-09-13',
      documents: [],
    },
    {
      id: 'r6',
      ref: 'LVE-2026-0158',
      employeeId: 'e10',
      leaveTypeId: 'lt6',
      policyId: 'pol6',
      startDate: '2026-10-01',
      endDate: '2026-11-30',
      days: 61,
      reason: 'MSc in Cybersecurity — University of Dar es Salaam, first year.',
      status: 'returned_for_correction',
      createdAt: '2026-08-15',
      submittedAt: '2026-08-15',
      documents: [],
    },
    {
      id: 'r7',
      ref: 'LVE-2026-0160',
      employeeId: 'e11',
      leaveTypeId: 'lt1',
      policyId: 'pol1',
      startDate: '2026-09-28',
      endDate: '2026-10-02',
      days: 5,
      reason: 'Annual leave; already on file for Records rotation.',
      status: 'rejected',
      createdAt: '2026-09-05',
      submittedAt: '2026-09-05',
      decidedAt: '2026-09-08',
      documents: [],
    },
    {
      id: 'r8',
      ref: 'LVE-2026-0162',
      employeeId: 'e8',
      leaveTypeId: 'lt1',
      policyId: 'pol1',
      startDate: '2026-11-09',
      endDate: '2026-11-20',
      days: 12,
      reason: 'Annual leave, deferred from 2025.',
      status: 'submitted',
      createdAt: '2026-09-06',
      submittedAt: '2026-09-06',
      documents: [],
    },
    {
      id: 'r9',
      ref: 'LVE-2026-0163',
      employeeId: 'e7',
      leaveTypeId: 'lt4',
      policyId: 'pol4',
      startDate: '2026-10-19',
      endDate: '2026-10-25',
      days: 7,
      reason: 'Birth of second child.',
      status: 'submitted',
      createdAt: '2026-09-08',
      submittedAt: '2026-09-08',
      documents: [],
    },
  ]

  return base.map((r) => ({ ...r, steps: computeSteps(r, defaultDelegations) }))
}

export function buildSeedCases(requests: LeaveRequest[]): { cases: CaseRecord[]; handovers: HandoverRecord[] } {
  const cases: CaseRecord[] = []
  const handovers: HandoverRecord[] = []
  const pendingSeed = new Set(['r3', 'r4'])

  for (const r of requests) {
    if (r.status === 'withdrawn') continue
    const pending = r.steps.find((s) => s.status === 'pending')
    const acted = [...r.steps].reverse().find((s) => s.status === 'approved')
    const owner = pending?.assigneeId ?? acted?.assigneeId ?? r.employeeId
    const id = `case_${r.id}`
    cases.push({
      id,
      requestId: r.id,
      ref: r.ref,
      employeeId: r.employeeId,
      leaveTypeId: r.leaveTypeId,
      ownerId: owner,
      status: r.status === 'rejected' ? 'closed' : 'open',
      createdAt: r.submittedAt ?? r.createdAt,
      updatedAt: r.decidedAt ?? r.submittedAt,
      nextHearingDate: r.id === 'r4' ? '2026-11-12' : r.id === 'r3' ? '2026-10-11' : undefined,
      note:
        r.status === 'rejected'
          ? 'Case closed on rejection.'
          : pending
            ? 'Docket follows the request through its approval chain.'
            : 'Awaiting first decision.',
    })

    if (acted && pending && acted.assigneeId !== pending.assigneeId) {
      const pendingHere = pendingSeed.has(r.id)
      handovers.push({
        id: `ho_${r.id}_1`,
        caseId: id,
        fromOwnerId: acted.assigneeId,
        toOwnerId: pending.assigneeId,
        reason: `Approval progressed to ${pending.roleLabel}.`,
        status: pendingHere ? 'pending' : 'accepted',
        createdAt: acted.actedAt ?? r.submittedAt ?? TODAY,
        acceptedAt: pendingHere ? undefined : pending.dueAt,
      })
    }
  }
  return { cases, handovers }
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

function computeSteps(
  r: { id: string; employeeId: string; leaveTypeId: string; days: number; submittedAt?: string },
  delegations: Delegation[],
): ApprovalStep[] {
  const raw = resolveWorkflow(
    {
      employeeId: r.employeeId,
      leaveTypeId: r.leaveTypeId,
      days: r.days,
      submittedAt: r.submittedAt,
    } as LeaveRequest,
    delegations,
  )
  const set = (idx: number, patch: Partial<ApprovalStep>) => {
    if (raw[idx]) raw[idx] = { ...raw[idx], ...patch }
  }
  if (r.id === 'r1') {
    set(0, { status: 'approved', actedAt: '2026-08-23', comments: 'Coverage confirmed; staffing within unit unaffected.' })
    set(1, { status: 'approved', actedAt: '2026-08-28', comments: 'Balance verified. Policy v4 applies. Approved 10 working days.' })
  }
  if (r.id === 'r2') {
    set(0, { status: 'approved', actedAt: '2026-09-11', comments: 'Recovery recommended; file temporarily reassigned.' })
    set(1, { status: 'approved', actedAt: '2026-09-12', comments: 'Medical certificate verified. Balance updated.' })
  }
  if (r.id === 'r3') {
    set(0, { status: 'approved', actedAt: '2026-09-04', comments: 'Acting cover named for duties.' })
    set(1, { status: 'approved', actedAt: '2026-09-08', comments: 'Statutory 84 days confirmed; documents held by HR.' })
  }
  if (r.id === 'r4') {
    set(0, { status: 'approved', actedAt: '2026-09-03', comments: 'Recommended; 22 days requires final authority.' })
  }
  if (r.id === 'r5') {
    set(0, { status: 'approved', actedAt: '2026-09-13', comments: 'Acknowledged. Executive office covered.' })
    set(1, { status: 'approved', actedAt: '2026-09-13', comments: 'Emergency exception recorded.' })
  }
  if (r.id === 'r6') {
    set(0, { status: 'approved', actedAt: '2026-08-20', comments: 'Training relevant to ICT duties.' })
    set(1, { status: 'returned', actedAt: '2026-08-26', comments: 'Admission letter is missing. Please upload before resubmission.' })
  }
  if (r.id === 'r7') {
    set(0, { status: 'rejected', actedAt: '2026-09-08', comments: 'Only one Records officer available that week; overlaps staff leave.' })
    set(1, { status: 'skipped' })
  }
  return raw
}

export function buildSeedNotifications(): NotificationItem[] {
  return [
    {
      id: 'n1',
      userId: 'e9',
      kind: 'submitted',
      message: 'Your maternity leave request LVE-2026-0153 was submitted for approval.',
      time: '2 Sep, 09:14',
      read: false,
    },
    {
      id: 'n2',
      userId: 'e1',
      kind: 'upcoming',
      message: 'Rehema’s maternity request awaits your final-authority review (due within SLA).',
      time: '8 Sep, 08:02',
      read: false,
    },
    {
      id: 'n3',
      userId: 'e10',
      kind: 'returned',
      message: 'Study leave LVE-2026-0158 was returned for correction — admission letter missing.',
      time: '26 Aug, 14:41',
      read: false,
    },
    {
      id: 'n4',
      userId: 'e7',
      kind: 'approved',
      message: 'Annual leave LVE-2026-0147 fully approved (5 Oct – 16 Oct).',
      time: '28 Aug, 11:20',
      read: true,
    },
    {
      id: 'n5',
      userId: 'e8',
      kind: 'escalated',
      message: 'Sick leave LVE-2026-0150 was escalated; your zonal head did not respond in SLA time.',
      time: '11 Sep, 07:45',
      read: false,
    },
    {
      id: 'n6',
      userId: 'e3',
      kind: 'delegation',
      message: 'Zaytuni delegated department-head approval authority to Asha until 10 Oct.',
      time: '5 Sep, 10:00',
      read: false,
    },
    {
      id: 'n7',
      userId: 'e7',
      kind: 'upcoming',
      message: 'Your paternity leave begins 19 Oct. Ensure birth certificate is uploaded.',
      time: '9 Sep, 06:30',
      read: false,
    },
  ]
}

export function buildSeedAudit(): AuditEntry[] {
  const make = (
    entity: string,
    entityId: string,
    action: string,
    actorId: string,
    payload: string,
    reason?: string,
    at?: string,
  ): AuditEntry => {
    const prevHash = lastPrevHash
    const hash = nextHash(payload)
    return {
      id: `aud_${entity}_${entityId}_${hash}`,
      entity,
      entityId,
      action,
      actorId,
      payload,
      reason,
      prevHash,
      hash,
      at: at || TODAY,
    }
  }
  return [
    make('leave_policy', 'pol1', 'version', 'e3', 'AnnualLeave policy updated to v4: carry-over 10 days', undefined, '2026-06-15'),
    make('workflow', 'wf_maternity', 'version', 'e3', 'Maternity workflow: added final-authority step', undefined, '2026-05-02'),
    make('leave_request', 'r6', 'return', 'e3', 'LVE-2026-0158 returned: admission letter missing', 'Admission letter missing', '2026-08-26'),
    make('delegation', 'del1', 'create', 'e1', 'Zaytuni → Asha dept-head authority 05 Sep – 10 Oct', undefined, '2026-09-05'),
    make('leave_request', 'r3', 'approve', 'e5', 'LVE-2026-0153 recommended by supervisor Juma', undefined, '2026-09-04'),
    make('leave_request', 'r7', 'reject', 'e6', 'LVE-2026-0160 rejected: overlap with Records cover', undefined, '2026-09-08'),
    make('case', 'case_r3', 'handover', 'e5', 'LVE-2026-0153 docket passed to the next approval role for acceptance', undefined, '2026-09-08'),
    make('case', 'case_r4', 'handover', 'e6', 'LVE-2026-0155 docket advanced after departmental recommendation', undefined, '2026-09-03'),
    make('config', 'zones', 'create', 'e3', 'Created Pemba coordination office zone record', undefined, '2026-04-20'),
  ]
}

export function balanceOf(empId: string, leaveTypeId: string, requests: LeaveRequest[], policiesPool?: LeavePolicy[]) {
  const leave = getLeaveType(leaveTypeId)
  const emp = getEmployee(empId)
  const policy = policiesPool
    ? policiesPool.filter((p) => p.leaveTypeId === leaveTypeId).sort((a, b) => b.version - a.version)[0] ?? getPolicy(leaveTypeId)
    : getPolicy(leaveTypeId)
  const used = requests
    .filter(
      (r) => r.employeeId === empId && r.leaveTypeId === leaveTypeId && (r.status === 'approved' || r.status === 'under_review'),
    )
    .reduce((s, r) => s + r.days, 0)

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
  return { accrued, carryOver: carry, used, remaining, pct }
}

export interface TipItem {
  icon: string
  tone: 'ok' | 'warn' | 'info' | 'danger'
  text: string
}

export function recommendationsFor(emp: Employee, leaveTypeId: string, requests: LeaveRequest[]): TipItem[] {
  const policy = policyEffectiveAt(leaveTypeId, TODAY)
  const leave = getLeaveType(leaveTypeId)
  const bal = balanceOf(emp.id, leaveTypeId, requests)
  const tenure = tenureMonths(emp.hireDate)
  const tips: TipItem[] = []

  if (tenure < policy.minTenureMonths) {
    tips.push({
      icon: 'lock',
      tone: 'warn',
      text: `You need at least ${policy.minTenureMonths} months of service for ${leave.name}. You currently have ${tenure}.`,
    })
  } else {
    const eligible = addDays(TODAY, policy.minNoticeDays)
    tips.push({
      icon: 'check',
      tone: 'ok',
      text: `You are eligible to apply for ${leave.name} from ${fmtShort(eligible)}.`,
    })
  }

  if (bal.accrued > 0) {
    tips.push({
      icon: 'wallet',
      tone: 'info',
      text: `Your ${leave.name} balance is ${bal.remaining} day${bal.remaining === 1 ? '' : 's'} (${bal.used} used of ${bal.accrued} — includes ${bal.carryOver} carried over).`,
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
      text: `${leave.name} does not accrue a standing balance; entitlement is assessed per approved request.`,
    })
  }

  for (const doc of policy.requiredDocs) {
    tips.push({
      icon: 'file',
      tone: 'warn',
      text: `A ${doc.toLowerCase()} is required for this ${leave.name.toLowerCase()} request.`,
    })
  }

  const wf = getWorkflow(leaveTypeId)
  const roles = wf.steps.map((s) => roleLabels[s.role])
  tips.push({
    icon: 'users',
    tone: 'info',
    text: `Your request requires: ${roles.join(' → ')}.`,
  })

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
      text: `Your requested dates overlap with an approved request (${getLeaveType(overlap.leaveTypeId).short} from ${fmtShort(overlap.startDate)}).`,
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