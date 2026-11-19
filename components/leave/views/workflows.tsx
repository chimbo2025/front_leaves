'use client'

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import {
  Check,
  Plus,
  Trash2,
  Workflow as WorkflowIcon,
  AlertTriangle,
  ShieldCheck,
  ListChecks,
  Gauge,
  Pencil,
  Power,
  FilePlus2,
  Search,
  Sparkles,
  Loader2,
  RefreshCw,
  Info,
  X,
  Eye,
  Calendar,
  Clock,
  Building2,
  User,
} from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { useLeave } from '@/components/leave/leave-context'
import {
  ApiError,
  leaveApi,
  type ApprovalRoleDto,
  type EmployeeDto,
  type WorkflowAssignmentMode,
  type WorkflowCheckResult,
  type WorkflowDefDto,
  type WorkflowListParams,
  type WorkflowStepScope,
} from '@/lib/leave-api'
import {
  SectionHeading,
  Panel,
  StatCard,
  Tabs,
  Btn,
  SelectInput,
  MultiSelect,
  TextInput,
  Modal,
  ConfirmModal,
  RowMenu,
  Pagination,
  Avatar,
} from '@/components/leave/shared'

// ---------------------------------------------------------------------------
// Types + helpers
// ---------------------------------------------------------------------------

type ScopeKind = 'office_wide' | 'zone' | 'department'

interface BuilderState {
  mode: 'create' | 'edit'
  defId?: string
  leaveTypeId: string
  title: string
  scopeKind: ScopeKind
  zoneId: string
  departmentIds: string[]
  minDays: number
  /** Kept as a string so the optional advanced input can be emptied. */
  maxDays: string
  notes: string
  advancedOpen: boolean
}

interface StepDraft {
  approval_role_id: string
  approver_employee_id: string
  approver_name: string
  fallback_approval_role_id: string
  assignment_mode: WorkflowAssignmentMode
  scope_type: WorkflowStepScope
  sla_days: number
  is_mandatory: boolean
  allow_same_person_as_previous_steps: boolean
  note: string
}

const LEGACY_TO_CATALOG: Record<string, string> = {
  SUPERVISOR: 'supervisor',
  DEPT_HEAD: 'department_head',
  ZONAL_HEAD: 'zonal_head',
  UNIT_HEAD: 'unit_head',
  DIVISION_HEAD: 'division_head',
  HR: 'hr_reviewer',
  HR_RECORDER: 'hr_recorder',
  DEPUTY_DPP: 'deputy_dpp',
  FINAL_AUTHORITY: 'final_authority',
  ACCOUNTING: 'accounting_reviewer',
}

const FALLBACK_ROLE_DEFAULTS: Record<string, { mode: WorkflowAssignmentMode; scope: WorkflowStepScope; note: string }> = {
  supervisor: {
    mode: 'assigned_approver',
    scope: 'requester_department',
    note: 'Verifies coverage and handover requirements.',
  },
  department_head: {
    mode: 'assigned_approver',
    scope: 'requester_department',
    note: 'Confirms operational coverage for the department.',
  },
  internal_director: {
    mode: 'assigned_approver',
    scope: 'requester_department',
    note: 'Reviews the request at director level.',
  },
  zonal_head: {
    mode: 'assigned_approver',
    scope: 'requester_zone',
    note: 'Regional sign-off for staff outside HQ.',
  },
  division_head: {
    mode: 'assigned_approver',
    scope: 'requester_department',
    note: 'Reviews the request in the division.',
  },
  unit_head: {
    mode: 'assigned_approver',
    scope: 'requester_department',
    note: 'Reviews the request in the unit.',
  },
  hr_reviewer: {
    mode: 'shared_queue',
    scope: 'office_wide',
    note: 'Checks balance, eligibility and policy compliance.',
  },
  hr_recorder: {
    mode: 'shared_queue',
    scope: 'office_wide',
    note: 'Records the decision for HR files.',
  },
  final_authority: {
    mode: 'assigned_approver',
    scope: 'office_wide',
    note: 'Final sign-off by the Director of Public Prosecutions.',
  },
  deputy_dpp: {
    mode: 'assigned_approver',
    scope: 'office_wide',
    note: 'Deputy DPP review before final sign-off.',
  },
  accounting_reviewer: {
    mode: 'shared_queue',
    scope: 'office_wide',
    note: 'Finance reviews payment implications.',
  },
}

function roleDefaults(roleId: string) {
  return (
    FALLBACK_ROLE_DEFAULTS[roleId] ?? {
      mode: 'assigned_approver' as WorkflowAssignmentMode,
      scope: 'requester_department' as WorkflowStepScope,
      note: 'Reviews the request at this stage.',
    }
  )
}

function scopeKindLabel(kind?: string | null): string {
  if (kind === 'department') return 'Department'
  if (kind === 'zone') return 'Zone'
  return 'Entire office'
}

function conciseDuration(def: { min_duration_days?: number | null; max_duration_days?: number | null }): string {
  const min = Math.max(1, def.min_duration_days ?? 1)
  const max = def.max_duration_days ?? null
  // Detail/list hide the default (1 day, open ended) so the row stays quiet.
  if (min === 1 && max === null) return '—'
  if (max === null) return `${min}+ days`
  if (max === min) return `${min} ${min === 1 ? 'day' : 'days'}`
  return `${min}–${max} days`
}

function fmtDate(value?: string | null): string {
  if (!value) return '—'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return value
  return d.toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' })
}

function errorText(err: unknown): string {
  if (err instanceof ApiError) return err.message
  if (err instanceof Error) return err.message
  return 'Something went wrong. Please try again.'
}

function readWorkflowQuery(): URLSearchParams {
  if (typeof window === 'undefined') return new URLSearchParams()
  return new URLSearchParams(window.location.search)
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null
  return <p className="mt-1 text-[11px] font-medium text-rose-600 dark:text-rose-400">{message}</p>
}

function Banner({
  tone,
  title,
  children,
  onClose,
}: {
  tone: 'rose' | 'amber' | 'sky'
  title: string
  children?: ReactNode
  onClose?: () => void
}) {
  const tones = {
    rose: 'border-rose-200 bg-rose-50 text-rose-800 dark:border-rose-900 dark:bg-rose-950/60 dark:text-rose-200',
    amber: 'border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900 dark:bg-amber-950/60 dark:text-amber-200',
    sky: 'border-sky-200 bg-sky-50 text-sky-900 dark:border-sky-900 dark:bg-sky-950/60 dark:text-sky-200',
  }
  return (
    <div className={cn('flex items-start gap-2.5 rounded-xl border px-3.5 py-3 text-[12px]', tones[tone])} role="alert">
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
      <div className="min-w-0 flex-1">
        <p className="font-semibold">{title}</p>
        {children && <div className="mt-0.5 leading-relaxed opacity-90">{children}</div>}
      </div>
      {onClose && (
        <button type="button" onClick={onClose} aria-label="Dismiss" className="shrink-0 opacity-70 hover:opacity-100">
          <X className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// View
// ---------------------------------------------------------------------------

export function WorkflowsView({ onNavigate }: { onNavigate?: (v: string) => void }) {
  const { leaveTypes, workflowDefs, typeOf, can, allDepts, allZones, refreshWorkflows } = useLeave()

  const canCreateWorkflows = can('approval_workflows', 'create') && can('policies', 'edit_policy')
  const canEditWorkflows = can('approval_workflows', 'update') && can('policies', 'edit_policy')
  const canViewWorkflows = can('approval_workflows', 'view') && can('policies', 'view')

  // ---- Role catalog ------------------------------------------------------
  const [approvalRoles, setApprovalRoles] = useState<ApprovalRoleDto[]>([])
  const [loadingRoles, setLoadingRoles] = useState(false)
  const [roleSearch, setRoleSearch] = useState('')

  useEffect(() => {
    void (async () => {
      setLoadingRoles(true)
      try {
        const res = await leaveApi.org.approvalRoles()
        setApprovalRoles(res.data || [])
      } catch {
        setApprovalRoles([
          { id: 'supervisor', code: 'supervisor', name: 'Immediate Supervisor', resolution_type: 'supervisor', is_active: true, is_system_protected: true },
          { id: 'department_head', code: 'department_head', name: 'Department Head', resolution_type: 'employee_approval_roles', is_active: true, is_system_protected: true },
          { id: 'hr_reviewer', code: 'hr_reviewer', name: 'HR Reviewer', resolution_type: 'employee_approval_roles', is_active: true, is_system_protected: true },
          { id: 'final_authority', code: 'final_authority', name: 'Final Authority (DPP)', resolution_type: 'both', is_active: true, is_system_protected: true },
        ])
      } finally {
        setLoadingRoles(false)
      }
    })()
  }, [])

  const roleName = useCallback(
    (roleId: string | null | undefined) =>
      approvalRoles.find((r) => r.id === roleId)?.name ?? (roleId ? roleId.replace(/_/g, ' ') : 'Unassigned'),
    [approvalRoles],
  )

  // ---- Role holders (approver dropdown) ---------------------------------
  const [holdersByRole, setHoldersByRole] = useState<Record<string, EmployeeDto[]>>({})
  const [approverSearch, setApproverSearch] = useState<Record<number, string>>({})
  const [loadingHolders, setLoadingHolders] = useState<Record<string, boolean>>({})

  // ---- List state (URL-persisted) ---------------------------------------
  const initial = useMemo(readWorkflowQuery, [])

  const [page, setPage] = useState(() => Math.max(1, Number(initial.get('wfpage')) || 1))
  const [perPage, setPerPage] = useState(() => {
    const size = Number(initial.get('wfsize'))
    return [10, 25, 50, 100].includes(size) ? size : 10
  })
  const [search, setSearch] = useState(() => initial.get('wfq') ?? '')
  const [debouncedSearch, setDebouncedSearch] = useState(() => initial.get('wfq') ?? '')
  const [typeFilter, setTypeFilter] = useState(() => initial.get('wftype') ?? '')
  const [statusFilter, setStatusFilter] = useState<'active' | 'inactive' | ''>(
    () => (initial.get('wfstatus') as 'active' | 'inactive' | '') ?? '',
  )
  const [scopeFilter, setScopeFilter] = useState<'office_wide' | 'zone' | 'department' | ''>(
    () => (initial.get('wfscope') as 'office_wide' | 'zone' | 'department' | '') ?? '',
  )
  const [sort, setSort] = useState<NonNullable<WorkflowListParams['sort']>>(
    () => (initial.get('wfsort') as NonNullable<WorkflowListParams['sort']>) || 'updated_at',
  )
  const [direction, setDirection] = useState<'asc' | 'desc'>(
    () => (initial.get('wfdirection') === 'asc' ? 'asc' : 'desc'),
  )

  const [rows, setRows] = useState<WorkflowDefDto[]>([])
  const [total, setTotal] = useState(0)
  const [from, setFrom] = useState<number | null>(null)
  const [to, setTo] = useState<number | null>(null)
  const hasCustomDurations = rows.some(
    (r) => (r.min_duration_days ?? 1) !== 1 || (r.max_duration_days ?? null) !== null,
  )
  const colCount = hasCustomDurations ? 9 : 8
  const [loading, setLoading] = useState(false)
  const [listError, setListError] = useState<string | null>(null)

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 300)
    return () => clearTimeout(t)
  }, [search])

  useEffect(() => {
    const p = new URLSearchParams(window.location.search)
    const setOrDelete = (key: string, value: string) => {
      if (value) p.set(key, value)
      else p.delete(key)
    }
    setOrDelete('wfpage', page > 1 ? String(page) : '')
    setOrDelete('wfsize', perPage !== 10 ? String(perPage) : '')
    setOrDelete('wfq', debouncedSearch)
    setOrDelete('wftype', typeFilter)
    setOrDelete('wfstatus', statusFilter)
    setOrDelete('wfscope', scopeFilter)
    setOrDelete('wfsort', sort !== 'updated_at' ? sort : '')
    setOrDelete('wfdirection', direction !== 'desc' ? direction : '')
    const next = p.toString()
    window.history.replaceState(null, '', next ? `${window.location.pathname}?${next}` : window.location.pathname)
  }, [page, perPage, debouncedSearch, typeFilter, statusFilter, scopeFilter, sort, direction])

  const fetchList = useCallback(async () => {
    if (!canViewWorkflows) {
      setRows([])
      setTotal(0)
      return
    }
    setLoading(true)
    setListError(null)
    try {
      const res = await leaveApi.workflows.paginate({
        page,
        per_page: perPage,
        search: debouncedSearch || undefined,
        leave_type_id: typeFilter || undefined,
        status: statusFilter || undefined,
        scope: scopeFilter || undefined,
        sort,
        direction,
      })
      // Deleting the last row of the last page leaves an empty page; snap back
      // to the nearest populated one instead of showing a false empty state.
      if (res.data.length === 0 && res.current_page > 1 && res.total > 0) {
        setPage(Math.min(res.current_page - 1, res.last_page))
        return
      }
      setRows(res.data)
      setTotal(res.total)
      setFrom(res.from)
      setTo(res.to)
    } catch (err) {
      setListError(errorText(err))
      setRows([])
      setTotal(0)
    } finally {
      setLoading(false)
    }
  }, [canViewWorkflows, page, perPage, debouncedSearch, typeFilter, statusFilter, scopeFilter, sort, direction])

  useEffect(() => {
    void fetchList()
  }, [fetchList])

  const resetToFirstPage = () => setPage(1)

  const toggleSort = (column: NonNullable<WorkflowListParams['sort']>) => {
    if (sort === column) {
      setDirection((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSort(column)
      setDirection(column === 'updated_at' || column === 'created_at' ? 'desc' : 'asc')
    }
    setPage(1)
  }

  const afterWrite = useCallback(async () => {
    // Context holds the unpaginated list used by coverage/stat cards and the
    // routing hints elsewhere; refresh it alongside this page.
    await Promise.allSettled([refreshWorkflows(), fetchList()])
  }, [refreshWorkflows, fetchList])

  // ---- Coverage stats ----------------------------------------------------
  const activeCount = workflowDefs.filter((w) => w.isActive !== false).length
  const stepCount = workflowDefs.reduce((sum, w) => sum + w.steps.length, 0)
  const finalAuthorityCount = workflowDefs.filter((w) =>
    w.steps.some((s) => s.approvalRoleId === 'final_authority' || s.role === 'FINAL_AUTHORITY'),
  ).length
  const uncovered = leaveTypes.filter((lt) => !workflowDefs.some((w) => w.leaveTypeId === lt.id))

  // ---- Builder state -----------------------------------------------------
  const [builder, setBuilder] = useState<BuilderState | null>(null)
  const [draftSteps, setDraftSteps] = useState<StepDraft[]>([])
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({})
  const [deleteDef, setDeleteDef] = useState<WorkflowDefDto | null>(null)
  const [viewDef, setViewDef] = useState<WorkflowDefDto | null>(null)
  const [deleting, setDeleting] = useState(false)

  // Fetch the holder list for every role currently used in the chain. Cached
  // per role so switching steps back and forth does not refetch.
  useEffect(() => {
    const roleIds = Array.from(new Set(draftSteps.map((s) => s.approval_role_id).filter(Boolean)))

    roleIds.forEach((roleId) => {
      if (holdersByRole[roleId] !== undefined || loadingHolders[roleId]) return

      setLoadingHolders((prev) => ({ ...prev, [roleId]: true }))
      void leaveApi.workflows
        .roleHolders(roleId)
        .then((res) => setHoldersByRole((prev) => ({ ...prev, [roleId]: res.data ?? [] })))
        .catch(() => setHoldersByRole((prev) => ({ ...prev, [roleId]: [] })))
        .finally(() => setLoadingHolders((prev) => ({ ...prev, [roleId]: false })))
    })
  }, [draftSteps, holdersByRole, loadingHolders])

  const err = (key: string) => fieldErrors[key]?.[0]

  const clearErrors = () => {
    setSaveError(null)
    setFieldErrors({})
  }

  const closeBuilder = () => {
    setBuilder(null)
    setDraftSteps([])
    setPreview(null)
    setPreviewError(null)
    clearErrors()
  }

  const openCreate = (leaveTypeId?: string) => {
    const typeId =
      leaveTypeId ??
      leaveTypes.find((lt) => !workflowDefs.some((w) => w.leaveTypeId === lt.id))?.id ??
      leaveTypes[0]?.id ??
      ''
    const defaults = roleDefaults('supervisor')
    setDraftSteps([
      {
        approval_role_id: 'supervisor',
        approver_employee_id: '',
        approver_name: '',
        fallback_approval_role_id: '',
        assignment_mode: defaults.mode,
        scope_type: defaults.scope,
        sla_days: 2,
        is_mandatory: true,
        allow_same_person_as_previous_steps: false,
        note: defaults.note,
      },
    ])
    clearErrors()
    setPreview(null)
    setPreviewError(null)
    setBuilder({
      mode: 'create',
      leaveTypeId: typeId,
      title: '',
      scopeKind: 'office_wide',
      zoneId: '',
      departmentIds: [],
      minDays: 1,
      maxDays: '',
      notes: '',
      advancedOpen: false,
    })
  }

  const openEdit = (def: WorkflowDefDto) => {
    setDraftSteps(
      (def.steps ?? []).map((s) => {
        const catalogId =
          s.approval_role_id ??
          s.approval_role?.id ??
          LEGACY_TO_CATALOG[s.role_required ?? ''] ??
          'supervisor'
        const defaults = roleDefaults(catalogId)
        return {
          approval_role_id: catalogId,
          approver_employee_id: s.approver_employee_id ?? s.approver?.id ?? '',
          approver_name: s.approver?.full_name ?? '',
          fallback_approval_role_id: s.fallback_approval_role_id ?? '',
          assignment_mode: s.assignment_mode ?? defaults.mode,
          scope_type: s.scope_type ?? defaults.scope,
          sla_days: s.sla_days ?? 2,
          is_mandatory: s.is_mandatory !== false,
          allow_same_person_as_previous_steps: s.allow_same_person_as_previous_steps === true,
          note: s.note ?? '',
        }
      }),
    )
    clearErrors()
    setPreview(null)
    setPreviewError(null)
    setBuilder({
      mode: 'edit',
      defId: def.id,
      leaveTypeId: def.leave_type_id,
      title: def.workflow_title ?? '',
      scopeKind: ((def.department_ids?.length ?? (def.department_id ? 1 : 0)) > 0
        ? 'department'
        : def.zone_id
          ? 'zone'
          : 'office_wide') as ScopeKind,
      zoneId: def.zone_id ?? '',
      departmentIds: def.department_ids ?? (def.department_id ? [def.department_id] : []),
      minDays: Math.max(1, def.min_duration_days ?? 1),
      maxDays: def.max_duration_days != null ? String(def.max_duration_days) : '',
      notes: def.notes ?? '',
      advancedOpen: (def.max_duration_days ?? null) !== null || Math.max(1, def.min_duration_days ?? 1) !== 1,
    })
  }

  // ---- Step editing ------------------------------------------------------
  const addStep = () => {
    const used = new Set(draftSteps.map((s) => s.approval_role_id))
    const preferred = ['department_head', 'hr_reviewer', 'final_authority'].find((r) => !used.has(r)) ?? 'department_head'
    const defaults = roleDefaults(preferred)
    setDraftSteps((prev) => [
      ...prev,
      {
        approval_role_id: preferred,
        approver_employee_id: '',
        approver_name: '',
        fallback_approval_role_id: '',
        assignment_mode: defaults.mode,
        scope_type: defaults.scope,
        sla_days: 3,
        is_mandatory: true,
        allow_same_person_as_previous_steps: false,
        note: defaults.note,
      },
    ])
  }

  const updateStep = (index: number, patch: Partial<StepDraft>) => {
    setDraftSteps((prev) => prev.map((s, i) => (i === index ? { ...s, ...patch } : s)))
  }

  const changeStepRole = (index: number, roleId: string) => {
    setDraftSteps((prev) =>
      prev.map((s, i) => {
        if (i !== index) return s
        // The approver belongs to the previous role; clear it so the
        // administrator consciously picks a holder of the new role.
        const next = { ...s, approval_role_id: roleId, approver_employee_id: '', approver_name: '' }
        const defaults = roleDefaults(roleId)
        // Apply the spec's per-role defaults only when the previous values were
        // still the old role's defaults — never overwrite deliberate choices.
        const previousDefaults = roleDefaults(s.approval_role_id)
        if (s.assignment_mode === previousDefaults.mode) next.assignment_mode = defaults.mode
        if (s.scope_type === previousDefaults.scope) next.scope_type = defaults.scope
        if (!s.note || s.note === previousDefaults.note) next.note = defaults.note
        if (next.fallback_approval_role_id === roleId) next.fallback_approval_role_id = ''
        return next
      }),
    )
  }

  const removeStep = (index: number) => {
    setDraftSteps((prev) => prev.filter((_, i) => i !== index))
  }

  // ---- Live preview ------------------------------------------------------
  const [preview, setPreview] = useState<WorkflowCheckResult | null>(null)
  const [previewError, setPreviewError] = useState<string | null>(null)
  const [previewLoading, setPreviewLoading] = useState(false)
  const previewSeq = useRef(0)

  useEffect(() => {
    if (!builder || !builder.leaveTypeId) {
      // Invalidate any in-flight check so a late response cannot paint stale
      // coverage into the next builder session.
      previewSeq.current += 1
      setPreview(null)
      setPreviewError(null)
      setPreviewLoading(false)
      return
    }

    const seq = ++previewSeq.current
    setPreviewLoading(true)
    const timer = setTimeout(() => {
      void leaveApi.workflows
        .check({
          id: builder.mode === 'edit' ? builder.defId : undefined,
          leave_type_id: builder.leaveTypeId,
          workflow_title: builder.title.trim() || undefined,
          min_duration_days: builder.mode === 'edit' ? Math.max(1, builder.minDays) : 1,
          max_duration_days:
            builder.mode === 'edit' && builder.maxDays !== '' ? Number(builder.maxDays) : null,
          zone_id: builder.scopeKind === 'zone' ? builder.zoneId || null : null,
          department_ids: builder.scopeKind === 'department' ? builder.departmentIds : [],
          steps: draftSteps.map((s) => ({
            approval_role_id: s.approval_role_id,
            approver_employee_id: s.approver_employee_id || null,
            assignment_mode: 'assigned_approver' as const,
            scope_type: s.scope_type,
            is_mandatory: s.is_mandatory,
            note: s.note,
          })),
        })
        .then((res) => {
          if (previewSeq.current !== seq) return
          setPreview(res.data)
          setPreviewError(null)
        })
        .catch((error) => {
          if (previewSeq.current !== seq) return
          setPreview(null)
          setPreviewError(errorText(error))
        })
        .finally(() => {
          if (previewSeq.current === seq) setPreviewLoading(false)
        })
    }, 350)

    return () => clearTimeout(timer)
  }, [builder, draftSteps])

  // ---- Save --------------------------------------------------------------
  const save = async () => {
    if (!builder || !(builder.mode === 'edit' ? canEditWorkflows : canCreateWorkflows) || saving) return

    const local: Record<string, string[]> = {}
    const title = builder.title.trim()
    if (!title) local.workflow_title = ['Workflow title is required.']
    if (title.length > 150) local.workflow_title = ['Workflow title may not exceed 150 characters.']
    if (!builder.leaveTypeId) local.leave_type_id = ['Select a leave type.']
    if (draftSteps.length === 0) local.steps = ['Add at least one approval step.']
    draftSteps.forEach((s, i) => {
      if (!s.approval_role_id) local[`steps.${i}.approval_role_id`] = ['Select an approval role.']
      if (!s.approver_employee_id) {
        local[`steps.${i}.approver_employee_id`] = ['Select the employee who will approve this step.']
      }
    })
    if (builder.scopeKind === 'zone' && !builder.zoneId) local.zone_id = ['Select a zone.']
    if (builder.scopeKind === 'department' && builder.departmentIds.length === 0) {
      local.department_ids = ['Select at least one department.']
    }

    if (Object.keys(local).length > 0) {
      setFieldErrors(local)
      setSaveError('Please correct the highlighted fields before saving.')
      return
    }

    const payload = {
      workflow_title: title,
      leave_type_id: builder.leaveTypeId,
      // Duration bands are no longer edited here, but existing definitions keep
      // their stored values instead of silently collapsing to "any duration".
      min_duration_days: builder.mode === 'edit' ? Math.max(1, builder.minDays) : 1,
      max_duration_days:
        builder.mode === 'edit' && builder.maxDays !== '' ? Number(builder.maxDays) : null,
      zone_id: builder.scopeKind === 'zone' ? builder.zoneId || null : null,
      department_ids: builder.scopeKind === 'department' ? builder.departmentIds : [],
      notes: builder.notes.trim() || null,
      // The new builder always names an approver: the API enforces the flag
      // server-side, so a step cannot silently fall back to dynamic resolution.
      strict_approvers: true,
      steps: draftSteps.map((s) => ({
        approval_role_id: s.approval_role_id,
        approver_employee_id: s.approver_employee_id,
        assignment_mode: 'assigned_approver' as const,
        scope_type: s.scope_type,
        sla_days: s.sla_days,
        is_mandatory: s.is_mandatory,
        allow_same_person_as_previous_steps: s.allow_same_person_as_previous_steps,
        note: s.note.trim() || null,
      })),
    }

    setSaving(true)
    setSaveError(null)
    setFieldErrors({})
    try {
      if (builder.mode === 'edit' && builder.defId) {
        await leaveApi.workflows.update(builder.defId, payload)
        toast.success('Mchakato umesasishwa. Maombi mapya yatatumia mnyororo uliorekebishwa.')
      } else {
        await leaveApi.workflows.store(payload)
        toast.success('Mchakato umeundwa. Maombi mapya yatatumia mnyororo huu.')
      }
      await afterWrite()
      closeBuilder()
    } catch (error) {
      const api = error instanceof ApiError ? error : null
      const errors = api?.fieldErrors ?? {}
      setFieldErrors(errors)
      setSaveError(
        errors.workflow?.[0] ??
          errors.workflow_title?.[0] ??
          Object.values(errors)[0]?.[0] ??
          api?.message ??
          'Could not save the workflow. Check the fields and try again.',
      )
    } finally {
      setSaving(false)
    }
  }

  // ---- Activate / delete -------------------------------------------------
  const toggleActive = async (def: WorkflowDefDto) => {
    try {
      await leaveApi.workflows.update(def.id, { is_active: !def.is_active })
      toast.info(
        def.is_active
          ? 'Mchakato umezimwa. Hautapitisha maombi mapya.'
          : 'Mchakato umewashwa. Maombi mapya yatautumia.',
      )
      await afterWrite()
    } catch (error) {
      toast.error(errorText(error))
    }
  }

  const confirmDelete = async () => {
    if (!deleteDef) return
    setDeleting(true)
    try {
      await leaveApi.workflows.destroy(deleteDef.id)
      toast.success('Mchakato umefutwa.')
      await afterWrite()
    } catch (error) {
      toast.error(errorText(error))
    } finally {
      setDeleting(false)
    }
  }

  // ---- Builder helpers ---------------------------------------------------
  const checkConflict = preview?.conflict === true

  const stepsEditor = (
    <div className="space-y-4">
      {draftSteps.length === 0 && (
        <p className="rounded-xl border border-dashed border-border bg-warm/60 px-3.5 py-4 text-[12px] text-muted-foreground">
          No steps yet — add the first approval step below.
        </p>
      )}

      {draftSteps.map((s, i) => {
        const holders = holdersByRole[s.approval_role_id] ?? []
        const loading = loadingHolders[s.approval_role_id] === true
        const selected = s.approver_employee_id
        const selectedHolder = holders.find((h) => h.id === selected)
        const selectedName = s.approver_name || selectedHolder?.full_name || ''
        const stale = Boolean(selected) && !loading && holders.length > 0 && !selectedHolder

        return (
          <div key={i} className="rounded-xl border border-border bg-warm dark:bg-muted/30 p-3.5 space-y-3">
            <div className="flex items-center justify-between gap-2 border-b border-border/60 pb-2">
              <span className="text-[11px] font-mono font-bold text-teal-700 dark:text-teal-300">Step {i + 1}</span>
              <button
                type="button"
                onClick={() => removeStep(i)}
                className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-600 hover:underline dark:text-rose-400"
              >
                <Trash2 className="h-3 w-3" /> Remove step
              </button>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="relative">
                <label className="block text-[12px] font-semibold text-foreground mb-1">Approval role</label>
                <input
                  type="text"
                  placeholder="Search roles..."
                  value={roleSearch}
                  onChange={(e) => setRoleSearch(e.target.value)}
                  className="mb-1 w-full rounded-lg border border-border bg-background px-3 py-1.5 text-[12px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-teal-500/40"
                />
                <select
                  value={s.approval_role_id}
                  onChange={(e) => { changeStepRole(i, e.target.value); setRoleSearch('') }}
                  className="w-full rounded-lg border border-border bg-background px-3 py-1.5 text-[12px] text-foreground focus:outline-none focus:ring-2 focus:ring-teal-500/40"
                >
                  {loadingRoles && approvalRoles.length === 0 && <option value={s.approval_role_id}>Loading roles...</option>}
                  {approvalRoles
                    .filter((r) => !roleSearch || r.name.toLowerCase().includes(roleSearch.toLowerCase()) || r.code.toLowerCase().includes(roleSearch.toLowerCase()))
                    .map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.name}
                      </option>
                    ))}
                </select>
                <FieldError message={err(`steps.${i}.approval_role_id`)} />
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold text-foreground">Approver</label>
                <TextInput
                  placeholder="Search employee…"
                  value={approverSearch[i] ?? ''}
                  onChange={(e) => setApproverSearch((prev) => ({ ...prev, [i]: e.target.value }))}
                />
                <div className="max-h-40 overflow-y-auto rounded-lg border border-border bg-background">
                  {loading && <p className="px-3 py-2 text-[11px] text-muted-foreground">Loading employees…</p>}
                  {!loading && holders.length === 0 && (
                    <p className="px-3 py-2 text-[11px] text-muted-foreground">No employees hold this role</p>
                  )}
                  {holders
                    .filter((h) =>
                      (approverSearch[i] ?? '').trim() === ''
                        ? true
                        : h.full_name.toLowerCase().includes((approverSearch[i] ?? '').toLowerCase()),
                    )
                    .map((h) => (
                      <button
                        key={h.id}
                        type="button"
                        onClick={() => {
                          updateStep(i, { approver_employee_id: h.id, approver_name: h.full_name })
                          setApproverSearch((prev) => ({ ...prev, [i]: '' }))
                        }}
                        className={cn(
                          'block w-full px-3 py-1.5 text-left text-[12px] hover:bg-muted/40',
                          selected === h.id && 'bg-teal-50 font-semibold text-teal-800 dark:bg-teal-950/40 dark:text-teal-200',
                        )}
                      >
                        {h.full_name}
                      </button>
                    ))}
                </div>
                <FieldError message={err(`steps.${i}.approver_employee_id`)} />
              </div>
            </div>

            <div className="rounded-xl border border-teal-200 bg-teal-50 px-3 py-2 text-[12px] font-semibold text-teal-800 dark:border-teal-900 dark:bg-teal-950/50 dark:text-teal-200">
              {selected ? `Approver: ${selectedName || 'Selected employee'}` : 'Approver: not selected yet'}
            </div>

            {stale && (
              <p className="text-[10px] font-medium text-amber-600 dark:text-amber-400">
                This employee no longer holds the selected role. Choose a current holder.
              </p>
            )}
          </div>
        )
      })}

      <Btn variant="outline" onClick={addStep}>
        <Plus className="h-3.5 w-3.5" /> Add approval step
      </Btn>
      <FieldError message={err('steps')} />
    </div>
  )

  const previewPanel = (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-teal-700 dark:text-teal-300" />
          <p className="text-[13px] font-semibold text-foreground">Live preview</p>
        </div>
        {previewLoading && <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />}
      </div>

      {!builder?.leaveTypeId ? (
        <p className="mt-3 text-[12px] text-muted-foreground">Choose a leave type to preview the chain.</p>
      ) : previewError ? (
        <p className="mt-3 text-[12px] text-muted-foreground">{previewError}</p>
      ) : preview ? (
        <div className="mt-3 space-y-3">
          {preview.conflict ? (
            <Banner tone="rose" title="Overlapping active workflow">
              {preview.message ??
                'Another active workflow already covers the same leave type, scope and duration. Deactivate or edit it before saving.'}
            </Banner>
          ) : (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-[11px] text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-200">
              <span className="font-semibold">No overlap.</span> This chain can be saved as an active rule.
            </div>
          )}

          <div className="rounded-xl border border-border bg-warm/50 px-3 py-2.5 text-[11px] text-muted-foreground">
            <p>
              <span className="font-semibold text-foreground">Applies to:</span> {preview.applies_to}
            </p>
          </div>

          <div>
            <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              Chain ({preview.steps.length} step{preview.steps.length === 1 ? '' : 's'})
            </p>
            <ol className="space-y-1.5">
              {preview.steps.map((s) => (
                <li key={s.step_order} className="flex items-start gap-2 rounded-lg border border-border bg-card px-2.5 py-2">
                  <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-teal-700/10 text-[10px] font-bold text-teal-700 dark:text-teal-300">
                    {s.step_order}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[12px] font-semibold text-foreground">
                      {s.approval_role_name ?? roleName(s.approval_role_id)}
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      {s.approver_name ? `Approver: ${s.approver_name}` : 'Approver not selected'}
                    </p>
                  </div>
                </li>
              ))}
              {preview.steps.length === 0 && (
                <li className="rounded-lg border border-dashed border-border px-2.5 py-3 text-[11px] text-muted-foreground">
                  Add at least one step to see the chain.
                </li>
              )}
            </ol>
          </div>

          <div className="rounded-xl border border-sky-200 bg-sky-50 px-3 py-2.5 text-[11px] text-sky-900 dark:border-sky-900 dark:bg-sky-950/50 dark:text-sky-200">
            <p className="flex items-center gap-1.5 font-semibold">
              <Info className="h-3.5 w-3.5" /> Final authority
            </p>
            {preview.final_authority.auto ? (
              <p className="mt-1 leading-relaxed">
                Added automatically when {preview.final_authority.reasons.join('; ')}.
              </p>
            ) : (
              <p className="mt-1 leading-relaxed">
                Not added automatically for this leave type. Add a Final Authority step if the DPP must sign off every
                request.
              </p>
            )}
          </div>
        </div>
      ) : (
        <p className="mt-3 text-[12px] text-muted-foreground">Fill in the chain to see where it applies.</p>
      )}
    </div>
  )

  // ---- Render ------------------------------------------------------------
  const sortIndicator = (column: NonNullable<WorkflowListParams['sort']>) =>
    sort === column ? (direction === 'asc' ? '↑' : '↓') : ''

  return (
    <div className="mx-auto max-w-[1400px] space-y-6 px-4 py-6 sm:px-6 lg:px-8">
      <SectionHeading
        title="Approval workflows"
        subtitle="Each leave type routes through an ordered chain of approval steps. Every step names the role and the employee who will approve it."
        actions={
          <div className="flex items-center gap-2">
            {canCreateWorkflows && (
              <Btn onClick={() => openCreate()}>
                <FilePlus2 className="h-3.5 w-3.5" /> New workflow
              </Btn>
            )}
            <Tabs
              value="builder"
              onChange={() => onNavigate?.('approvals')}
              tabs={[
                { value: 'builder', label: 'Workflow builder', icon: WorkflowIcon },
                { value: 'queue', label: 'Go to approval queue', icon: ListChecks },
              ]}
            />
          </div>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={WorkflowIcon} label="Workflows" value={workflowDefs.length} hint={`${activeCount} active`} tone="teal" />
        <StatCard icon={Gauge} label="Decision steps" value={stepCount} hint="Across all definitions" tone="emerald" />
        <StatCard icon={AlertTriangle} label="Final-authority gates" value={finalAuthorityCount} hint="Chains ending at the DPP" tone="amber" />
        <StatCard
          icon={ShieldCheck}
          label="Leave types covered"
          value={leaveTypes.length - uncovered.length}
          hint={`${leaveTypes.length} types configured in HR`}
          tone="sky"
        />
      </div>

      <Panel
        title="Workflow definitions"
        subtitle="Filter and sort server-side; the page, filters and sort are kept in the URL."
      >
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative min-w-[200px] flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <input
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value)
                  resetToFirstPage()
                }}
                placeholder="Search by workflow title…"
                aria-label="Search workflows"
                className="h-9 w-full rounded-xl border border-input bg-card pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/40"
              />
            </div>
            <select
              aria-label="Filter by leave type"
              value={typeFilter}
              onChange={(e) => {
                setTypeFilter(e.target.value)
                resetToFirstPage()
              }}
              className="h-9 cursor-pointer rounded-xl border border-input bg-card px-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring/40"
            >
              <option value="">All leave types</option>
              {leaveTypes.map((lt) => (
                <option key={lt.id} value={lt.id}>
                  {lt.name}
                </option>
              ))}
            </select>
            <select
              aria-label="Filter by status"
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value as 'active' | 'inactive' | '')
                resetToFirstPage()
              }}
              className="h-9 cursor-pointer rounded-xl border border-input bg-card px-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring/40"
            >
              <option value="">All statuses</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
            <select
              aria-label="Filter by scope"
              value={scopeFilter}
              onChange={(e) => {
                setScopeFilter(e.target.value as 'office_wide' | 'zone' | 'department' | '')
                resetToFirstPage()
              }}
              className="h-9 cursor-pointer rounded-xl border border-input bg-card px-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring/40"
            >
              <option value="">All scopes</option>
              <option value="office_wide">Entire office</option>
              <option value="zone">Zone</option>
              <option value="department">Department</option>
            </select>
            <button
              type="button"
              onClick={() => void fetchList()}
              className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-border bg-card px-3 text-[12px] font-semibold text-foreground hover:bg-accent"
              title="Refresh"
            >
              <RefreshCw className={cn('h-3.5 w-3.5', loading && 'animate-spin')} /> Refresh
            </button>
            <span className="text-[11px] tabular-nums text-muted-foreground">
              {total === 0 ? 'Showing 0 of 0' : `Showing ${from ?? 0}–${to ?? 0} of ${total}`}
            </span>
          </div>

          {listError && (
            <Banner tone="rose" title="Could not load workflows">
              {listError}
            </Banner>
          )}

          <div className="overflow-x-auto rounded-2xl border border-border">
            <table className="w-full min-w-[1000px] border-collapse text-left">
              <thead className="bg-warm/70 dark:bg-muted/40">
                <tr className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                  <th className="px-4 py-2.5">
                    <button type="button" className="hover:text-foreground" onClick={() => toggleSort('title')}>
                      Workflow {sortIndicator('title')}
                    </button>
                  </th>
                  <th className="px-3 py-2.5">
                    <button type="button" className="hover:text-foreground" onClick={() => toggleSort('leave_type')}>
                      Leave type {sortIndicator('leave_type')}
                    </button>
                  </th>
                  <th className="px-3 py-2.5">Applies to</th>
                  {hasCustomDurations && <th className="px-3 py-2.5">Min duration</th>}
                  <th className="px-3 py-2.5">Steps</th>
                  <th className="px-3 py-2.5">Status</th>
                  <th className="px-3 py-2.5">
                    <button type="button" className="hover:text-foreground" onClick={() => toggleSort('created_at')}>
                      Created {sortIndicator('created_at')}
                    </button>
                  </th>
                  <th className="px-3 py-2.5">
                    <button type="button" className="hover:text-foreground" onClick={() => toggleSort('updated_at')}>
                      Updated {sortIndicator('updated_at')}
                    </button>
                  </th>
                  <th className="px-3 py-2.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading && rows.length === 0 && (
                  <tr>
                    <td colSpan={colCount} className="px-4 py-10 text-center text-[12px] text-muted-foreground">
                      <Loader2 className="mx-auto mb-2 h-4 w-4 animate-spin" />
                      Loading workflows…
                    </td>
                  </tr>
                )}
                {!loading && rows.length === 0 && !listError && (
                  <tr>
                    <td colSpan={colCount} className="px-4 py-10 text-center text-[12px] text-muted-foreground">
                      No workflows match these filters.
                    </td>
                  </tr>
                )}
                {rows.map((def) => {
                  const lt = typeOf(def.leave_type_id)
                  const active = def.is_active !== false
                  return (
                    <tr key={def.id} className={cn('border-t border-border align-top', !active && 'opacity-70')}>
                      <td className="px-4 py-3">
                        <div className="flex items-start gap-2.5">
                          <span className={cn('mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full', lt?.color ?? 'bg-zinc-400')} />
                          <div className="min-w-0">
                            <p className="text-[12px] font-semibold text-foreground">{def.workflow_title}</p>
                            <p className="mt-0.5 text-[10px] font-mono text-muted-foreground">
                              v{def.version} · {scopeKindLabel(def.scope_kind)}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-3 text-[12px] text-foreground">{lt?.name ?? def.leave_type_name ?? def.leave_type_id}</td>
                      <td className="px-3 py-3 text-[11px] text-muted-foreground">
                        {def.applies_to ?? def.scope_label ?? '—'}
                      </td>
                      {hasCustomDurations && (
                        <td className="whitespace-nowrap px-3 py-3 text-[11px] tabular-nums text-foreground">
                          {conciseDuration(def)}
                        </td>
                      )}
                      <td className="px-3 py-3">
                        <div className="flex max-w-[240px] flex-wrap gap-1">
                          {(def.steps ?? []).map((s, i) => (
                            <span
                              key={s.id ?? i}
                              className="inline-flex items-center gap-1 rounded-full border border-border bg-warm px-2 py-0.5 text-[10px] font-semibold text-foreground dark:bg-muted/30"
                              title={
                                s.approver?.full_name
                                  ? `Approver: ${s.approver.full_name}`
                                  : 'No approver selected — legacy role resolution'
                              }
                            >
                              {i + 1}. {s.approval_role?.name ?? roleName(s.approval_role_id)}
                            </span>
                          ))}
                          {(def.steps ?? []).length === 0 && (
                            <span className="text-[10px] font-semibold text-rose-600">No steps</span>
                          )}
                        </div>
                      </td>
                      <td className="px-3 py-3">
                        <span
                          className={cn(
                            'inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold',
                            active
                              ? 'border-teal-200 bg-teal-50 text-teal-700 dark:border-teal-900 dark:bg-teal-950 dark:text-teal-300'
                              : 'border-border bg-muted text-muted-foreground',
                          )}
                        >
                          {active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-3 py-3 text-[11px] text-muted-foreground">
                        {fmtDate(def.created_at)}
                      </td>
                      <td className="whitespace-nowrap px-3 py-3 text-[11px] text-muted-foreground">
                        {fmtDate(def.updated_at)}
                      </td>
                      <td className="px-3 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => setViewDef(def)}
                            aria-label={`View details for ${def.workflow_title}`}
                            title="View workflow details"
                            className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground transition-colors hover:border-primary/40 hover:bg-secondary hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </button>
                          {canEditWorkflows && (
                            <RowMenu
                              items={[
                                { icon: Eye, label: 'View details', onClick: () => setViewDef(def) },
                                { icon: Pencil, label: 'Edit workflow', onClick: () => openEdit(def) },
                                {
                                  icon: Power,
                                  label: active ? 'Deactivate' : 'Activate',
                                  tone: active ? 'danger' : 'default',
                                  onClick: () => void toggleActive(def),
                                },
                                {
                                  icon: Trash2,
                                  label: 'Delete workflow',
                                  tone: 'danger',
                                  onClick: () => setDeleteDef(def),
                                },
                              ]}
                            />
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          <Pagination
            page={page}
            pageSize={perPage}
            total={total}
            onPage={setPage}
            onPageSize={(size) => {
              setPerPage(size)
              setPage(1)
            }}
            pageSizeOptions={[10, 25, 50, 100]}
          />
        </div>
      </Panel>

      {uncovered.length > 0 && (
        <Panel title="Leave types without a workflow" subtitle="Submissions for these types cannot resolve an approval chain.">
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3">
            {uncovered.map((lt) => (
              <div
                key={lt.id}
                className="flex items-center gap-3 rounded-xl border border-dashed border-border bg-card/60 px-3.5 py-3"
              >
                <span className={cn('h-2.5 w-2.5 shrink-0 rounded-full', lt.color)} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[12px] font-semibold text-foreground">{lt.name}</p>
                  <p className="text-[10px] font-semibold text-rose-600">No workflow defined</p>
                </div>
                {canCreateWorkflows && (
                  <Btn variant="outline" onClick={() => openCreate(lt.id)} className="px-2.5 py-1.5">
                    <Plus className="h-3 w-3" /> Create
                  </Btn>
                )}
              </div>
            ))}
          </div>
        </Panel>
      )}

      {/* ---------------------------------------------------------------- */}
      {/* Workflow details                                                  */}
      {/* ---------------------------------------------------------------- */}
      <Modal
        open={viewDef !== null}
        onClose={() => setViewDef(null)}
        title={
          <span className="flex items-center gap-2">
            <span className="inline-flex h-6 w-6 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <WorkflowIcon className="h-3.5 w-3.5" />
            </span>
            {viewDef?.workflow_title ?? 'Workflow details'}
          </span>
        }
        subtitle={
          viewDef
            ? `${typeOf(viewDef.leave_type_id)?.name ?? viewDef.leave_type_name ?? 'Leave type'} · version ${viewDef.version}`
            : undefined
        }
        size="lg"
        footer={
          <div className="flex w-full items-center justify-between gap-2">
            <span className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <ShieldCheck className="h-3.5 w-3.5" />
              {(viewDef?.steps ?? []).length} approval {(viewDef?.steps ?? []).length === 1 ? 'step' : 'steps'}
            </span>
            <div className="flex items-center gap-2">
              <Btn variant="outline" onClick={() => setViewDef(null)}>
                Close
              </Btn>
              {canEditWorkflows && viewDef && (
                <Btn
                  onClick={() => {
                    const def = viewDef
                    setViewDef(null)
                    openEdit(def)
                  }}
                >
                  <Pencil className="h-3.5 w-3.5" /> Edit workflow
                </Btn>
              )}
            </div>
          </div>
        }
      >
        {viewDef &&
          (() => {
            const lt = typeOf(viewDef.leave_type_id)
            const active = viewDef.is_active !== false
            const steps = [...(viewDef.steps ?? [])].sort((a, b) => a.step_order - b.step_order)
            const meta: Array<{ icon: typeof Building2; label: string; value: string }> = [
              { icon: Building2, label: 'Scope', value: scopeKindLabel(viewDef.scope_kind) },
              { icon: Calendar, label: 'Duration rule', value: viewDef.duration_label ?? conciseDuration(viewDef) },
              { icon: Clock, label: 'Effective from', value: fmtDate(viewDef.effective_from) },
              { icon: RefreshCw, label: 'Last updated', value: fmtDate(viewDef.updated_at) },
            ]

            return (
              <div className="space-y-5">
                <div className="overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-secondary/80 via-secondary/30 to-card">
                  <div className="flex flex-wrap items-start justify-between gap-3 p-4">
                    <div className="flex min-w-0 items-start gap-3">
                      <span
                        className={cn(
                          'mt-1 h-3 w-3 shrink-0 rounded-full ring-4 ring-background',
                          lt?.color ?? 'bg-zinc-400',
                        )}
                      />
                      <div className="min-w-0">
                        <p className="text-[13px] font-semibold text-foreground">
                          {lt?.name ?? viewDef.leave_type_name ?? 'Leave type'}
                        </p>
                        <p className="mt-0.5 text-[11px] text-muted-foreground">
                          {viewDef.applies_to ?? viewDef.scope_label ?? scopeKindLabel(viewDef.scope_kind)}
                        </p>
                      </div>
                    </div>
                    <span
                      className={cn(
                        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[10px] font-semibold',
                        active
                          ? 'border-teal-200 bg-teal-50 text-teal-700 dark:border-teal-900 dark:bg-teal-950 dark:text-teal-300'
                          : 'border-border bg-muted text-muted-foreground',
                      )}
                    >
                      <span className={cn('h-1.5 w-1.5 rounded-full', active ? 'bg-teal-500' : 'bg-zinc-400')} />
                      {active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-px border-t border-border bg-border sm:grid-cols-4">
                    {meta.map(({ icon: Icon, label, value }) => (
                      <div key={label} className="flex items-start gap-2 bg-card px-3 py-2.5">
                        <Icon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                        <div className="min-w-0">
                          <p className="text-[9px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
                          <p className="mt-0.5 truncate text-[11px] font-medium text-foreground" title={value}>
                            {value}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <div className="mb-3 flex items-end justify-between gap-2">
                    <div>
                      <p className="text-[12px] font-semibold text-foreground">Approval chain</p>
                      <p className="text-[10px] text-muted-foreground">
                        Requests move through these steps in order; each names the role and the employee who approves it.
                      </p>
                    </div>
                    <span className="shrink-0 rounded-full border border-border bg-warm px-2 py-0.5 text-[10px] font-semibold text-muted-foreground dark:bg-muted/30">
                      {steps.length} {steps.length === 1 ? 'step' : 'steps'}
                    </span>
                  </div>

                  {steps.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-rose-200 bg-rose-50/60 px-4 py-6 text-center dark:border-rose-900 dark:bg-rose-950/20">
                      <AlertTriangle className="mx-auto mb-2 h-4 w-4 text-rose-500" />
                      <p className="text-[12px] font-semibold text-rose-700 dark:text-rose-300">
                        No approval steps configured
                      </p>
                      <p className="mt-0.5 text-[10px] text-rose-600/80 dark:text-rose-300/80">
                        This workflow cannot route submissions until a step is added.
                      </p>
                    </div>
                  ) : (
                    <ol className="space-y-0">
                      {steps.map((s, i) => {
                        const last = i === steps.length - 1
                        const approver = s.approver
                        return (
                          <li key={s.id ?? `${s.step_order}-${i}`} className="flex gap-3 pb-3 last:pb-0">
                            <div className="flex flex-col items-center">
                              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-primary/20 bg-primary/10 text-[11px] font-bold text-primary">
                                {i + 1}
                              </span>
                              {!last && <span className="mt-1 w-px flex-1 bg-border" />}
                            </div>
                            <div className="min-w-0 flex-1 rounded-xl border border-border bg-card p-3">
                              <div className="flex flex-wrap items-start justify-between gap-2">
                                <div className="min-w-0">
                                  <p className="text-[9px] font-semibold uppercase tracking-wide text-muted-foreground">
                                    Step {i + 1}
                                  </p>
                                  <p className="text-[12px] font-semibold text-foreground">
                                    {s.approval_role?.name ?? roleName(s.approval_role_id ?? s.role_required)}
                                  </p>
                                </div>
                                <span className="rounded-full border border-border bg-secondary/60 px-2 py-0.5 text-[9px] font-semibold text-muted-foreground">
                                  {s.assignment_mode === 'shared_queue' ? 'Shared queue' : 'Assigned approver'}
                                </span>
                              </div>
                              <div className="mt-2.5 flex items-center gap-2.5 rounded-lg border border-border/70 bg-secondary/40 px-2.5 py-2">
                                {approver ? (
                                  <Avatar
                                    id={approver.id}
                                    name={approver.full_name}
                                    initials={approver.avatar_initials ?? approver.initials}
                                    photoUrl={approver.avatar_url}
                                    size="sm"
                                  />
                                ) : (
                                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-dashed border-border bg-card text-muted-foreground">
                                    <User className="h-3 w-3" />
                                  </span>
                                )}
                                <div className="min-w-0">
                                  <p className="truncate text-[11px] font-semibold text-foreground">
                                    {approver?.full_name ?? 'Resolved from role holders at submission'}
                                  </p>
                                  <p className="truncate text-[10px] text-muted-foreground">
                                    {approver
                                      ? approver.position?.title ?? approver.email ?? 'Approver'
                                      : 'No specific employee pinned — legacy role resolution'}
                                  </p>
                                </div>
                              </div>
                              {s.note && (
                                <p className="mt-2 border-l-2 border-border pl-2 text-[10px] italic text-muted-foreground">
                                  {s.note}
                                </p>
                              )}
                            </div>
                          </li>
                        )
                      })}
                    </ol>
                  )}
                </div>
              </div>
            )
          })()}
      </Modal>

      {/* ---------------------------------------------------------------- */}
      {/* Builder                                                          */}
      {/* ---------------------------------------------------------------- */}
      <Modal
        open={builder !== null}
        onClose={closeBuilder}
        title={
          builder?.mode === 'create'
            ? `New workflow — ${typeOf(builder.leaveTypeId)?.name ?? 'select a leave type'}`
            : builder
              ? `Edit workflow — ${builder.title || typeOf(builder.leaveTypeId)?.name || ''}`
              : 'Workflow builder'
        }
        subtitle="Name the workflow, choose where it applies, then pick an approver for each step."
        size="xl"
        footer={
          <div className="flex w-full items-center justify-between gap-2">
            <span className="text-[11px] text-muted-foreground">
              {checkConflict ? 'Resolve the overlapping active workflow before saving.' : `${draftSteps.length} step${draftSteps.length === 1 ? '' : 's'}`}
            </span>
            <div className="flex items-center gap-2">
              <Btn variant="outline" onClick={closeBuilder}>
                Cancel
              </Btn>
              <Btn
                onClick={() => void save()}
                disabled={saving || checkConflict || draftSteps.length === 0 || !builder?.title.trim()}
                title={checkConflict ? 'An active workflow already covers this scope and duration.' : undefined}
              >
                {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                {builder?.mode === 'create' ? 'Create workflow' : 'Save changes'}
              </Btn>
            </div>
          </div>
        }
      >
        {builder && (
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
            <div className="space-y-5">
              {saveError && (
                <Banner tone="rose" title="Could not save this workflow" onClose={() => setSaveError(null)}>
                  {saveError}
                </Banner>
              )}

              {/* Identity */}
              <section className="space-y-3 rounded-2xl border border-border bg-card p-4">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Identity</p>

                <div>
                  <TextInput
                    label="Workflow title"
                    value={builder.title}
                    maxLength={150}
                    placeholder="e.g. Annual Leave — Standard office chain"
                    onChange={(e) => setBuilder({ ...builder, title: e.target.value })}
                  />
                  <FieldError message={err('workflow_title')} />
                  <p className="mt-1 text-[10px] text-muted-foreground">
                    Required. Use a name that distinguishes this chain from other rules for the same leave type.
                  </p>
                </div>

                <div>
                  <SelectInput
                    label="Leave type"
                    value={builder.leaveTypeId}
                    disabled={builder.mode === 'edit'}
                    onChange={(e) =>
                      setBuilder({
                        ...builder,
                        leaveTypeId: e.target.value,
                      })
                    }
                  >
                    {leaveTypes.map((lt) => (
                      <option key={lt.id} value={lt.id}>
                        {lt.name}
                      </option>
                    ))}
                  </SelectInput>
                  <FieldError message={err('leave_type_id')} />
                  {builder.mode === 'edit' && (
                    <p className="mt-1 text-[10px] text-muted-foreground">
                      The leave type is fixed for an existing workflow.
                    </p>
                  )}
                </div>

                <div>
                  <p className="mb-1.5 text-[12px] font-semibold text-foreground">Applies to</p>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                    {(
                      [
                        { value: 'office_wide', label: 'Entire office', hint: 'Every employee' },
                        { value: 'zone', label: 'Zone', hint: 'One zone' },
                        { value: 'department', label: 'Department', hint: 'One department' },
                      ] as { value: ScopeKind; label: string; hint: string }[]
                    ).map((option) => {
                      const selected = builder.scopeKind === option.value
                      return (
                        <button
                          key={option.value}
                          type="button"
                          aria-pressed={selected}
                          onClick={() => setBuilder({ ...builder, scopeKind: option.value })}
                          className={cn(
                            'rounded-xl border px-3 py-2.5 text-left transition',
                            selected
                              ? 'border-teal-600 bg-teal-50 text-teal-800 dark:border-teal-500 dark:bg-teal-950/60 dark:text-teal-200'
                              : 'border-border bg-card text-foreground hover:bg-accent',
                          )}
                        >
                          <span className="block text-[12px] font-semibold">{option.label}</span>
                          <span className="block text-[10px] text-muted-foreground">{option.hint}</span>
                        </button>
                      )
                    })}
                  </div>
                  <FieldError message={err('zone_id') || err('department_ids')} />
                </div>

                {builder.scopeKind === 'zone' && (
                  <SelectInput
                    label="Zone"
                    value={builder.zoneId}
                    onChange={(e) => setBuilder({ ...builder, zoneId: e.target.value })}
                  >
                    <option value="">Select a zone…</option>
                    {allZones.map((zone) => (
                      <option key={zone.id} value={zone.id}>
                        {zone.name}
                      </option>
                    ))}
                  </SelectInput>
                )}

                {builder.scopeKind === 'department' && (
                  <>
                    <MultiSelect
                      label="Departments"
                      hint="Pick every department, division or unit this workflow covers."
                      options={allDepts
                        .filter((d) => d.isActive !== false)
                        .map((d) => ({ value: d.id, label: d.name }))}
                      value={builder.departmentIds}
                      onChange={(ids) => setBuilder({ ...builder, departmentIds: ids })}
                      placeholder="Search or pick departments…"
                      searchPlaceholder="Type to filter departments…"
                      searchable
                    />
                    <FieldError message={err('department_ids')} />
                  </>
                )}

                <div className="rounded-xl border border-border bg-warm/60 px-3 py-2 text-[11px] text-muted-foreground dark:bg-muted/30">
                  <span className="font-semibold text-foreground">Coverage:</span>{' '}
                  {builder.scopeKind === 'office_wide'
                    ? 'All employees (entire office)'
                    : builder.scopeKind === 'zone'
                      ? builder.zoneId
                        ? `Employees in ${allZones.find((z) => z.id === builder.zoneId)?.name ?? builder.zoneId} zone`
                        : 'Select a zone'
                      : builder.departmentIds.length > 0
                        ? builder.departmentIds.length <= 2
                          ? `Employees in ${builder.departmentIds
                              .map((id) => allDepts.find((d) => d.id === id)?.name ?? id)
                              .join(' and ')}`
                          : `Employees in ${builder.departmentIds.length} selected placements (${builder.departmentIds
                              .slice(0, 2)
                              .map((id) => allDepts.find((d) => d.id === id)?.name ?? id)
                              .join(', ')} +${builder.departmentIds.length - 2} more)`
                        : 'Select at least one department'}
                </div>
              </section>

              {/* Steps */}
              <section className="space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Approval steps</p>
                  <span className="text-[10px] text-muted-foreground">Ordered top to bottom</span>
                </div>
                {stepsEditor}
              </section>
            </div>

            <div className="lg:sticky lg:top-0 lg:self-start">{previewPanel}</div>
          </div>
        )}
      </Modal>

      <ConfirmModal
        open={deleteDef !== null}
        onClose={() => setDeleteDef(null)}
        title="Delete this workflow?"
        confirmLabel={deleting ? 'Deleting…' : 'Delete workflow'}
        tone="danger"
        confirmDisabled={deleting}
        message={
          <div className="space-y-2">
            <p className="font-medium text-foreground">{deleteDef?.workflow_title}</p>
            <p>
              This removes version {deleteDef?.version} of the{' '}
              {deleteDef ? (typeOf(deleteDef.leave_type_id)?.name ?? deleteDef.leave_type_id) : ''} chain permanently.
            </p>
            <p className="text-[12px]">
              Workflows attached to submitted requests cannot be deleted — deactivate them instead.
            </p>
          </div>
        }
        onConfirm={() => void confirmDelete()}
      />
    </div>
  )
}
