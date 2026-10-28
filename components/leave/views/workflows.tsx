'use client'

import { useState } from 'react'
import { Check, Plus, Trash2, Workflow, AlertTriangle, ShieldCheck, ListChecks, Gauge, Pencil, Power, FilePlus2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { roleLabels, type ApproverRole, type WorkflowDef, type Zone } from '@/lib/leave'
import { useLeave } from '@/components/leave/leave-context'
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

const ROLES = Object.keys(roleLabels) as ApproverRole[]

interface StepDraft {
  role: ApproverRole
  slaDays: number
  note: string
}

function scopeLabel(def: WorkflowDef, zones: Zone[]): string {
  if (def.zoneId) return `Zone · ${zones.find((z) => z.id === def.zoneId)?.short ?? def.zoneId}`
  if (def.departmentId) return `Department · ${def.departmentId}`
  return 'All staff'
}

export function WorkflowsView({ onNavigate }: { onNavigate?: (v: string) => void }) {
  const { leaveTypes, workflowDefs, typeOf, can, updateWorkflow, createWorkflow, setWorkflowActive, deleteWorkflow, allZones } = useLeave()
  // The API requires BOTH codes on workflow writes; the UI offers the
  // editor only when both hold so users never meet a 403 on save.
  const canEditWorkflows = can('approval_workflows', 'update') && can('policies', 'edit_policy')

  // Builder doubles as create and edit: a definition is named by defId in
  // edit mode; create mode additionally picks the leave type and scope.
  const [builder, setBuilder] = useState<{ mode: 'edit'; defId: string; leaveTypeId: string } | { mode: 'create'; leaveTypeId: string } | null>(null)
  const [draftSteps, setDraftSteps] = useState<StepDraft[]>([])
  const [createTypeId, setCreateTypeId] = useState('')
  const [createMinDays, setCreateMinDays] = useState(0)
  const [createZoneId, setCreateZoneId] = useState('')
  const [deleteDef, setDeleteDef] = useState<WorkflowDef | null>(null)

  const openEdit = (def: WorkflowDef) => {
    setDraftSteps(def.steps.map((s) => ({ ...s })))
    setBuilder({ mode: 'edit', defId: def.id, leaveTypeId: def.leaveTypeId })
  }

  const openCreate = (leaveTypeId?: string) => {
    const typeId = leaveTypeId ?? leaveTypes.find((lt) => !workflowDefs.some((w) => w.leaveTypeId === lt.id))?.id ?? leaveTypes[0]?.id ?? ''
    setDraftSteps([{ role: 'SUPERVISOR', slaDays: 2, note: 'Verifies coverage and handover.' }])
    setCreateTypeId(typeId)
    setCreateMinDays(0)
    setCreateZoneId('')
    setBuilder({ mode: 'create', leaveTypeId: typeId })
  }

  const saveBuilder = () => {
    if (!builder || !canEditWorkflows) return
    const clean = draftSteps.map((s, i) => ({ ...s, note: s.note || `Step ${i + 1} in the approval chain.` }))
    if (builder.mode === 'edit') {
      updateWorkflow(builder.leaveTypeId, clean, builder.defId)
    } else if (createTypeId) {
      createWorkflow({ leaveTypeId: createTypeId, minDurationDays: createMinDays, zoneId: createZoneId || null, steps: clean })
    }
    setBuilder(null)
  }

  const sorted = [...workflowDefs].sort((a, b) =>
    (typeOf(a.leaveTypeId)?.name ?? a.leaveTypeId).localeCompare(typeOf(b.leaveTypeId)?.name ?? b.leaveTypeId),
  )
  const activeCount = workflowDefs.filter((w) => w.isActive !== false).length
  const uncovered = leaveTypes.filter((lt) => !workflowDefs.some((w) => w.leaveTypeId === lt.id))

  const stepsEditor = (
    <div className="space-y-3">
      {draftSteps.length === 0 && (
        <p className="text-[12px] text-muted-foreground">No steps yet — add the first approval step below.</p>
      )}
      {draftSteps.map((s, i) => (
        <div key={i} className="rounded-xl border border-border bg-warm dark:bg-muted/30 p-3 space-y-2.5">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-mono text-muted-foreground">Step {i + 1}</span>
            <button
              type="button"
              onClick={() => setDraftSteps((prev) => prev.filter((_, idx) => idx !== i))}
              className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-600 dark:text-rose-400 hover:underline"
            >
              <Trash2 className="w-3 h-3" /> Remove
            </button>
          </div>
          <SelectInput
            label="Role"
            value={s.role}
            onChange={(e) => setDraftSteps((prev) => prev.map((x, idx) => (idx === i ? { ...x, role: e.target.value as ApproverRole } : x)))}
          >
            {ROLES.map((r) => (
              <option key={r} value={r}>{roleLabels[r]}</option>
            ))}
          </SelectInput>
          <TextArea
            label="Rule note"
            rows={2}
            value={s.note}
            onChange={(e) => setDraftSteps((prev) => prev.map((x, idx) => (idx === i ? { ...x, note: e.target.value } : x)))}
          />
        </div>
      ))}
      <Btn variant="outline" onClick={() => setDraftSteps((prev) => [...prev, { role: 'HR', slaDays: 3, note: 'Verifies policy compliance.' }])}>
        <Plus className="w-3.5 h-3.5" /> Add step
      </Btn>
    </div>
  )

  return (
    <div className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      <SectionHeading
        title="Approval workflows"
        subtitle="Each leave type routes through its own chain — order, role and a rule note. Create, update, activate, deactivate or delete definitions; changes apply to new submissions only, completed history stays locked."
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
              tabs={[{ value: 'builder', label: 'Workflow builder', icon: Workflow }, { value: 'queue', label: 'Go to approval queue', icon: ListChecks }]}
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

      <Panel title="Workflow definitions" subtitle="Every definition is a versioned chain; the newest active version per leave type routes new submissions.">
        <div className="space-y-3">
          {sorted.map((def) => {
            const lt = typeOf(def.leaveTypeId)
            const active = def.isActive !== false
            return (
              <div key={def.id} className={cn('rounded-2xl border border-border bg-card overflow-hidden', !active && 'opacity-70')}>
                <div className="flex flex-wrap items-center gap-3 px-4 py-3">
                  <span className={cn('h-2.5 w-2.5 rounded-full shrink-0', lt?.color ?? 'bg-zinc-400')} />
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] font-semibold text-foreground">
                      {lt?.name ?? def.leaveTypeId}
                      <span className="ml-2 text-[10px] font-mono text-muted-foreground">v{def.version}</span>
                      <span className={cn(
                        'ml-2 inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold border',
                        active
                          ? 'bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-950 dark:text-teal-300 dark:border-teal-900'
                          : 'bg-muted text-muted-foreground border-border',
                      )}>
                        {active ? 'Active' : 'Inactive'}
                      </span>
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      {scopeLabel(def, allZones as Zone[])} · {def.steps.length} step{def.steps.length === 1 ? '' : 's'}
                      {def.minDurationDays ? ` · applies from ${def.minDurationDays}+ days` : ''}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    {def.steps.map((s, i) => (
                      <span key={i} className="inline-flex items-center gap-1 rounded-full border border-border bg-warm dark:bg-muted/30 px-2.5 py-1 text-[10px] font-semibold text-foreground">
                        {i + 1}. {roleLabels[s.role]}
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
                  <p className="text-[11px] text-rose-600 font-semibold">No workflow defined — submissions will not resolve a chain</p>
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

      <Modal
        open={builder !== null}
        onClose={() => setBuilder(null)}
        title={
          builder?.mode === 'create'
            ? `New workflow — ${typeOf(createTypeId)?.name ?? 'Select a leave type'}`
            : builder
              ? `Workflow — ${typeOf(builder.leaveTypeId)?.name ?? builder.leaveTypeId}`
              : 'Workflow builder'
        }
        subtitle="Order, role and a short note for each step. The chain is resolved per applicant at submission."
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
              <SelectInput label="Leave type" value={createTypeId} onChange={(e) => setCreateTypeId(e.target.value)}>
                {leaveTypes.map((lt) => (
                  <option key={lt.id} value={lt.id}>{lt.name}</option>
                ))}
              </SelectInput>
              <TextInput
                label="Applies from (days)"
                type="number"
                min={0}
                value={createMinDays}
                onChange={(e) => setCreateMinDays(Number(e.target.value))}
              />
              <SelectInput label="Zone scope" value={createZoneId} onChange={(e) => setCreateZoneId(e.target.value)}>
                <option value="">All zones</option>
                {allZones.map((z) => (
                  <option key={z.id} value={z.id}>{z.name}</option>
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
              ? `The ${typeOf(deleteDef.leaveTypeId)?.name ?? deleteDef.leaveTypeId} chain “v${deleteDef.version}” will be removed permanently.`
              : ''}{' '}
            Definitions attached to submitted requests cannot be deleted — deactivate them instead so history keeps its chain. A leave type always keeps at least one active workflow.
          </p>
        }
        onConfirm={() => {
          if (deleteDef) void deleteWorkflow(deleteDef.id)
        }}
      />
    </div>
  )
}
