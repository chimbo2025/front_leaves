'use client'

import { useState } from 'react'
import { Check, Plus, Trash2, Workflow, AlertTriangle, ShieldCheck, ListChecks, Gauge } from 'lucide-react'
import { cn } from '@/lib/utils'
import { roleLabels, type ApproverRole } from '@/lib/leave'
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
} from '@/components/leave/shared'

const ROLES = Object.keys(roleLabels) as ApproverRole[]

export function WorkflowsView({ onNavigate }: { onNavigate?: (v: string) => void }) {
  const { leaveTypes, workflowDefs, updateWorkflow, typeOf } = useLeave()
  const [builder, setBuilder] = useState<string | null>(null)
  const [draftSteps, setDraftSteps] = useState<{ role: ApproverRole; slaDays: number; note: string }[]>([])

  const openBuilder = (leaveTypeId: string) => {
    const def = workflowDefs.find((w) => w.leaveTypeId === leaveTypeId)
    setDraftSteps((def?.steps ?? []).map((s) => ({ ...s })))
    setBuilder(leaveTypeId)
  }

  const saveBuilder = () => {
    if (!builder) return
    const clean = draftSteps.map((s, i) => ({ ...s, note: s.note || `Step ${i + 1} in the approval chain.` }))
    updateWorkflow(builder, clean)
    setBuilder(null)
  }

  return (
    <div className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      <SectionHeading
        title="Approval workflows"
        subtitle="Each leave type routes through its own chain — order, role, SLA and a rule note. Changes apply to new submissions only; completed history stays locked."
        actions={
          <Tabs
            value="builder"
            onChange={() => onNavigate?.('approvals')}
            tabs={[{ value: 'builder', label: 'Workflow builder', icon: Workflow }, { value: 'queue', label: 'Go to approval queue', icon: ListChecks }]}
          />
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard icon={Workflow} label="Workflows" value={workflowDefs.length} hint="Defined approval chains" tone="teal" />
        <StatCard icon={Gauge} label="Decision steps" value={workflowDefs.reduce((s, w) => s + w.steps.length, 0)} hint="Across all live workflows" tone="emerald" />
        <StatCard icon={AlertTriangle} label="Final-authority gates" value={workflowDefs.filter((w) => w.steps.some((s) => s.role === 'FINAL_AUTHORITY')).length} hint="Chains ending at the DPP" tone="amber" />
        <StatCard icon={ShieldCheck} label="Leave types covered" value={leaveTypes.filter((lt) => workflowDefs.some((w) => w.leaveTypeId === lt.id)).length} hint={`${leaveTypes.length} types configured in HR`} tone="sky" />
      </div>

      <Panel title="Workflow builder" subtitle="Configure the approval chain per leave type so approvals always follow HR policy.">
        <div className="space-y-3">
          {leaveTypes.map((lt) => {
            const def = workflowDefs.find((w) => w.leaveTypeId === lt.id)
            const steps = def?.steps ?? []
            return (
              <div key={lt.id} className="rounded-2xl border border-border bg-card overflow-hidden">
                <div className="flex flex-wrap items-center gap-3 px-4 py-3">
                  <span className={cn('h-2.5 w-2.5 rounded-full shrink-0', lt.color)} />
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] font-semibold text-foreground">{lt.name}</p>
                    <p className="text-[11px] text-muted-foreground">{lt.swahili} · {steps.length} step{steps.length === 1 ? '' : 's'}</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    {steps.map((s, i) => (
                      <span key={i} className="inline-flex items-center gap-1 rounded-full border border-border bg-warm dark:bg-muted/30 px-2.5 py-1 text-[10px] font-semibold text-foreground">
                        {i + 1}. {roleLabels[s.role]}
                      </span>
                    ))}
                    {steps.length === 0 && (
                      <span className="text-[10px] text-rose-600 font-semibold">No workflow defined</span>
                    )}
                  </div>
                  <Btn variant="outline" onClick={() => openBuilder(lt.id)}>
                    <Workflow className="w-3.5 h-3.5" /> Edit workflow
                  </Btn>
                </div>
              </div>
            )
          })}
        </div>
      </Panel>

      <Modal
        open={builder !== null}
        onClose={() => setBuilder(null)}
        title={builder ? `Workflow — ${typeOf(builder)?.name ?? builder}` : 'Workflow builder'}
        subtitle="Order, role, SLA and a short note for each step. The chain is resolved per applicant at submission."
        size="lg"
        footer={
          <Btn onClick={saveBuilder} disabled={draftSteps.length === 0}>
            <Check className="w-3.5 h-3.5" /> Save workflow
          </Btn>
        }
      >
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
              <TextInput
                label="SLA (days)"
                type="number"
                min={0}
                value={s.slaDays}
                onChange={(e) => setDraftSteps((prev) => prev.map((x, idx) => (idx === i ? { ...x, slaDays: Number(e.target.value) } : x)))}
              />
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
      </Modal>
    </div>
  )
}