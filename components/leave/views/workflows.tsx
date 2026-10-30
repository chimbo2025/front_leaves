'use client'

import { useState, useEffect } from 'react'
import {
  Check,
  Plus,
  Trash2,
  Workflow,
  AlertTriangle,
  ShieldCheck,
  ListChecks,
  Gauge,
  Pencil,
  Power,
  FilePlus2,
  ArrowRight,
  HelpCircle,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { roleLabels, type ApproverRole, type WorkflowDef, type Zone } from '@/lib/leave'
import { useLeave } from '@/components/leave/leave-context'
import { leaveApi, type ApprovalRoleDto } from '@/lib/leave-api'
import {
  SectionHeading,
  Panel,
  StatCard,
  Tabs,
  Btn,
  SelectInput,
  TextInput,
  TextArea,
  Modal,
  ConfirmModal,
  RowMenu,
} from '@/components/leave/shared'

interface StepDraft {
  approval_role_id: string
  role_required?: string
  fallback_approval_role_id?: string | null
  sla_days: number
  is_mandatory: boolean
  allow_same_person_as_previous_steps: boolean
  note: string
}

function scopeLabel(def: WorkflowDef, depts: { id: string; name: string }[]): string {
  if (def.departmentId) {
    const d = depts.find((dept) => dept.id === def.departmentId)
    return `Department: ${d?.name ?? def.departmentId}`
  }
  return 'All Departments (Default Office Workflow)'
}

export function WorkflowsView({ onNavigate }: { onNavigate?: (v: string) => void }) {
  const {
    leaveTypes,
    workflowDefs,
    typeOf,
    can,
    updateWorkflow,
    createWorkflow,
    setWorkflowActive,
    deleteWorkflow,
    allDepts,
  } = useLeave()

  const canEditWorkflows = can('approval_workflows', 'update') && can('policies', 'edit_policy')

  const [approvalRoles, setApprovalRoles] = useState<ApprovalRoleDto[]>([])
  const [loadingRoles, setLoadingRoles] = useState(false)

  // Fetch dynamic approval-roles catalog
  useEffect(() => {
    void (async () => {
      setLoadingRoles(true)
      try {
        const res = await leaveApi.org.approvalRoles()
        setApprovalRoles(res.data || [])
      } catch {
        // Fallback to defaults if endpoint unavailable
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

  const [builder, setBuilder] = useState<{
    mode: 'edit'
    defId: string
    leaveTypeId: string
    departmentId?: string | null
  } | {
    mode: 'create'
    leaveTypeId: string
    departmentId?: string | null
  } | null>(null)

  const [draftSteps, setDraftSteps] = useState<StepDraft[]>([])
  const [createTypeId, setCreateTypeId] = useState('')
  const [createMinDays, setCreateMinDays] = useState(0)
  const [createDepartmentId, setCreateDepartmentId] = useState('')
  const [deleteDef, setDeleteDef] = useState<WorkflowDef | null>(null)

  const openEdit = (def: WorkflowDef) => {
    setDraftSteps(
      def.steps.map((s: any) => ({
        approval_role_id: s.approval_role_id || s.approvalRoleId || s.role?.toLowerCase() || 'supervisor',
        role_required: s.role,
        fallback_approval_role_id: s.fallback_approval_role_id || null,
        sla_days: s.slaDays || s.sla_days || 2,
        is_mandatory: s.is_mandatory !== false,
        allow_same_person_as_previous_steps: s.allow_same_person_as_previous_steps === true,
        note: s.note || '',
      })),
    )
    setBuilder({
      mode: 'edit',
      defId: def.id,
      leaveTypeId: def.leaveTypeId,
      departmentId: def.departmentId,
    })
  }

  const openCreate = (leaveTypeId?: string) => {
    const typeId =
      leaveTypeId ??
      leaveTypes.find((lt) => !workflowDefs.some((w) => w.leaveTypeId === lt.id))?.id ??
      leaveTypes[0]?.id ??
      ''
    setDraftSteps([
      {
        approval_role_id: 'supervisor',
        sla_days: 2,
        is_mandatory: true,
        allow_same_person_as_previous_steps: false,
        note: 'Verifies coverage and handover requirements.',
      },
    ])
    setCreateTypeId(typeId)
    setCreateMinDays(0)
    setCreateDepartmentId('')
    setBuilder({ mode: 'create', leaveTypeId: typeId })
  }

  const saveBuilder = async () => {
    if (!builder || !canEditWorkflows) return
    const cleanSteps = draftSteps.map((s, i) => ({
      approval_role_id: s.approval_role_id,
      fallback_approval_role_id: s.fallback_approval_role_id || null,
      sla_days: s.sla_days,
      is_mandatory: s.is_mandatory,
      allow_same_person_as_previous_steps: s.allow_same_person_as_previous_steps,
      role_required: s.role_required || s.approval_role_id.toUpperCase(),
      note: s.note || `Step ${i + 1} in the approval chain.`,
    }))

    if (builder.mode === 'edit') {
      try {
        await leaveApi.workflows.update(builder.defId, {
          department_id: builder.departmentId || null,
          steps: cleanSteps as any,
        })
        window.location.reload()
      } catch (err: any) {
        alert(err?.message || 'Failed to update workflow')
      }
    } else if (createTypeId) {
      try {
        await leaveApi.workflows.store({
          leave_type_id: createTypeId,
          min_duration_days: createMinDays,
          department_id: createDepartmentId || null,
          steps: cleanSteps as any,
        })
        window.location.reload()
      } catch (err: any) {
        alert(err?.message || 'Failed to create workflow')
      }
    }
    setBuilder(null)
  }

  const sorted = [...workflowDefs].sort((a, b) =>
    (typeOf(a.leaveTypeId)?.name ?? a.leaveTypeId).localeCompare(typeOf(b.leaveTypeId)?.name ?? b.leaveTypeId),
  )
  const activeCount = workflowDefs.filter((w) => w.isActive !== false).length
  const uncovered = leaveTypes.filter((lt) => !workflowDefs.some((w) => w.leaveTypeId === lt.id))

  const stepsEditor = (
    <div className="space-y-4">
      {draftSteps.length === 0 && (
        <p className="text-[12px] text-muted-foreground">No steps yet — add the first approval step below.</p>
      )}

      {draftSteps.map((s, i) => (
        <div key={i} className="rounded-xl border border-border bg-warm dark:bg-muted/30 p-3.5 space-y-3">
          <div className="flex items-center justify-between gap-2 border-b border-border/60 pb-2">
            <span className="text-[11px] font-mono font-bold text-teal-700 dark:text-teal-300">
              Step {i + 1}
            </span>
            <button
              type="button"
              onClick={() => setDraftSteps((prev) => prev.filter((_, idx) => idx !== i))}
              className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-600 dark:text-rose-400 hover:underline"
            >
              <Trash2 className="w-3 h-3" /> Remove step
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <SelectInput
              label="Approval Role (Dynamic Catalog)"
              value={s.approval_role_id}
              onChange={(e) =>
                setDraftSteps((prev) =>
                  prev.map((x, idx) => (idx === i ? { ...x, approval_role_id: e.target.value } : x)),
                )
              }
            >
              {approvalRoles.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name} ({r.code})
                </option>
              ))}
            </SelectInput>

            <SelectInput
              label="Fallback Role (Optional)"
              value={s.fallback_approval_role_id || ''}
              onChange={(e) =>
                setDraftSteps((prev) =>
                  prev.map((x, idx) =>
                    idx === i ? { ...x, fallback_approval_role_id: e.target.value || null } : x,
                  ),
                )
              }
            >
              <option value="">No fallback (Fail or skip per rule)</option>
              {approvalRoles
                .filter((r) => r.id !== s.approval_role_id)
                .map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
            </SelectInput>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-center pt-1">
            <TextInput
              label="SLA (Days to act)"
              type="number"
              min={1}
              max={30}
              value={s.sla_days}
              onChange={(e) =>
                setDraftSteps((prev) =>
                  prev.map((x, idx) => (idx === i ? { ...x, sla_days: Number(e.target.value) } : x)),
                )
              }
            />

            <div className="flex items-center gap-2 pt-4">
              <input
                type="checkbox"
                id={`mandatory_${i}`}
                checked={s.is_mandatory}
                onChange={(e) =>
                  setDraftSteps((prev) =>
                    prev.map((x, idx) => (idx === i ? { ...x, is_mandatory: e.target.checked } : x)),
                  )
                }
                className="rounded border-border text-teal-700 focus:ring-teal-700"
              />
              <label htmlFor={`mandatory_${i}`} className="text-xs font-medium text-foreground cursor-pointer">
                Mandatory Step
                <span className="block text-[10px] text-muted-foreground font-normal">
                  Blocks submission if holder missing
                </span>
              </label>
            </div>

            <div className="flex items-center gap-2 pt-4">
              <input
                type="checkbox"
                id={`allow_same_${i}`}
                checked={s.allow_same_person_as_previous_steps}
                onChange={(e) =>
                  setDraftSteps((prev) =>
                    prev.map((x, idx) =>
                      idx === i
                        ? { ...x, allow_same_person_as_previous_steps: e.target.checked }
                        : x,
                    ),
                  )
                }
                className="rounded border-border text-teal-700 focus:ring-teal-700"
              />
              <label htmlFor={`allow_same_${i}`} className="text-xs font-medium text-foreground cursor-pointer">
                Allow Duplicate Approver
                <span className="block text-[10px] text-muted-foreground font-normal">
                  Do not collapse if same person
                </span>
              </label>
            </div>
          </div>

          <TextArea
            label="Rule note / instructions for approver"
            rows={2}
            value={s.note}
            onChange={(e) =>
              setDraftSteps((prev) =>
                prev.map((x, idx) => (idx === i ? { ...x, note: e.target.value } : x)),
              )
            }
          />
        </div>
      ))}

      <Btn
        variant="outline"
        onClick={() =>
          setDraftSteps((prev) => [
            ...prev,
            {
              approval_role_id: 'hr_reviewer',
              sla_days: 3,
              is_mandatory: true,
              allow_same_person_as_previous_steps: false,
              note: 'Verifies policy compliance and leave balance.',
            },
          ])
        }
      >
        <Plus className="w-3.5 h-3.5" /> Add approval step
      </Btn>
    </div>
  )

  return (
    <div className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      <SectionHeading
        title="Approval workflows"
        subtitle="Workflows depend strictly on departments. Each leave type routes through an approval-role pipeline."
        actions={
          <div className="flex items-center gap-2">
            {canEditWorkflows && (
              <Btn onClick={() => openCreate()}>
                <FilePlus2 className="w-3.5 h-3.5" /> New workflow
              </Btn>
            )}
            <Tabs
              value="builder"
              onChange={() => onNavigate?.('approvals')}
              tabs={[
                { value: 'builder', label: 'Workflow builder', icon: Workflow },
                { value: 'queue', label: 'Go to approval queue', icon: ListChecks },
              ]}
            />
          </div>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard icon={Workflow} label="Workflows" value={workflowDefs.length} hint={`${activeCount} active`} tone="teal" />
        <StatCard icon={Gauge} label="Decision steps" value={workflowDefs.reduce((s, w) => s + w.steps.length, 0)} hint="Across all definitions" tone="emerald" />
        <StatCard icon={AlertTriangle} label="Final-authority gates" value={workflowDefs.filter((w) => w.steps.some((s) => s.role === 'FINAL_AUTHORITY')).length} hint="Chains ending at the DPP" tone="amber" />
        <StatCard icon={ShieldCheck} label="Leave types covered" value={leaveTypes.length - uncovered.length} hint={`${leaveTypes.length} types configured in HR`} tone="sky" />
      </div>

      <Panel
        title="Workflow definitions"
        subtitle="Definitions are scoped by Department only. Subordinate divisions/units do not alter workflow resolution."
      >
        <div className="space-y-3">
          {sorted.map((def) => {
            const lt = typeOf(def.leaveTypeId)
            const active = def.isActive !== false
            return (
              <div
                key={def.id}
                className={cn('rounded-2xl border border-border bg-card overflow-hidden', !active && 'opacity-70')}
              >
                <div className="flex flex-wrap items-center gap-3 px-4 py-3">
                  <span className={cn('h-2.5 w-2.5 rounded-full shrink-0', lt?.color ?? 'bg-zinc-400')} />
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] font-semibold text-foreground">
                      {lt?.name ?? def.leaveTypeId}
                      <span className="ml-2 text-[10px] font-mono text-muted-foreground">v{def.version}</span>
                      <span
                        className={cn(
                          'ml-2 inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold border',
                          active
                            ? 'bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-950 dark:text-teal-300 dark:border-teal-900'
                            : 'bg-muted text-muted-foreground border-border',
                        )}
                      >
                        {active ? 'Active' : 'Inactive'}
                      </span>
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      {scopeLabel(def, allDepts)} • {def.steps.length} step{def.steps.length === 1 ? '' : 's'}
                      {def.minDurationDays ? ` • applies from ${def.minDurationDays}+ days` : ''}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    {def.steps.map((s, i) => (
                      <span
                        key={i}
                        className="inline-flex items-center gap-1 rounded-full border border-border bg-warm dark:bg-muted/30 px-2.5 py-1 text-[10px] font-semibold text-foreground"
                      >
                        {i + 1}. {roleLabels[s.role] || s.role}
                      </span>
                    ))}
                    {def.steps.length === 0 && (
                      <span className="text-[10px] text-rose-600 font-semibold">No steps defined</span>
                    )}
                  </div>
                  {canEditWorkflows && (
                    <RowMenu
                      items={[
                        { icon: Pencil, label: 'Edit steps', onClick: () => openEdit(def) },
                        {
                          icon: Power,
                          label: active ? 'Deactivate' : 'Activate',
                          tone: active ? 'danger' : 'default',
                          onClick: () => setWorkflowActive(def.id, !active),
                        },
                        { icon: Trash2, label: 'Delete workflow', tone: 'danger', onClick: () => setDeleteDef(def) },
                      ]}
                    />
                  )}
                </div>
              </div>
            )
          })}

          {uncovered.map((lt) => (
            <div key={lt.id} className="rounded-2xl border border-dashed border-border bg-card/50 overflow-hidden">
              <div className="flex flex-wrap items-center gap-3 px-4 py-3">
                <span className={cn('h-2.5 w-2.5 rounded-full shrink-0', lt.color)} />
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-semibold text-foreground">{lt.name}</p>
                  <p className="text-[11px] text-rose-600 font-semibold">
                    No workflow defined — submissions will not resolve a chain
                  </p>
                </div>
                {canEditWorkflows && (
                  <Btn variant="outline" onClick={() => openCreate(lt.id)}>
                    <Plus className="w-3.5 h-3.5" /> Create workflow
                  </Btn>
                )}
              </div>
            </div>
          ))}
        </div>
      </Panel>

      {/* WORKFLOW BUILDER MODAL */}
      <Modal
        open={builder !== null}
        onClose={() => setBuilder(null)}
        title={
          builder?.mode === 'create'
            ? `New Department Workflow — ${typeOf(createTypeId)?.name ?? 'Select leave type'}`
            : builder
              ? `Edit Workflow — ${typeOf(builder.leaveTypeId)?.name ?? builder.leaveTypeId}`
              : 'Workflow Builder'
        }
        subtitle="Workflows are scoped by Department only. Steps use dynamic approval roles."
        size="lg"
        footer={
          <Btn onClick={saveBuilder} disabled={draftSteps.length === 0 || (builder?.mode === 'create' && !createTypeId)}>
            <Check className="w-3.5 h-3.5" /> {builder?.mode === 'create' ? 'Create workflow' : 'Save workflow'}
          </Btn>
        }
      >
        <div className="space-y-4">
          {builder?.mode === 'create' && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <SelectInput label="Leave Type" value={createTypeId} onChange={(e) => setCreateTypeId(e.target.value)}>
                {leaveTypes.map((lt) => (
                  <option key={lt.id} value={lt.id}>
                    {lt.name}
                  </option>
                ))}
              </SelectInput>
              <TextInput
                label="Applies from (days)"
                type="number"
                min={0}
                value={createMinDays}
                onChange={(e) => setCreateMinDays(Number(e.target.value))}
              />
              <SelectInput
                label="Department Scope"
                value={createDepartmentId}
                onChange={(e) => setCreateDepartmentId(e.target.value)}
              >
                <option value="">All Departments (Default)</option>
                {allDepts.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </SelectInput>
            </div>
          )}
          {stepsEditor}
        </div>
      </Modal>

      <ConfirmModal
        open={deleteDef !== null}
        onClose={() => setDeleteDef(null)}
        title="Delete this workflow?"
        confirmLabel="Delete workflow"
        tone="danger"
        message={
          <p>
            {deleteDef
              ? `The ${typeOf(deleteDef.leaveTypeId)?.name ?? deleteDef.leaveTypeId} chain "v${deleteDef.version}" will be removed permanently.`
              : ''}{' '}
            Definitions attached to submitted requests cannot be deleted.
          </p>
        }
        onConfirm={() => {
          if (deleteDef) void deleteWorkflow(deleteDef.id)
        }}
      />
    </div>
  )
}
