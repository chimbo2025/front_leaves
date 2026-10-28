'use client'

import { useState } from 'react'
import { Pencil, Eye, ShieldCheck, Clock, FileText, Wallet, Plus, Workflow, Layers, Trash2, Check, ClipboardList, Scale } from 'lucide-react'
import { cn } from '@/lib/utils'
import { roleLabels, type LeavePolicy, type ApproverRole } from '@/lib/leave'
import { useLeave, type CreateLeaveTypeInput } from '@/components/leave/leave-context'
import {
  SectionHeading,
  Panel,
  Modal,
  TableToolbar,
  RowMenu,
  EmptyState,
  TextInput,
  TextArea,
  SelectInput,
  StatCard,
  Btn,
  Pagination,
  usePaged,
  Tabs,
  ConfirmModal,
  type RowMenuItem,
} from '@/components/leave/shared'

const ROLES = Object.keys(roleLabels) as ApproverRole[]

const COLOR_OPTIONS = [
  'bg-emerald-500',
  'bg-sky-500',
  'bg-rose-500',
  'bg-violet-500',
  'bg-amber-500',
  'bg-fuchsia-500',
  'bg-teal-500',
  'bg-indigo-500',
  'bg-orange-500',
  'bg-slate-500',
]

interface Draft {
  maxDaysPerYear: string
  maxDaysPerRequest: string
  minNoticeDays: string
  minTenureMonths: string
  carryOverMax: string
  carryOverExpiryMonth: string
  allowsHalfDay: boolean
  requiresDocuments: boolean
  requiredDocs: string
  notes: string
}

interface StepDraft {
  role: ApproverRole
  slaDays: number
  note: string
}

interface CreateForm {
  code: string
  name: string
  swahili: string
  short: string
  paid: boolean
  description: string
  color: string
  maxDaysPerYear: string
  maxDaysPerRequest: string
  minTenureMonths: string
  minNoticeDays: string
  requiresDocuments: boolean
  requiredDocs: string
  carryOverMax: string
  carryOverExpiryMonth: string
  allowHalfDay: boolean
  notes: string
  steps: StepDraft[]
}

export function PoliciesView() {
  const {
    policies,
    leaveTypes,
    workflowDefs,
    typeOf,
    can,
    updatePolicy,
    updateLeaveType,
    deleteLeaveType,
    updateWorkflow,
    createLeaveType,
  } = useLeave()

  const [search, setSearch] = useState('')
  const [tab, setTab] = useState('types')
  const [typeFilter, setTypeFilter] = useState('all')
  const [createOpen, setCreateOpen] = useState(false)
  const [viewing, setViewing] = useState<string | null>(null)
  const [editingPolicy, setEditingPolicy] = useState<LeavePolicy | null>(null)
  const [editingWf, setEditingWf] = useState<string | null>(null)
  const [editingType, setEditingType] = useState<string | null>(null)
  const [deletingType, setDeletingType] = useState<string | null>(null)
  const [draft, setDraft] = useState<Draft | null>(null)
  const [wfSteps, setWfSteps] = useState<StepDraft[]>([])
  const [typeDraft, setTypeDraft] = useState({ name: '', swahili: '', short: '', description: '', color: 'bg-emerald-500', paid: true })
  const [form, setForm] = useState<CreateForm | null>(null)

  const currentPolicyFor = (leaveTypeId: string) =>
    policies
      .filter((p) => p.leaveTypeId === leaveTypeId)
      .sort((a, b) => (b.effectiveFrom ?? '').localeCompare(a.effectiveFrom ?? ''))[0]

  const rows = leaveTypes.map((lt) => {
    const policy = currentPolicyFor(lt.id)
    const wf = workflowDefs.find((w) => w.leaveTypeId === lt.id && w.isActive !== false) ?? workflowDefs.find((w) => w.leaveTypeId === lt.id)
    return { lt, policy, wf }
  })

  const filtered = rows.filter(({ lt, policy }) => {
    if (typeFilter !== 'all' && lt.id !== typeFilter) return false
    const q = search.trim().toLowerCase()
    if (!q) return true
    return (
      lt.name.toLowerCase().includes(q) ||
      lt.swahili.toLowerCase().includes(q) ||
      (policy?.notes ?? '').toLowerCase().includes(q)
    )
  })
  const paged = usePaged(filtered, 8)

  const canEditPolicy = can('policies', 'edit_policy')
  const canCreatePolicy = can('policies', 'create')

  const startPolicyEdit = (policy: LeavePolicy) => {
    setEditingPolicy(policy)
    setDraft({
      maxDaysPerYear: String(policy.maxDaysPerYear),
      maxDaysPerRequest: String(policy.maxDaysPerRequest),
      minNoticeDays: String(policy.minNoticeDays),
      minTenureMonths: String(policy.minTenureMonths),
      carryOverMax: String(policy.carryOverMax),
      carryOverExpiryMonth: String(policy.carryOverExpiryMonth ?? 3),
      allowsHalfDay: policy.allowHalfDay,
      requiresDocuments: policy.requiresDocuments,
      requiredDocs: policy.requiredDocs.join(', '),
      notes: policy.notes,
    })
  }

  const savePolicy = (p: LeavePolicy) => {
    if (!draft) return
    updatePolicy(p.id, {
      maxDaysPerYear: Number(draft.maxDaysPerYear),
      maxDaysPerRequest: Number(draft.maxDaysPerRequest),
      minNoticeDays: Number(draft.minNoticeDays),
      minTenureMonths: Number(draft.minTenureMonths),
      carryOverMax: Number(draft.carryOverMax),
      carryOverExpiryMonth: Math.min(12, Math.max(1, Number(draft.carryOverExpiryMonth) || 3)),
      allowHalfDay: draft.allowsHalfDay,
      requiresDocuments: draft.requiresDocuments,
      requiredDocs: draft.requiredDocs.split(',').map((s) => s.trim()).filter(Boolean),
      notes: draft.notes,
    })
    setEditingPolicy(null)
  }

  const startWfEdit = (leaveTypeId: string) => {
    const wf = workflowDefs.find((w) => w.leaveTypeId === leaveTypeId && w.isActive !== false) ?? workflowDefs.find((w) => w.leaveTypeId === leaveTypeId)
    setWfSteps((wf?.steps ?? []).map((s) => ({ ...s })))
    setEditingWf(leaveTypeId)
  }

  const saveWorkflow = () => {
    if (!editingWf) return
    updateWorkflow(editingWf, wfSteps.map((s) => ({ role: s.role, slaDays: s.slaDays, note: s.note || 'Approval step.' })))
    setEditingWf(null)
  }

  const startTypeEdit = (leaveTypeId: string) => {
    const lt = typeOf(leaveTypeId)
    if (!lt) return
    setTypeDraft({ name: lt.name, swahili: lt.swahili, short: lt.short, description: lt.description, color: lt.color, paid: lt.paid })
    setEditingType(leaveTypeId)
  }

  const saveTypeEdit = () => {
    if (!editingType) return
    updateLeaveType(editingType, typeDraft)
    setEditingType(null)
  }

  const openCreate = () => {
    setForm({
      code: '',
      name: '',
      swahili: '',
      short: '',
      paid: true,
      description: '',
      color: 'bg-emerald-500',
      maxDaysPerYear: '30',
      maxDaysPerRequest: '30',
      minTenureMonths: '0',
      minNoticeDays: '0',
      requiresDocuments: false,
      requiredDocs: '',
      carryOverMax: '0',
      carryOverExpiryMonth: '3',
      allowHalfDay: true,
      notes: '',
      steps: [{ role: 'SUPERVISOR', slaDays: 2, note: 'Verifies coverage.' }, { role: 'HR', slaDays: 3, note: 'Verifies compliance.' }],
    })
    setCreateOpen(true)
  }

  const saveCreate = () => {
    if (!form || !form.name.trim()) return
    const input: CreateLeaveTypeInput = {
      code: form.code,
      name: form.name,
      swahili: form.swahili,
      short: form.short,
      paid: form.paid,
      description: form.description,
      color: form.color,
      maxDaysPerYear: Number(form.maxDaysPerYear),
      maxDaysPerRequest: Number(form.maxDaysPerRequest),
      minTenureMonths: Number(form.minTenureMonths),
      minNoticeDays: Number(form.minNoticeDays),
      requiresDocuments: form.requiresDocuments,
      requiredDocs: form.requiredDocs,
      carryOverMax: Number(form.carryOverMax),
      carryOverExpiryMonth: Math.min(12, Math.max(1, Number(form.carryOverExpiryMonth) || 3)),
      allowHalfDay: form.allowHalfDay,
      notes: form.notes,
      steps: form.steps.map((s, i) => ({ role: s.role, slaDays: s.slaDays, note: s.note || `Step ${i + 1} in the approval chain.` })),
    }
    createLeaveType(input)
    setCreateOpen(false)
  }

  const buildMenu = (leaveTypeId: string): RowMenuItem[] => {
    const items: RowMenuItem[] = [{ icon: Eye, label: 'View type & policy', onClick: () => setViewing(leaveTypeId) }]
    if (canEditPolicy) {
      items.push({ icon: Pencil, label: 'Edit leave type', onClick: () => startTypeEdit(leaveTypeId) })
      items.push({ icon: ShieldCheck, label: 'Edit policy', onClick: () => { const p = currentPolicyFor(leaveTypeId); if (p) startPolicyEdit(p) } })
      items.push({ icon: Workflow, label: 'Edit workflow', onClick: () => startWfEdit(leaveTypeId) })
    }
    if (can('admin', 'delete')) {
      items.push({ icon: Trash2, label: 'Delete leave type', tone: 'danger', onClick: () => setDeletingType(leaveTypeId) })
    }
    return items
  }

  const viewingRow = rows.find((r) => r.lt.id === viewing)

  return (
    <div className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      <SectionHeading
        title="Leave policies"
        subtitle="Leave types are configurable records created at runtime — HR revises rules here without changing software code. Each save creates a new version."
        actions={
          canCreatePolicy ? (
            <Btn onClick={openCreate}>
              <Plus className="w-4 h-4" /> New leave type
            </Btn>
          ) : undefined
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard icon={Layers} label="Leave types" value={leaveTypes.length} hint="Created at runtime" tone="teal" />
        <StatCard icon={ShieldCheck} label="Versioned policies" value={policies.length} hint="Current + archived versions" tone="emerald" />
        <StatCard icon={Workflow} label="Workflows" value={workflowDefs.length} hint="Dynamic approval chains" tone="amber" />
        <StatCard icon={Clock} label="Final-authority gates" value={workflowDefs.filter((w) => w.steps.some((s) => s.role === 'FINAL_AUTHORITY')).length} hint="Chains ending at the DPP" tone="rose" />
      </div>

      <Tabs
        tabs={[
          { value: 'types', label: 'Leave types, policies & workflows', icon: Layers, badge: leaveTypes.length },
          { value: 'rules', label: 'Eligibility & overlap rules', icon: Scale },
        ]}
        value={tab}
        onChange={setTab}
      />

      {tab === 'types' && (
      <Panel
        title={`Leave types, policies & workflows (${paged.total})`}
        subtitle="Eligibility · maximum days · notice · documents · approval sequence"
      >
        <TableToolbar
          search={search}
          onSearch={setSearch}
          placeholder="Search type or notes…"
          count={paged.total}
          filters={[
            {
              label: 'Leave type',
              value: typeFilter,
              onChange: setTypeFilter,
              options: [{ value: 'all', label: 'All types' }, ...leaveTypes.map((lt) => ({ value: lt.id, label: lt.name }))],
            },
          ]}
        />
        {paged.items.length === 0 ? (
          <EmptyState title="No policies match" hint="Adjust the search or filter." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left min-w-[980px]">
              <thead>
                <tr className="text-[11px] uppercase tracking-wider text-muted-foreground">
                  <th className="py-3 px-5 font-semibold">Leave type</th>
                  <th className="py-3 px-3 font-semibold">Max / year</th>
                  <th className="py-3 px-3 font-semibold">Max / request</th>
                  <th className="py-3 px-3 font-semibold">Tenure</th>
                  <th className="py-3 px-3 font-semibold">Notice</th>
                  <th className="py-3 px-3 font-semibold">Docs</th>
                  <th className="py-3 px-3 font-semibold">Workflow</th>
                  <th className="py-3 px-3 font-semibold">Paid</th>
                  <th className="py-3 px-3 font-semibold">Version</th>
                  <th className="py-3 px-3 font-semibold text-right">Manage</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {paged.items.map(({ lt, policy, wf }) => (
                  <tr key={lt.id} className="text-[13px] align-middle group">
                    <td className="py-3 px-5">
                      <div className="flex items-center gap-2">
                        <span className={cn('h-2 w-2 rounded-full', lt.color)} />
                        <div>
                          <p className="font-semibold text-foreground leading-tight">{lt.name}</p>
                          <p className="text-[10px] text-muted-foreground">{lt.swahili}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-3 tabular-nums">{policy?.maxDaysPerYear ?? '—'}</td>
                    <td className="py-3 px-3 tabular-nums">{policy?.maxDaysPerRequest ?? '—'}</td>
                    <td className="py-3 px-3 tabular-nums">{policy ? `${policy.minTenureMonths} mo` : '—'}</td>
                    <td className="py-3 px-3 tabular-nums">{policy ? `${policy.minNoticeDays} d` : '—'}</td>
                    <td className="py-3 px-3 max-w-[150px]">
                      {policy?.requiresDocuments ? (
                        <span className="inline-flex items-center gap-1 text-[11px] text-amber-700 dark:text-amber-300">
                          <FileText className="w-3 h-3 shrink-0" /> {policy.requiredDocs.join(', ')}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="py-3 px-3">
                      <span className="inline-flex flex-wrap items-center gap-1">
                        {(wf?.steps ?? []).slice(0, 2).map((s, i) => (
                          <span key={i} className="rounded-full border border-border bg-warm dark:bg-muted/30 px-2 py-0.5 text-[10px] font-semibold text-foreground">
                            {roleLabels[s.role]}
                          </span>
                        ))}
                        {(wf?.steps.length ?? 0) > 2 && (
                          <span className="text-[10px] text-muted-foreground">+{(wf?.steps.length ?? 0) - 2}</span>
                        )}
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      {lt.paid ? (
                        <span className="inline-flex items-center gap-1 text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold"><Wallet className="w-3 h-3" /> Paid</span>
                      ) : (
                        <span className="text-[11px] text-muted-foreground">Unpaid</span>
                      )}
                    </td>
                    <td className="py-3 px-3">
                      <span className="rounded-full border border-border bg-muted px-2 py-0.5 text-[11px] font-mono text-muted-foreground">v{policy?.version ?? '–'}</span>
                    </td>
                    <td className="py-3 px-3 text-right">
                      <RowMenu items={buildMenu(lt.id)} label="Manage" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <Pagination page={paged.page} pageSize={paged.size} total={paged.total} onPage={paged.setPage} onPageSize={paged.setSize} />
        {!canEditPolicy && !canCreatePolicy && (
          <p className="text-[11px] text-muted-foreground px-5 py-3">Editing and creating policies requires the edit_policy / create permission (held by HR).</p>
        )}
      </Panel>
      )}

      {tab === 'rules' && (
      <Panel title="Eligibility & overlap rules" subtitle="Restrictions that the policy engine enforces at submission. Showing the live (effective) versions.">
        <div className="space-y-3">
          {policies
            .filter((p) => !p.effectiveTo)
            .map((p) => {
              const lt = typeOf(p.leaveTypeId)
              return (
                <div key={p.id} className="rounded-xl border border-border px-3 py-2.5">
                  <div className="flex items-center gap-2">
                    <span className={cn('h-2 w-2 rounded-full', lt?.color ?? 'bg-zinc-400')} />
                    <p className="text-[12px] font-semibold text-foreground flex-1">{lt?.name ?? p.leaveTypeId}</p>
                    <span className="text-[10px] text-muted-foreground">v{p.version}</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed">{p.notes}</p>
                </div>
              )
            })}
        </div>
        <p className="text-[11px] text-muted-foreground mt-4 leading-relaxed">
          Overlapping leave dates are blocked where a staff member already has an approved or in-review request on the same dates. Zone and department minimum-staffing thresholds surface as advisory flags for supervisors.
        </p>
      </Panel>
      )}

      <Modal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="New leave type"
        subtitle="Creates the leave type, its policy (v1) and an approval workflow in one step."
        size="lg"
        footer={
          <Btn onClick={saveCreate} disabled={!form?.name.trim()}>
            <Check className="w-3.5 h-3.5" /> Create leave type
          </Btn>
        }
      >
        {form && (
          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-3">
              <TextInput label="Code (short)" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} placeholder="e.g. MYLEAVE" />
              <TextInput label="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. My Leave" />
              <TextInput label="Swahili name" value={form.swahili} onChange={(e) => setForm({ ...form, swahili: e.target.value })} placeholder="e.g. Likizo Yangu" />
              <TextInput label="Short label" value={form.short} onChange={(e) => setForm({ ...form, short: e.target.value })} placeholder="e.g. Yangu" />
            </div>
            <TextArea label="Description" rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            <div>
              <label className="text-[12px] font-semibold text-foreground block mb-2">Colour</label>
              <div className="flex flex-wrap gap-2">
                {COLOR_OPTIONS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setForm({ ...form, color: c })}
                    className={cn('h-7 w-7 rounded-full transition', c, form.color === c ? 'ring-2 ring-offset-2 ring-zinc-400 dark:ring-offset-zinc-900' : 'opacity-60 hover:opacity-100')}
                    aria-label={`Colour ${c}`}
                  />
                ))}
              </div>
            </div>
            <div className="flex flex-wrap gap-4">
              <label className="flex items-center gap-2 text-[12px] text-foreground">
                <input type="checkbox" checked={form.paid} onChange={(e) => setForm({ ...form, paid: e.target.checked })} className="accent-teal-700" /> Paid leave
              </label>
              <label className="flex items-center gap-2 text-[12px] text-foreground">
                <input type="checkbox" checked={form.requiresDocuments} onChange={(e) => setForm({ ...form, requiresDocuments: e.target.checked })} className="accent-teal-700" /> Requires documents
              </label>
              <label className="flex items-center gap-2 text-[12px] text-foreground">
                <input type="checkbox" checked={form.allowHalfDay} onChange={(e) => setForm({ ...form, allowHalfDay: e.target.checked })} className="accent-teal-700" /> Allow half-day
              </label>
            </div>
            {form.requiresDocuments && (
              <TextInput label="Required documents" hint="Comma-separated" value={form.requiredDocs} onChange={(e) => setForm({ ...form, requiredDocs: e.target.value })} placeholder="Medical certificate" />
            )}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <TextInput label="Max days / year" type="number" value={form.maxDaysPerYear} onChange={(e) => setForm({ ...form, maxDaysPerYear: e.target.value })} />
              <TextInput label="Max days / request" type="number" value={form.maxDaysPerRequest} onChange={(e) => setForm({ ...form, maxDaysPerRequest: e.target.value })} />
              <TextInput label="Carry-over max" type="number" value={form.carryOverMax} onChange={(e) => setForm({ ...form, carryOverMax: e.target.value })} />
              <TextInput label="Carry-over expiry month" type="number" hint="1–12; unused days lapse end of that month" value={form.carryOverExpiryMonth} onChange={(e) => setForm({ ...form, carryOverExpiryMonth: e.target.value })} />
              <TextInput label="Min tenure (months)" type="number" value={form.minTenureMonths} onChange={(e) => setForm({ ...form, minTenureMonths: e.target.value })} />
              <TextInput label="Min notice (days)" type="number" value={form.minNoticeDays} onChange={(e) => setForm({ ...form, minNoticeDays: e.target.value })} />
            </div>
            <TextArea label="Policy notes" rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            <StepEditor
              title="Approval workflow"
              steps={form.steps}
              onChange={(steps) => setForm({ ...form, steps })}
            />
          </div>
        )}
      </Modal>

      <Modal
        open={editingPolicy !== null}
        onClose={() => setEditingPolicy(null)}
        title={editingPolicy ? `Edit policy — ${typeOf(editingPolicy.leaveTypeId)?.name}` : 'Edit policy'}
        subtitle={`Current version v${editingPolicy?.version}. Saving creates v${(editingPolicy?.version ?? 0) + 1}; the previous version stays queryable.`}
        size="lg"
        footer={
          editingPolicy && draft ? (
            <Btn onClick={() => savePolicy(editingPolicy)}>
              <Check className="w-3.5 h-3.5" /> Save version v{(editingPolicy.version ?? 0) + 1}
            </Btn>
          ) : undefined
        }
      >
        {draft && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <TextInput label="Max days / year" type="number" value={draft.maxDaysPerYear} onChange={(e) => setDraft({ ...draft, maxDaysPerYear: e.target.value })} />
              <TextInput label="Max days / request" type="number" value={draft.maxDaysPerRequest} onChange={(e) => setDraft({ ...draft, maxDaysPerRequest: e.target.value })} />
              <TextInput label="Carry-over max" type="number" value={draft.carryOverMax} onChange={(e) => setDraft({ ...draft, carryOverMax: e.target.value })} />
              <TextInput label="Carry-over expiry month" type="number" hint="1–12" value={draft.carryOverExpiryMonth} onChange={(e) => setDraft({ ...draft, carryOverExpiryMonth: e.target.value })} />
              <TextInput label="Min tenure (months)" type="number" value={draft.minTenureMonths} onChange={(e) => setDraft({ ...draft, minTenureMonths: e.target.value })} />
              <TextInput label="Min notice (days)" type="number" value={draft.minNoticeDays} onChange={(e) => setDraft({ ...draft, minNoticeDays: e.target.value })} />
            </div>
            <TextInput
              label="Required documents"
              hint="Comma-separated. Leave blank if no documents are required."
              value={draft.requiredDocs}
              onChange={(e) => setDraft({ ...draft, requiredDocs: e.target.value })}
              placeholder="Medical certificate, Sick note"
            />
            <div className="flex flex-wrap gap-4">
              <label className="flex items-center gap-2 text-[12px] text-foreground">
                <input type="checkbox" checked={draft.requiresDocuments} onChange={(e) => setDraft({ ...draft, requiresDocuments: e.target.checked })} className="accent-teal-700" /> Requires documents
              </label>
              <label className="flex items-center gap-2 text-[12px] text-foreground">
                <input type="checkbox" checked={draft.allowsHalfDay} onChange={(e) => setDraft({ ...draft, allowsHalfDay: e.target.checked })} className="accent-teal-700" /> Allow half-day requests
              </label>
            </div>
            <TextArea label="Policy notes" rows={3} value={draft.notes} onChange={(e) => setDraft({ ...draft, notes: e.target.value })} />
          </div>
        )}
      </Modal>

      <Modal
        open={editingWf !== null}
        onClose={() => setEditingWf(null)}
        title={editingWf ? `Workflow — ${typeOf(editingWf)?.name}` : 'Workflow'}
        subtitle="Order, role and a short rule note. New submissions resolve against this chain."
        size="lg"
        footer={
          <Btn onClick={saveWorkflow} disabled={wfSteps.length === 0}>
            <Check className="w-3.5 h-3.5" /> Save workflow
          </Btn>
        }
      >
        <StepEditor title="Approval steps" steps={wfSteps} onChange={setWfSteps} />
      </Modal>

      <Modal
        open={editingType !== null}
        onClose={() => setEditingType(null)}
        title={editingType ? `Edit leave type — ${typeOf(editingType)?.name}` : 'Edit leave type'}
        subtitle="Updates the type record itself. Policy and workflow are edited separately."
        size="md"
        footer={
          <Btn onClick={saveTypeEdit}>
            <Check className="w-3.5 h-3.5" /> Save type
          </Btn>
        }
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <TextInput label="Name" value={typeDraft.name} onChange={(e) => setTypeDraft({ ...typeDraft, name: e.target.value })} />
            <TextInput label="Swahili name" value={typeDraft.swahili} onChange={(e) => setTypeDraft({ ...typeDraft, swahili: e.target.value })} />
            <TextInput label="Short label" value={typeDraft.short} onChange={(e) => setTypeDraft({ ...typeDraft, short: e.target.value })} />
          </div>
          <TextArea label="Description" rows={2} value={typeDraft.description} onChange={(e) => setTypeDraft({ ...typeDraft, description: e.target.value })} />
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[12px] font-semibold text-foreground">Colour</span>
            {COLOR_OPTIONS.map((c) => (
              <button key={c} type="button" onClick={() => setTypeDraft({ ...typeDraft, color: c })}
                className={cn('h-7 w-7 rounded-full transition', c, typeDraft.color === c ? 'ring-2 ring-offset-2 ring-zinc-400 dark:ring-offset-zinc-900' : 'opacity-60 hover:opacity-100')} />
            ))}
            <label className="flex items-center gap-2 text-[12px] text-foreground ml-2">
              <input type="checkbox" checked={typeDraft.paid} onChange={(e) => setTypeDraft({ ...typeDraft, paid: e.target.checked })} className="accent-teal-700" /> Paid
            </label>
          </div>
        </div>
      </Modal>

      <Modal
        open={viewingRow !== undefined}
        onClose={() => setViewing(null)}
        title={viewingRow ? `Policy — ${viewingRow.lt.name}` : 'Policy'}
        subtitle={viewingRow ? `${viewingRow.lt.swahili} · ${viewingRow.lt.description}` : ''}
        size="lg"
      >
        {viewingRow && (
          <div className="space-y-4">
            {viewingRow.policy && (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <PolicyCell label="Max days / year" value={String(viewingRow.policy.maxDaysPerYear)} />
                <PolicyCell label="Max days / request" value={String(viewingRow.policy.maxDaysPerRequest)} />
                <PolicyCell label="Carry-over max" value={String(viewingRow.policy.carryOverMax)} />
                <PolicyCell label="Carry-over expires" value={`End of month ${viewingRow.policy.carryOverExpiryMonth ?? 3}`} />
                <PolicyCell label="Min tenure" value={`${viewingRow.policy.minTenureMonths} months`} />
                <PolicyCell label="Min notice" value={`${viewingRow.policy.minNoticeDays} days`} />
                <PolicyCell label="Documents" value={viewingRow.policy.requiresDocuments ? viewingRow.policy.requiredDocs.join(', ') : 'Not required'} />
                <PolicyCell label="Half-day allowed" value={viewingRow.policy.allowHalfDay ? 'Yes' : 'No'} />
                <PolicyCell label="Paid leave" value={viewingRow.lt.paid ? 'Yes' : 'No'} />
                <PolicyCell label="Version" value={`v${viewingRow.policy.version}`} />
                <div className="col-span-2 sm:col-span-3 rounded-xl border border-border p-3.5">
                  <p className="text-[11px] text-muted-foreground uppercase tracking-wide font-semibold mb-1.5">Notes</p>
                  <p className="text-[13px] text-foreground leading-relaxed">{viewingRow.policy.notes}</p>
                </div>
              </div>
            )}
            {viewingRow.wf && (
              <div className="rounded-xl border border-border p-3.5">
                <p className="text-[11px] text-muted-foreground uppercase tracking-wide font-semibold mb-2">Approval workflow</p>
                <div className="flex flex-wrap items-center gap-1.5">
                  {viewingRow.wf.steps.map((s, i) => (
                    <div key={i} className="flex items-center gap-1.5">
                      <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-2.5 py-1 text-[11px] font-medium text-foreground">
                        {roleLabels[s.role]} <span className="text-muted-foreground text-[10px]">· {s.note}</span>
                      </span>
                      {i < viewingRow.wf!.steps.length - 1 && <span className="text-muted-foreground text-[11px]">→</span>}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>

      <ConfirmModal
        open={deletingType !== null}
        onClose={() => setDeletingType(null)}
        title="Delete this leave type?"
        confirmLabel="Delete leave type"
        tone="danger"
        message={
          <p>
            {deletingType ? `“${typeOf(deletingType)?.name ?? deletingType}” will be removed permanently with its policy versions and approval workflow.` : ''}{' '}
            Types carrying history — leave requests, balance adjustments, plans or waivers — cannot be deleted; the API refuses with a count so nothing breaks.
          </p>
        }
        onConfirm={() => {
          if (deletingType) void deleteLeaveType(deletingType)
        }}
      />
    </div>
  )
}

function StepEditor({
  title,
  steps,
  onChange,
}: {
  title: string
  steps: StepDraft[]
  onChange: (steps: StepDraft[]) => void
}) {
  return (
    <div>
      <p className="text-[12px] font-semibold text-foreground mb-2">{title}</p>
      <div className="space-y-3">
        {steps.length === 0 && <p className="text-[12px] text-muted-foreground">No steps yet — add the first step below.</p>}
        {steps.map((s, i) => (
          <div key={i} className="rounded-xl border border-border bg-warm dark:bg-muted/30 p-3 space-y-2.5">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] font-mono text-muted-foreground">Step {i + 1}</span>
              <button
                type="button"
                onClick={() => onChange(steps.filter((_, idx) => idx !== i))}
                className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-600 dark:text-rose-400 hover:underline"
              >
                <Trash2 className="w-3 h-3" /> Remove
              </button>
            </div>
            <SelectInput label="Role" value={s.role} onChange={(e) => onChange(steps.map((x, idx) => (idx === i ? { ...x, role: e.target.value as ApproverRole } : x)))}>
              {ROLES.map((r) => (
                <option key={r} value={r}>{roleLabels[r]}</option>
              ))}
            </SelectInput>

            <TextArea label="Rule note" rows={2} value={s.note} onChange={(e) => onChange(steps.map((x, idx) => (idx === i ? { ...x, note: e.target.value } : x)))} />
          </div>
        ))}
        <Btn variant="outline" onClick={() => onChange([...steps, { role: 'HR', slaDays: 3, note: 'Verifies policy compliance.' }])}>
          <Plus className="w-3.5 h-3.5" /> Add step
        </Btn>
      </div>
    </div>
  )
}

function PolicyCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-secondary/50 p-3.5">
      <p className="text-[11px] text-muted-foreground">{label}</p>
      <p className="text-[13px] font-semibold text-foreground mt-1">{value}</p>
    </div>
  )
}