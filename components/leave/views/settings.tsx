'use client'

import { useState } from 'react'
import {
  Building2,
  MapPin,
  Users,
  ShieldCheck,
  Lock,
  RotateCcw,
  Eye,
  Pencil,
  Power,
  Save,
  UserCheck,
  UserX,
  Network,
  KeyRound,
  Plus,
  Trash2,
  X,
  UserCog,
  UserPlus,
  Briefcase,
  Sparkles,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  ZONES,
  DEPARTMENTS,
  POSITIONS,
  EMPLOYEES,
  EMPLOYEE_ROLES,
  roleLabels,
  getDept,
  getZone,
  type ApproverRole,
} from '@/lib/leave'
import {
  useLeave,
  type EmployeeRow,
  type RegisterEmployeeInput,
  ROLE_PERMISSION_MODULES,
  ROLE_PERMISSION_ACTIONS,
  ROLE_PERMISSION_CODE_META,
} from '@/components/leave/leave-context'
import type { PositionDto } from '@/lib/leave-api'
import {
  SectionHeading,
  Panel,
  Avatar,
  Modal,
  TableToolbar,
  RowMenu,
  ConfirmModal,
  TextInput,
  SelectInput,
  StatCard,
  Btn,
  Pagination,
  usePaged,
  Tabs,
  EmptyState,
  type RowMenuItem,
} from '@/components/leave/shared'

function RowAvatar({ e, size = 'sm' }: { e: EmployeeRow; size?: 'sm' | 'md' | 'lg' }) {
  const sizes = { sm: 'h-6 w-6 text-[10px]', md: 'h-8 w-8 text-xs', lg: 'h-10 w-10 text-sm' }
  return (
    <div
      className={cn(
        'rounded-full bg-gradient-to-br text-white grid place-items-center font-semibold flex-shrink-0',
        e.gradient,
        sizes[size],
      )}
    >
      {e.initials}
    </div>
  )
}

export function SettingsView() {
  const {
    resetData,
    supervisorMode,
    employee,
    employees,
    updateEmployee,
    toggleEmployeeActive,
    registerEmployee,
    rolePermissions,
    permissionModules,
    permissionActions,
    permissionCodes,
    validPermissionCodes,
    saveRolePermissions,
    can,
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
    positions,
    positionTitle,
    createPosition,
    updatePosition,
    deletePosition,
    roleNames,
  } = useLeave()
  const [tab, setTab] = useState('staff')
  const [orgTab, setOrgTab] = useState('zones')
  const [permTab, setPermTab] = useState('matrix')

  const [zoneFilter, setZoneFilter] = useState('all')
  const [staffSearch, setStaffSearch] = useState('')
  const [activeFilter, setActiveFilter] = useState('all')
  const [viewTarget, setViewTarget] = useState<EmployeeRow | null>(null)
  const [editTarget, setEditTarget] = useState<EmployeeRow | null>(null)
  const [editDraft, setEditDraft] = useState({ title: '', email: '', payrollNo: '', positionId: '', departmentId: '', zoneId: '', gender: 'M' as 'M' | 'F', hireDate: '', roleIds: [] as string[], password: '' })
  const [toggleTarget, setToggleTarget] = useState<EmployeeRow | null>(null)
  const [matrixRole, setMatrixRole] = useState('HR')
  const [matrixDraft, setMatrixDraft] = useState<Record<string, Record<string, string[]>> | null>(null)

  const [zoneOpen, setZoneOpen] = useState(false)
  const [zoneDraft, setZoneDraft] = useState({ name: '', short: '', isHQ: false, isPemba: false, isCoordination: false })
  const [zoneDelete, setZoneDelete] = useState<string | null>(null)
  const [deptOpen, setDeptOpen] = useState(false)
  const [deptDraft, setDeptDraft] = useState({ name: '', zoneId: 'z1' })
  const [deptDelete, setDeptDelete] = useState<string | null>(null)
  const [posOpen, setPosOpen] = useState(false)
  const [posBusy, setPosBusy] = useState(false)
  const [posEdit, setPosEdit] = useState<PositionDto | null>(null)
  const [posDelete, setPosDelete] = useState<PositionDto | null>(null)
  const [posDeptFilter, setPosDeptFilter] = useState('all')
  const [posDraft, setPosDraft] = useState({ title: '', departmentId: 'd2', tier: 1, isFinalAuthority: false, defaultRoleIds: [] as string[] })
  const [roleOpen, setRoleOpen] = useState(false)
  const [roleDraft, setRoleDraft] = useState({ label: '', description: '' })
  const [roleEdit, setRoleEdit] = useState<{ id: string; label: string; description: string } | null>(null)
  const [roleEditDraft, setRoleEditDraft] = useState({ label: '', description: '' })
  const [roleDelete, setRoleDelete] = useState<string | null>(null)
  const [regOpen, setRegOpen] = useState(false)
  const [regBusy, setRegBusy] = useState(false)
  const [regDraft, setRegDraft] = useState({
    full_name: '',
    payroll_no: '',
    email: '',
    username: '',
    password: 'password',
    position_id: 'p8',
    department_id: 'd2',
    zone_id: 'z1',
    gender: 'M' as 'M' | 'F',
    hire_date: '',
    supervisor_employee_id: '',
    role_ids: [] as string[],
  })

  const scopeZone = supervisorMode ? 'all' : employee.zoneId
  const canManage = supervisorMode || can('admin', 'create')

  const allZones = [...ZONES, ...customZones]
  const allDepts = [...DEPARTMENTS, ...customDepartments]

  const zoneName = (id: string) => ZONES.find((z) => z.id === id)?.name ?? allZones.find((z) => z.id === id)?.name ?? id

  const roleName = (role: string): string => {
    const key =
      typeof role === 'string'
        ? role
        : typeof role === 'object' && role !== null
          ? String((role as Record<string, unknown>).role_id ?? (role as Record<string, unknown>).roleId ?? (role as Record<string, unknown>).position_id ?? '')
          : String(role ?? '')
    return (
      roleLabels[key as ApproverRole] ??
      customRoles.find((c) => c.id === key)?.label ??
      roleNames[key] ??
      key
    )
  }

  const roleKey = (role: unknown): string => {
    if (typeof role === 'string') return role
    if (typeof role === 'object' && role !== null) {
      const rec = role as Record<string, unknown>
      const id = rec.role_id ?? rec.roleId ?? rec.role ?? rec.position_id ?? rec.id
      if (typeof id === 'string') return id
      if (typeof id === 'number') return String(id)
      return ''
    }
    return role == null ? '' : String(role)
  }

  const positionOptions = positions.length > 0 ? positions : POSITIONS.map((p) => ({
    id: p.id,
    title: p.title,
    department_id: p.departmentId,
    zone_id: null,
    tier: p.tier,
    is_final_authority: p.isFinalAuthority ?? false,
    default_roles: [] as string[],
  }))

  const allRoleIds = [
    ...Object.keys(roleLabels).filter((id) => id in rolePermissions),
    ...Object.keys(rolePermissions).filter((id) => !(id in roleLabels)),
  ]

  const staff = employees.filter((e) => {
    if (zoneFilter !== 'all' && e.zoneId !== zoneFilter) return false
    if (zoneFilter === 'all' && scopeZone !== 'all' && e.zoneId !== scopeZone) return false
    if (activeFilter === 'active' && !e.active) return false
    if (activeFilter === 'inactive' && e.active) return false
    const q = staffSearch.trim().toLowerCase()
    if (!q) return true
    return (
      e.name.toLowerCase().includes(q) ||
      (e.payrollNo ?? '').toLowerCase().includes(q) ||
      e.title.toLowerCase().includes(q) ||
      (EMPLOYEE_ROLES[e.id] ?? []).some((r) => roleLabels[r].toLowerCase().includes(q)) ||
      (e.roleIds ?? []).some((r) => (roleLabels[r as ApproverRole] ?? r).toLowerCase().includes(q))
    )
  })
  const paged = usePaged(staff, 9)

  const depts = allDepts.filter((d) => {
    if (zoneFilter !== 'all') return d.zoneId === zoneFilter
    if (scopeZone !== 'all') return d.zoneId === scopeZone
    return true
  })

  const activeRoles = Object.values(rolePermissions).filter((m) => Object.values(m).flat().length > 0).length

  const buildMenu = (e: EmployeeRow): RowMenuItem[] => [
    { icon: Eye, label: 'View profile', onClick: () => setViewTarget(e) },
    { icon: Pencil, label: 'Edit profile', onClick: () => { setEditTarget(e); setEditDraft({ title: e.title, email: e.email, payrollNo: e.payrollNo, positionId: e.positionId, departmentId: e.departmentId, zoneId: e.zoneId, gender: e.gender ?? 'M', hireDate: e.hireDate, roleIds: [...(e.roleIds ?? [])], password: '' }) } },
    {
      icon: Power,
      label: e.active ? 'Deactivate' : 'Activate',
      tone: e.active ? 'danger' : 'default',
      onClick: () => setToggleTarget(e),
    },
  ]

  const saveEdit = () => {
    if (!editTarget) return
    updateEmployee(editTarget.id, { email: editDraft.email, payrollNo: editDraft.payrollNo, positionId: editDraft.positionId, departmentId: editDraft.departmentId, zoneId: editDraft.zoneId, gender: editDraft.gender, hireDate: editDraft.hireDate, roleIds: editDraft.roleIds, ...(editDraft.password ? { password: editDraft.password } : {}) })
    setEditTarget(null)
  }

  const matrix = matrixDraft ?? rolePermissions
  const togglePerm = (module: string, action: string) => {
    const next: Record<string, Record<string, string[]>> = JSON.parse(JSON.stringify(matrixDraft ?? rolePermissions))
    const cur = next[matrixRole]?.[module] ?? []
    next[matrixRole] = { ...(next[matrixRole] ?? {}), [module]: cur.includes(action) ? cur.filter((a) => a !== action) : [...cur, action] }
    setMatrixDraft(next)
  }
  const saveMatrix = () => {
    if (matrixDraft) saveRolePermissions(matrixDraft)
    setMatrixDraft(null)
  }

  const saveZone = () => {
    if (!zoneDraft.name.trim() || !zoneDraft.short.trim()) return
    addZone(zoneDraft)
    setZoneDraft({ name: '', short: '', isHQ: false, isPemba: false, isCoordination: false })
    setZoneOpen(false)
  }

  const saveDept = () => {
    if (!deptDraft.name.trim()) return
    addDepartment(deptDraft)
    setDeptDraft({ name: '', zoneId: 'z1' })
    setDeptOpen(false)
  }

  const openPosCreate = () => {
    setPosEdit(null)
    setPosDraft({ title: '', departmentId: 'd2', tier: 1, isFinalAuthority: false, defaultRoleIds: [] })
    setPosOpen(true)
  }

  const openPosEdit = (p: PositionDto) => {
    setPosEdit(p)
    setPosDraft({
      title: p.title,
      departmentId: p.department_id ?? 'd2',
      tier: p.tier ?? 1,
      isFinalAuthority: p.is_final_authority,
      defaultRoleIds: [...(p.default_roles ?? [])],
    })
    setPosOpen(true)
  }

  const togglePosRole = (rid: string, on: boolean) =>
    setPosDraft((d) => ({ ...d, defaultRoleIds: on ? [...new Set([...d.defaultRoleIds, rid])] : d.defaultRoleIds.filter((x) => x !== rid) }))

  const savePos = async () => {
    if (!posDraft.title.trim()) return
    setPosBusy(true)
    const payload = { title: posDraft.title, departmentId: posDraft.departmentId, tier: posDraft.tier, isFinalAuthority: posDraft.isFinalAuthority, defaultRoleIds: posDraft.defaultRoleIds }
    const ok = posEdit ? await updatePosition(posEdit.id, payload) : await createPosition(payload)
    setPosBusy(false)
    if (ok) {
      setPosOpen(false)
      setPosEdit(null)
    }
  }

  const saveRole = () => {
    if (!roleDraft.label.trim()) return
    createRole(roleDraft)
    setRoleDraft({ label: '', description: '' })
    setRoleOpen(false)
  }

  const saveRoleEdit = () => {
    if (!roleEdit || !roleEditDraft.label.trim()) return
    updateRole(roleEdit.id, roleEditDraft)
    setRoleEdit(null)
  }

  const toggleRegRole = (roleId: string, on: boolean) => {
    setRegDraft((d) => ({ ...d, role_ids: on ? (d.role_ids.includes(roleId) ? d.role_ids : [...d.role_ids, roleId]) : d.role_ids.filter((r) => r !== roleId) }))
  }

  const canRegister = canManage && regDraft.full_name.trim() && regDraft.username.trim() && regDraft.password.trim() && regDraft.hire_date

  const saveRegister = () => {
    if (!canRegister || !regDraft.hire_date) return
    const payload: RegisterEmployeeInput = {
      full_name: regDraft.full_name.trim(),
      payrollNo: regDraft.payroll_no.trim() || null,
      email: regDraft.email.trim() || null,
      username: regDraft.username.trim(),
      password: regDraft.password,
      position_id: regDraft.position_id,
      department_id: regDraft.department_id,
      zone_id: regDraft.zone_id,
      gender: regDraft.gender,
      hire_date: regDraft.hire_date,
      role_ids: regDraft.role_ids.length ? regDraft.role_ids : undefined,
      supervisor_employee_id: regDraft.supervisor_employee_id || undefined,
    }
    setRegBusy(true)
    void registerEmployee(payload).then((created) => {
      setRegBusy(false)
      if (created) {
        setRegOpen(false)
        setRegDraft({ full_name: '', payroll_no: '', email: '', username: '', password: 'password', position_id: 'p8', department_id: 'd2', zone_id: 'z1', gender: 'M', hire_date: '', supervisor_employee_id: '', role_ids: [] })
      }
    })
  }

  return (
    <div className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      <SectionHeading
        title="Admin & organisation"
        subtitle="Zones, departments, staff, approval roles and the permission matrix. Regional offices only access staff and requests within their own zone unless central permission is granted."
        actions={
          <Btn variant="outline" onClick={resetData}>
            <RotateCcw className="w-3.5 h-3.5" /> Reset demo data
          </Btn>
        }
      />

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard icon={Users} label="Staff on file" value={employees.length} hint={`${employees.filter((e) => e.active).length} active`} tone="emerald" />
        <StatCard icon={Building2} label="Zones" value={allZones.length} hint={`${allDepts.length} departments`} tone="teal" />
        <StatCard icon={ShieldCheck} label="Approval roles" value={Object.keys(rolePermissions).length} hint={`${activeRoles} with permissions`} tone="violet" />
        <StatCard icon={UserCheck} label="With approval role" value={new Set([...Object.values(EMPLOYEE_ROLES).flat(), ...employees.flatMap((e) => e.roleIds ?? []), ...Object.values(customRoleAssignments).flat()]).size} hint="holders across the office" tone="amber" />
      </div>

      <Tabs
        tabs={[
          { value: 'staff', label: 'Staff', icon: Users, badge: staff.length },
          { value: 'org', label: 'Zones & Departments', icon: Network },
          { value: 'positions', label: 'Positions', icon: Briefcase, badge: positionOptions.length },
          { value: 'permissions', label: 'Roles & Permissions', icon: KeyRound },
        ]}
        value={tab}
        onChange={setTab}
      />

      {tab === 'staff' && (
        <Panel
          title={`Staff (${staff.length})`}
          subtitle={zoneFilter === 'all' ? 'All employees of the office' : `${zoneName(zoneFilter)} employees`}
          actions={
            canManage ? (
              <Btn onClick={() => setRegOpen(true)}>
                <UserPlus className="w-3.5 h-3.5" /> Register employee
              </Btn>
            ) : undefined
          }
        >          <TableToolbar
            search={staffSearch}
            onSearch={setStaffSearch}
            placeholder="Search name, title, role…"
            count={staff.length}
            filters={[
              {
                label: 'Zone',
                value: zoneFilter,
                onChange: setZoneFilter,
                options: [{ value: 'all', label: scopeZone === 'all' ? 'All zones' : getZone(scopeZone).name }, ...(scopeZone === 'all' ? allZones.map((z) => ({ value: z.id, label: z.name })) : [])],
              },
              {
                label: 'Activity',
                value: activeFilter,
                onChange: setActiveFilter,
                options: [
                  { value: 'all', label: 'All staff' },
                  { value: 'active', label: 'Active' },
                  { value: 'inactive', label: 'Inactive' },
                ],
              },
            ]}
          />
          {paged.items.length === 0 ? (
            <EmptyState title="No staff match" hint="Adjust the search or filters." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="text-[11px] uppercase tracking-wider text-muted-foreground">
                    <th className="py-3 px-5 font-semibold">Employee</th>
                    <th className="py-3 px-3 font-semibold hidden sm:table-cell">Position</th>
                    <th className="py-3 px-3 font-semibold hidden md:table-cell">Department</th>
                    <th className="py-3 px-3 font-semibold hidden xl:table-cell">Zone</th>
                    <th className="py-3 px-3 font-semibold hidden lg:table-cell">Approval roles</th>
                    <th className="py-3 px-3 font-semibold">Status</th>
                    <th className="py-3 px-3 font-semibold text-right">Manage</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {paged.items.map((e) => {
                    const roles = [...new Set(e.active ? [...(e.roleIds ?? []), ...(EMPLOYEE_ROLES[e.id] ?? []), ...(customRoleAssignments[e.id] ?? [])] : [])]
                    return (
                      <tr key={e.id} className={cn('text-[13px] align-middle', !e.active && 'opacity-60')}>
                        <td className="py-3 px-5">
                          <div className="flex items-center gap-3">
                            <RowAvatar e={e} size="sm" />
                            <div className="min-w-0">
                              <p className="font-semibold text-foreground truncate">{e.name}</p>
                              <p className="text-[11px] text-muted-foreground truncate">{e.title} · {e.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-3 text-foreground hidden sm:table-cell text-[12.5px] font-medium">{e.title}</td>
                        <td className="py-3 px-3 text-muted-foreground hidden md:table-cell">{getDept(e.departmentId).name}</td>
                        <td className="py-3 px-3 hidden xl:table-cell">
                          <span className="inline-flex items-center gap-1.5 text-muted-foreground text-[12px]">
                            <MapPin className="w-3 h-3 text-teal-700" /> {getZone(e.zoneId).short}
                          </span>
                        </td>
                        <td className="py-3 px-3 hidden lg:table-cell">
                          {roles.length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {roles.map((r) => (
                                <span key={roleKey(r)} className="text-[11px] text-muted-foreground">{roleName(r)}</span>
                              ))}
                            </div>
                          ) : (
                            <span className="text-[11px] text-muted-foreground">—</span>
                          )}
                        </td>
                        <td className="py-3 px-3">
                          <span className={cn('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold border', e.active ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-900' : 'bg-zinc-100 text-zinc-500 border-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:border-zinc-700')}>
                            {e.active ? <><UserCheck className="w-2.5 h-2.5" /> Active</> : <><UserX className="w-2.5 h-2.5" /> Inactive</>}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-right">
                          <RowMenu items={buildMenu(e)} label="Manage" />
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
          <Pagination page={paged.page} pageSize={paged.size} total={paged.total} onPage={paged.setPage} onPageSize={paged.setSize} />
        </Panel>
      )}

      {tab === 'org' && (
        <>
          <Tabs
            tabs={[
              { value: 'zones', label: 'Zones', icon: MapPin, badge: allZones.length },
              { value: 'departments', label: 'Departments', icon: Building2, badge: depts.length },
              { value: 'separation', label: 'Regional data separation', icon: Lock },
            ]}
            value={orgTab}
            onChange={setOrgTab}
          />

          {orgTab === 'zones' && (
            <Panel
              title={`Zones (${allZones.length})`}
              subtitle="Administrative regions of the DPP office — centrally registered, dynamically configured"
              actions={
                canManage ? (
                  <Btn onClick={() => setZoneOpen(true)}>
                    <Plus className="w-3.5 h-3.5" /> Add zone
                  </Btn>
                ) : undefined
              }
            >
              <div className="space-y-2.5">
                {allZones.map((z) => {
                  const custom = customZones.some((cz) => cz.id === z.id)
                  return (
                    <div key={z.id} className={cn('rounded-xl border px-3 py-2.5', custom ? 'border-teal-300 bg-teal-50/60 dark:bg-teal-950/40 dark:border-teal-900' : z.isPemba ? 'border-violet-200 bg-violet-50 dark:bg-violet-950 dark:border-violet-900' : 'border-border bg-warm dark:bg-muted/30')}>
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-teal-700" />
                        <p className="text-[13px] font-semibold text-foreground flex-1">{z.name}</p>
                        {z.isPemba && <span className="rounded-full bg-violet-600 text-white text-[10px] font-bold px-2 py-0.5">PEMBA</span>}
                        {z.isHQ && <span className="rounded-full bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300 text-[10px] font-bold px-2 py-0.5">HQ</span>}
                        {custom && <span className="rounded-full bg-teal-600 text-white text-[10px] font-bold px-2 py-0.5">CUSTOM</span>}
                        {custom && canManage && (
                          <button
                            type="button"
                            onClick={() => setZoneDelete(z.id)}
                            className="inline-flex h-6 w-6 items-center justify-center rounded-lg border border-border text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950 transition"
                            aria-label={`Delete ${z.name}`}
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                      <p className="text-[11px] text-muted-foreground mt-1">
                        {z.isCoordination ? 'Coordination office, decentralized but accountable to the DPP.' : z.isPemba ? 'Regional prosecution office.' : z.isHQ ? 'Central office — Unguja.' : 'Regional prosecution office.'}
                        {' '}{custom && 'Configured at runtime in the admin console.'}
                      </p>
                    </div>
                  )
                })}
              </div>
            </Panel>
          )}

          {orgTab === 'departments' && (
            <Panel
              title={`Departments (${depts.length})`}
              subtitle="Operational units within the selected scope"
              actions={
                canManage ? (
                  <Btn onClick={() => setDeptOpen(true)}>
                    <Plus className="w-3.5 h-3.5" /> Add department
                  </Btn>
                ) : undefined
              }
            >
              <div className="mb-3 max-w-xs">
                <SelectInput
                  label="Zone"
                  value={zoneFilter}
                  onChange={(e) => setZoneFilter(e.target.value)}
                >
                  <option value="all">{scopeZone === 'all' ? 'All zones' : getZone(scopeZone).name}</option>
                  {scopeZone === 'all' ? allZones.map((z) => (
                    <option key={z.id} value={z.id}>{z.name}</option>
                  )) : null}
                </SelectInput>
              </div>
              <div className="space-y-2.5 max-h-[520px] overflow-y-auto pr-1">
                {depts.map((d) => {
                  const custom = customDepartments.some((cd) => cd.id === d.id)
                  return (
                    <div key={d.id} className="flex items-center gap-2.5 rounded-xl border border-border bg-warm dark:bg-muted/30 px-3 py-2.5">
                      <Building2 className="w-4 h-4 text-teal-700 flex-shrink-0" />
                      <div className="min-w-0 flex-1">
                        <p className="text-[13px] font-medium text-foreground truncate">
                          {d.name} {custom && <span className="ml-1 rounded-full bg-teal-600 text-white text-[9px] font-bold px-1.5 py-0.5">CUSTOM</span>}
                        </p>
                        <p className="text-[10px] text-muted-foreground">{zoneName(d.zoneId)}</p>
                      </div>
                      {custom && canManage && (
                        <button
                          type="button"
                          onClick={() => setDeptDelete(d.id)}
                          className="inline-flex h-6 w-6 items-center justify-center rounded-lg border border-border text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950 transition"
                          aria-label={`Delete ${d.name}`}
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  )
                })}
              </div>
            </Panel>
          )}

          {orgTab === 'separation' && (
            <Panel title="Regional data separation" subtitle="Least-privilege access control">
              <div className="space-y-2.5">
                {['Pemba office', 'Unguja North office', 'Unguja HQ'].map((r) => (
                  <div key={r} className="flex items-center gap-2.5 rounded-xl border border-border bg-warm dark:bg-muted/30 px-3 py-2.5">
                    <Lock className="w-4 h-4 text-teal-700" />
                    <div className="flex-1">
                      <p className="text-[12px] font-semibold text-foreground">{r}</p>
                      <p className="text-[10px] text-muted-foreground">Can only view staff and requests in this zone</p>
                    </div>
                    <ShieldCheck className="w-4 h-4 text-emerald-500" />
                  </div>
                ))}
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  Central oversight permission is reserved for the DPP, HR Director and Deputy — mirroring the decentralised-but-accountable structure.
                  Newly created zones follow the same rule: staff in that zone only see their own zone unless <span className="font-mono">approve_zone</span> / central permission is granted.
                </p>
              </div>
            </Panel>
          )}
        </>
      )}

      {tab === 'positions' && (
        <>
          <Panel
            title={`Positions (${positionOptions.length})`}
            subtitle="Job titles live per department/section — the position drives the title shown across the system and its default approval roles."
            actions={
              canManage ? (
                <Btn onClick={openPosCreate}>
                  <Plus className="w-3.5 h-3.5" /> Add position
                </Btn>
              ) : undefined
            }
          >
            <div className="mb-3 max-w-xs">
              <SelectInput label="Department / section" value={posDeptFilter} onChange={(e) => setPosDeptFilter(e.target.value)}>
                <option value="all">All departments</option>
                {allDepts.map((d) => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </SelectInput>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="text-[11px] uppercase tracking-wider text-muted-foreground">
                    <th className="py-3 px-5 font-semibold">Position</th>
                    <th className="py-3 px-3 font-semibold hidden md:table-cell">Department / section</th>
                    <th className="py-3 px-3 font-semibold hidden lg:table-cell">Tier</th>
                    <th className="py-3 px-3 font-semibold hidden lg:table-cell">Final authority</th>
                    <th className="py-3 px-3 font-semibold hidden xl:table-cell">Default approval roles</th>
                    <th className="py-3 px-3 font-semibold text-right">Manage</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {positionOptions
                    .filter((p) => posDeptFilter === 'all' || p.department_id === posDeptFilter)
                    .sort((a, b) => a.title.localeCompare(b.title))
                    .map((p) => (
                      <tr key={p.id} className="text-[13px] align-middle">
                        <td className="py-3 px-5">
                          <div className="flex items-center gap-2.5">
                            <Briefcase className="w-4 h-4 text-teal-700 flex-shrink-0" />
                            <div className="min-w-0">
                              <p className="font-semibold text-foreground truncate">{p.title}</p>
                              <p className="text-[11px] text-muted-foreground truncate">{p.id}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-3 text-muted-foreground hidden md:table-cell">{allDepts.find((d) => d.id === p.department_id)?.name ?? '—'}</td>
                        <td className="py-3 px-3 hidden lg:table-cell text-muted-foreground">{p.tier ?? 1}</td>
                        <td className="py-3 px-3 hidden lg:table-cell">
                          {p.is_final_authority ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950 dark:text-rose-300 dark:border-rose-900 px-2 py-0.5 text-[10px] font-semibold">
                              <Sparkles className="w-2.5 h-2.5" /> Yes
                            </span>
                          ) : (
                            <span className="text-[11px] text-muted-foreground">—</span>
                          )}
                        </td>
                        <td className="py-3 px-3 hidden xl:table-cell">
                          {(p.default_roles ?? []).length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {(p.default_roles ?? []).map((r) => (
                                <span key={roleKey(r)} className="rounded-full border border-teal-200 bg-teal-50 text-teal-700 dark:border-teal-900 dark:bg-teal-950 dark:text-teal-300 px-2 py-0.5 text-[10px] font-semibold">
                                  {roleName(r)}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span className="text-[11px] text-muted-foreground">—</span>
                          )}
                        </td>
                        <td className="py-3 px-3 text-right whitespace-nowrap">
                          <div className="inline-flex items-center gap-1.5">
                            {canManage && (
                              <>
                                <Btn variant="ghost" onClick={() => openPosEdit(p)}>
                                  <Pencil className="w-3 h-3" /> Edit
                                </Btn>
                                <button
                                  type="button"
                                  onClick={() => setPosDelete(p)}
                                  className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-border text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950 transition"
                                  aria-label={`Delete ${p.title}`}
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
            <p className="text-[11px] text-muted-foreground mt-3">
              Register selectively — a position is only deletable while no staff member holds it. Deleting removes its default role mappings (audited).
            </p>
          </Panel>
        </>
      )}

      {tab === 'permissions' && (
        <>
          <Tabs
            tabs={[
              { value: 'matrix', label: 'Permission matrix', icon: Grid3x3Icon },
              { value: 'scopes', label: 'Approval roles & scopes', icon: ShieldCheck, badge: Object.keys(rolePermissions).length },
              { value: 'codes', label: 'Granular access codes', icon: KeyRound },
              { value: 'held', label: 'Held by', icon: UserCog },
            ]}
            value={permTab}
            onChange={setPermTab}
          />

          {permTab === 'matrix' && (
            <Panel
              title="Permission matrix"
              subtitle={`Actions each approval role can take per module — ${matrixDraft ? 'editing…' : `fetched from the backend (/roles), saved via PATCH /roles/{id}`}`}
              actions={
                matrixDraft ? (
                  <div className="flex items-center gap-2">
                    <Btn variant="ghost" onClick={() => setMatrixDraft(null)}>Cancel</Btn>
                    <Btn onClick={saveMatrix}><Save className="w-3.5 h-3.5" /> Save permissions</Btn>
                  </div>
                ) : undefined
              }
            >
              <div className="mb-4 max-w-xs">
                <SelectInput label="Role" value={matrixRole} onChange={(e) => { setMatrixRole(e.target.value); setMatrixDraft(null) }}>
                  {Object.keys(rolePermissions).map((role) => (
                    <option key={role} value={role}>{roleName(role)}</option>
                  ))}
                </SelectInput>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="text-[11px] uppercase tracking-wider text-muted-foreground">
                      <th className="py-3 px-4 font-semibold">Module</th>
                      {(permissionActions.length ? permissionActions : ROLE_PERMISSION_ACTIONS).map((a) => (
                        <th key={a} className="py-3 px-3 font-semibold text-center">{a}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {(permissionModules.length ? permissionModules : ROLE_PERMISSION_MODULES).map((m) => (
                      <tr key={m} className="text-[13px]">
                        <td className="py-3 px-4 font-semibold text-foreground capitalize">{m}</td>
                        {(permissionActions.length ? permissionActions : ROLE_PERMISSION_ACTIONS).map((a) => {
                          const code = `${m}.${a}`
                          const valid = validPermissionCodes.includes(code)
                          const on = (matrix[matrixRole]?.[m] ?? []).includes(a)
                          return (
                            <td key={a} className="py-3 px-3 text-center">
                              {valid ? (
                                <button
                                  type="button"
                                  onClick={() => togglePerm(m, a)}
                                  className={cn(
                                    'inline-flex h-6 w-6 items-center justify-center rounded-md border transition',
                                    on ? 'bg-teal-700 text-white border-teal-700' : 'border-border bg-secondary text-transparent hover:text-muted-foreground',
                                  )}
                                  aria-label={`${m} ${a}`}
                                >
                                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                    <polyline points="20 6 9 17 4 12" />
                                  </svg>
                                </button>
                              ) : (
                                <span
                                  className="inline-flex h-6 w-6 items-center justify-center rounded-md border border-dashed border-border opacity-40"
                                  aria-label={`${m} ${a} (not in catalog)`}
                                />
                              )}
                            </td>
                          )
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="text-[11px] text-muted-foreground mt-3">Toggling a permission updates the runtime store immediately; the matrix itself is enforced during routing and menu rendering.</p>
            </Panel>
          )}

          {permTab === 'scopes' && (
            <Panel
              title="Approval roles & scopes"
              subtitle="How each role resolves — built-in roles plus custom roles created here"
              actions={
                canManage ? (
                  <Btn onClick={() => setRoleOpen(true)}>
                    <Plus className="w-3.5 h-3.5" /> Create role
                  </Btn>
                ) : undefined
              }
            >
              <div className="space-y-2">
                {Object.keys(roleLabels).map((key) => (
                  <div key={key} className="rounded-xl border border-border px-3 py-2.5">
                    <div className="flex items-center gap-2 mb-1">
                      <ShieldCheck className="w-4 h-4 text-teal-700" />
                      <p className="text-[13px] font-semibold text-foreground">{roleLabels[key as ApproverRole]}</p>
                    </div>
                    <p className="text-[11px] text-muted-foreground leading-relaxed">{roleScopeText(key)}</p>
                  </div>
                ))}
                {customRoles.map((r) => (
                  <div key={r.id} className="rounded-xl border border-teal-300 bg-teal-50/60 dark:bg-teal-950/40 dark:border-teal-900 px-3 py-2.5">
                    <div className="flex items-center gap-2 mb-1">
                      <UserCog className="w-4 h-4 text-teal-700" />
                      <p className="text-[13px] font-semibold text-foreground flex-1">{r.label}</p>
                      <span className="rounded-full bg-teal-600 text-white text-[9px] font-bold px-1.5 py-0.5">CUSTOM</span>
                      {canManage && (
                        <>
                          <button
                            type="button"
                            onClick={() => { setRoleEdit({ id: r.id, label: r.label, description: r.description }); setRoleEditDraft({ label: r.label, description: r.description }) }}
                            className="inline-flex h-6 w-6 items-center justify-center rounded-lg border border-border text-foreground hover:bg-card transition"
                            aria-label={`Edit ${r.label}`}
                          >
                            <Pencil className="w-3 h-3" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setRoleDelete(r.id)}
                            className="inline-flex h-6 w-6 items-center justify-center rounded-lg border border-border text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950 transition"
                            aria-label={`Delete ${r.label}`}
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </>
                      )}
                    </div>
                    <p className="text-[11px] text-muted-foreground leading-relaxed">{r.description || 'No description — permissions are set in the matrix and capped by the granular access codes.'}</p>
                  </div>
                ))}
              </div>
            </Panel>
          )}

          {permTab === 'codes' && (
            <Panel
              title="Granular access codes"
              subtitle={`Fine-grained gates beyond the coarse module×action matrix — toggled for ${roleName(matrixRole)}`}
            >
              <div className="mb-4 max-w-xs">
                <SelectInput label="Role" value={matrixRole} onChange={(e) => { setMatrixRole(e.target.value); setMatrixDraft(null) }}>
                  {Object.keys(rolePermissions).map((role) => (
                    <option key={role} value={role}>{roleName(role)}</option>
                  ))}
                </SelectInput>
              </div>
              <div className="space-y-2.5">
                {(permissionCodes.length ? permissionCodes : ROLE_PERMISSION_CODE_META).map((c) => {
                  const on = (matrix[matrixRole]?.[c.module] ?? []).includes(c.code)
                  return (
                    <div key={c.code} className="flex items-center gap-3 rounded-xl border border-border bg-warm dark:bg-muted/30 px-3 py-2.5">
                      <button
                        type="button"
                        onClick={() => togglePerm(c.module, c.code)}
                        className={cn(
                          'inline-flex h-6 w-6 items-center justify-center rounded-md border transition flex-shrink-0',
                          on ? 'bg-teal-700 text-white border-teal-700' : 'border-border bg-secondary text-transparent hover:text-muted-foreground',
                        )}
                        aria-pressed={on}
                        aria-label={c.label}
                      >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      </button>
                      <div className="min-w-0 flex-1">
                        <p className="text-[12px] font-mono font-semibold text-foreground">{c.label}</p>
                        <p className="text-[11px] text-muted-foreground leading-snug">{c.hint}</p>
                      </div>
                      <span className="text-[10px] font-mono text-muted-foreground capitalize shrink-0">{c.module}</span>
                    </div>
                  )
                })}
              </div>
              <p className="text-[11px] text-muted-foreground mt-3 leading-relaxed">
                Example — remove <span className="font-mono">view_medical_documents</span> from HR and restricted medical records disappear from the documents view instantly.
              </p>
            </Panel>
          )}

          {permTab === 'held' && (
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
              <Panel title="Held by" subtitle="People carrying built-in approval roles right now">
                <div className="space-y-2">
                  {Object.entries(EMPLOYEE_ROLES).map(([empId, roles]) => (
                    <div key={empId} className="flex items-center gap-3 rounded-xl border border-border bg-warm dark:bg-muted/30 px-3 py-2">
                      <Avatar id={empId} size="sm" />
                      <div className="min-w-0 flex-1">
                        <p className="text-[12px] font-semibold text-foreground truncate">{EMPLOYEES.find((e) => e.id === empId)?.name}</p>
                        <p className="text-[10px] text-muted-foreground truncate">{roles.map((r) => roleLabels[r]).join(', ')}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </Panel>

              <Panel
                title="Custom role holders"
                subtitle="Custom roles you created — assign staff; permissions take effect in the matrix immediately"
              >
                {customRoles.length === 0 ? (
                  <EmptyState compact title="No custom roles yet" hint="Create one in Approval roles & scopes, then assign holders here." />
                ) : (
                  <div className="space-y-2">
                    {employees.map((e) => {
                      const assigned = customRoleAssignments[e.id] ?? []
                      const available = customRoles.filter((r) => !assigned.includes(r.id))
                      return (
                        <div key={e.id} className="flex flex-wrap items-center gap-2 rounded-xl border border-border bg-warm dark:bg-muted/30 px-3 py-2">
                          <RowAvatar e={e} size="sm" />
                          <div className="min-w-0 flex-1">
                            <p className="text-[12px] font-semibold text-foreground truncate">{e.name}</p>
                            <p className="text-[10px] text-muted-foreground truncate">
                              {assigned.length ? assigned.map((r) => roleName(r)).join(', ') : 'no custom roles'}
                            </p>
                          </div>
                          <div className="flex flex-wrap items-center gap-1">
                            {assigned.map((r) => (
                              <span key={r} className="inline-flex items-center gap-1 rounded-full border border-teal-200 bg-teal-50 text-teal-700 dark:border-teal-900 dark:bg-teal-950 dark:text-teal-300 px-2 py-0.5 text-[10px] font-semibold">
                                {roleName(r)}
                                <button
                                  type="button"
                                  onClick={() => assignCustomRole(e.id, r, false)}
                                  className="text-teal-600 hover:text-rose-600 transition"
                                  aria-label={`Remove ${roleName(r)} from ${e.name}`}
                                >
                                  <X className="w-2.5 h-2.5" />
                                </button>
                              </span>
                            ))}
                            {canManage && available.length > 0 && (
                              <select
                                defaultValue=""
                                onChange={(ev) => { if (ev.target.value) assignCustomRole(e.id, ev.target.value, true) }}
                                className="h-7 rounded-full border border-input bg-card px-2 text-[11px] text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/40"
                              >
                                <option value="" disabled>Assign role…</option>
                                {available.map((r) => (
                                  <option key={r.id} value={r.id}>{r.label}</option>
                                ))}
                              </select>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </Panel>
            </div>
          )}
        </>
      )}

      <Modal
        open={regOpen}
        onClose={() => { if (!regBusy) setRegOpen(false) }}
        title="Register new employee"
        subtitle="Creates a login, employee record, approval roles and reporting line. Audited on save."
        size="lg"
        footer={
          <div className="flex items-center gap-2">
            <Btn variant="ghost" onClick={() => setRegOpen(false)} disabled={regBusy}>Cancel</Btn>
            <Btn onClick={saveRegister} disabled={!canRegister || regBusy}>
              <Save className="w-3.5 h-3.5" /> {regBusy ? 'Registering…' : 'Register employee'}
            </Btn>
          </div>
        }
      >
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            <TextInput label="Full name" value={regDraft.full_name} onChange={(e) => setRegDraft({ ...regDraft, full_name: e.target.value })} placeholder="e.g. Amina Yusuf Mwinyi" />
            <TextInput label="Payroll no." value={regDraft.payroll_no} onChange={(e) => setRegDraft({ ...regDraft, payroll_no: e.target.value })} placeholder="DPP-1013" />
            <TextInput label="Work email" value={regDraft.email} onChange={(e) => setRegDraft({ ...regDraft, email: e.target.value })} placeholder="name@dpp.go.tz" />
            <TextInput label="Username (login)" value={regDraft.username} onChange={(e) => setRegDraft({ ...regDraft, username: e.target.value })} placeholder="unique username" />
            <SelectInput label="Gender" value={regDraft.gender} onChange={(e) => setRegDraft({ ...regDraft, gender: e.target.value as 'M' | 'F' })}>
              <option value="M">Male</option>
              <option value="F">Female</option>
            </SelectInput>
            <SelectInput label="Position" value={regDraft.position_id} onChange={(e) => {
              const posId = e.target.value
              const pos = positionOptions.find((p) => p.id === posId)
              const inherited = pos?.default_roles ?? []
              setRegDraft((d) => ({ ...d, position_id: posId, role_ids: inherited.length ? [...new Set([...inherited, ...d.role_ids])] : d.role_ids }))
            }}>
              {positionOptions.filter((p) => !p.department_id || p.department_id === regDraft.department_id).map((p) => (
                <option key={p.id} value={p.id}>{p.title}</option>
              ))}
            </SelectInput>
            <SelectInput label="Initial password" value={regDraft.password} onChange={(e) => setRegDraft({ ...regDraft, password: e.target.value })}>
              <option value="password">password</option>
              <option value="password123">password123</option>
              <option value={regDraft.password}>{regDraft.password || 'custom…'}</option>
            </SelectInput>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
            <SelectInput label="Department" value={regDraft.department_id} onChange={(e) => {
              const deptId = e.target.value
              setRegDraft((d) => {
                const opts = positionOptions.filter((p) => !p.department_id || p.department_id === deptId)
                const posId = opts.some((o) => o.id === d.position_id) ? d.position_id : opts[0]?.id ?? d.position_id
                return { ...d, department_id: deptId, position_id: posId }
              })
            }}>
              {allDepts.map((d) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </SelectInput>
            <SelectInput label="Zone" value={regDraft.zone_id} onChange={(e) => setRegDraft({ ...regDraft, zone_id: e.target.value })}>
              {allZones.map((z) => (
                <option key={z.id} value={z.id}>{z.name}</option>
              ))}
            </SelectInput>
            <TextInput label="Hire date" type="date" value={regDraft.hire_date} onChange={(e) => setRegDraft({ ...regDraft, hire_date: e.target.value })} />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            <SelectInput label="Reports to (supervisor)" value={regDraft.supervisor_employee_id} onChange={(e) => setRegDraft({ ...regDraft, supervisor_employee_id: e.target.value })}>
              <option value="">— none —</option>
              {employees.filter((x) => x.active).map((x) => (
                <option key={x.id} value={x.id}>{x.name}</option>
              ))}
            </SelectInput>
                <div>
                  <p className="mb-1.5 text-[12px] font-medium text-foreground">Approval roles</p>
                  <div className="mb-2">
                    <SelectInput
                      label="Add approval role"
                      value=""
                      onChange={(e) => {
                        const rid = e.target.value
                        if (!rid) return
                        setRegDraft((d) => (d.role_ids.includes(rid) ? d : { ...d, role_ids: [...d.role_ids, rid] }))
                      }}
                    >
                      <option value="">Select a role to bind…</option>
                      {allRoleIds.filter((r) => !regDraft.role_ids.includes(r)).map((r) => (
                        <option key={r} value={r}>{roleName(r)}</option>
                      ))}
                    </SelectInput>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {regDraft.role_ids.length > 0 ? (
                      allRoleIds.filter((r) => regDraft.role_ids.includes(r)).map((r) => (
                        <span key={r} className="inline-flex items-center gap-1 rounded-full border border-border bg-secondary text-muted-foreground dark:bg-muted/40 dark:text-muted-foreground px-2.5 py-1 text-[11px] font-medium">
                          {roleName(r)}
                          <button type="button" onClick={() => setRegDraft((d) => ({ ...d, role_ids: d.role_ids.filter((x) => x !== r) }))} className="text-muted-foreground hover:text-foreground">×</button>
                        </span>
                      ))
                    ) : (
                      <span className="text-[11px] text-muted-foreground">No explicit roles — blank inherits the position's defaults.</span>
                    )}
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-1.5">Choosing a position above auto-inherits its default roles.</p>
                </div>
          </div>
        </div>
      </Modal>

      <Modal
        open={viewTarget !== null}
        onClose={() => setViewTarget(null)}
        title={viewTarget ? viewTarget.name : 'Profile'}
        subtitle={viewTarget?.title}
        size="md"
      >
        {viewTarget && (
          <div className="space-y-4">
            <div className="flex items-center gap-4 rounded-xl border border-border bg-secondary/50 p-4">
              <RowAvatar e={viewTarget} size="lg" />
              <div className="min-w-0">
                <p className="text-sm font-semibold text-foreground">{viewTarget.name}</p>
                <p className="text-[12px] text-muted-foreground">{viewTarget.title}</p>
                <p className="text-[11px] text-muted-foreground">{getZone(viewTarget.zoneId).name} · {getDept(viewTarget.departmentId).name}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <DetailCell label="Payroll no." value={viewTarget.payrollNo} />
              <DetailCell label="Gender" value={viewTarget.gender ? (viewTarget.gender === 'M' ? 'Male' : 'Female') : '—'} />
              <DetailCell label="Position" value={viewTarget.title} />
              <DetailCell label="Department" value={getDept(viewTarget.departmentId).name} />
              <DetailCell label="Email" value={viewTarget.email} />
              <DetailCell label="Status" value={viewTarget.active ? 'Active' : 'Inactive'} />
              <DetailCell label="Hired" value={viewTarget.hireDate ? viewTarget.hireDate.slice(0, 10) : '—'} />
              <DetailCell label="Zone" value={getZone(viewTarget.zoneId).name} />
            </div>
            {([...(viewTarget.roleIds ?? []), ...(customRoleAssignments[viewTarget.id] ?? [])]).length > 0 && (
              <div className="rounded-xl border border-border p-3.5">
                <p className="text-[11px] text-muted-foreground uppercase tracking-wide font-semibold mb-1.5">Approval roles</p>
                <div className="flex flex-wrap gap-1.5">
                  {[...(viewTarget.roleIds ?? []), ...(customRoleAssignments[viewTarget.id] ?? [])].map((r) => (
                    <span key={r} className="rounded-full border border-teal-200 bg-teal-50 text-teal-700 dark:bg-teal-950 dark:text-teal-300 dark:border-teal-900 px-2.5 py-1 text-[11px] font-medium">
                      {roleName(r)}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>

      <Modal
        open={editTarget !== null}
        onClose={() => setEditTarget(null)}
        title={editTarget ? `Edit — ${editTarget.name}` : 'Edit profile'}
        subtitle="Profile updates are written to the audit trail."
        size="md"
        footer={
          <Btn onClick={saveEdit}>
            <Save className="w-3.5 h-3.5" /> Save changes
          </Btn>
        }
      >
        <div className="space-y-4">
          <TextInput label="Full name" value={editTarget?.name ?? ''} readOnly className="opacity-60" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            <TextInput label="Payroll no." value={editDraft.payrollNo} onChange={(e) => setEditDraft({ ...editDraft, payrollNo: e.target.value })} placeholder="DPP-1001" />
            <TextInput label="Work email" value={editDraft.email} onChange={(e) => setEditDraft({ ...editDraft, email: e.target.value })} placeholder="name@dpp.go.tz" />
            <SelectInput label="Position" value={editDraft.positionId} onChange={(e) => setEditDraft({ ...editDraft, positionId: e.target.value })}>
              {positionOptions.filter((p) => !p.department_id || p.department_id === editDraft.departmentId).map((p) => (
                <option key={p.id} value={p.id}>{p.title}</option>
              ))}
            </SelectInput>
            <SelectInput label="Gender" value={editDraft.gender} onChange={(e) => setEditDraft({ ...editDraft, gender: e.target.value as 'M' | 'F' })}>
              <option value="M">Male</option>
              <option value="F">Female</option>
            </SelectInput>
            <SelectInput label="Department" value={editDraft.departmentId} onChange={(e) => {
              const deptId = e.target.value
              setEditDraft((d) => {
                const opts = positionOptions.filter((p) => !p.department_id || p.department_id === deptId)
                const posId = opts.some((o) => o.id === d.positionId) ? d.positionId : opts[0]?.id ?? d.positionId
                return { ...d, departmentId: deptId, positionId: posId }
              })
            }}>
              {allDepts.map((d) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </SelectInput>
            <SelectInput label="Zone" value={editDraft.zoneId} onChange={(e) => setEditDraft({ ...editDraft, zoneId: e.target.value })}>
              {allZones.map((z) => (
                <option key={z.id} value={z.id}>{z.name}</option>
              ))}
            </SelectInput>
            <TextInput label="Hire date" type="date" value={editDraft.hireDate ? editDraft.hireDate.slice(0, 10) : ''} onChange={(e) => setEditDraft({ ...editDraft, hireDate: e.target.value })} />
          </div>
          <TextInput label="New password" type="password" value={editDraft.password} onChange={(e) => setEditDraft({ ...editDraft, password: e.target.value })} placeholder="Leave blank to keep the current one" autoComplete="new-password" />
          <div>
            <p className="mb-1.5 text-[12px] font-medium text-foreground">Approval roles</p>
            <div className="flex flex-wrap gap-1.5">
              {allRoleIds.map((r) => {
                const on = editDraft.roleIds.includes(r)
                return (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setEditDraft((d) => ({ ...d, roleIds: on ? d.roleIds.filter((x) => x !== r) : [...d.roleIds, r] }))}
                    className={cn(
                      'rounded-full border px-2.5 py-1 text-[11px] font-medium transition',
                      on ? 'border-teal-600 bg-teal-600 text-white' : 'border-border bg-secondary text-muted-foreground hover:text-foreground',
                    )}
                  >
                    {roleName(r)}
                  </button>
                )
              })}
            </div>
            <p className="text-[10px] text-muted-foreground mt-1">Unconditional roles are replaced on save; department/zone scoped heads are managed separately.</p>
          </div>
          <p className="text-[10px] text-muted-foreground">Full name is managed by HR records; the position drives the job title shown across the system.</p>
        </div>
      </Modal>

      <Modal
        open={zoneOpen}
        onClose={() => setZoneOpen(false)}
        title="Add administrative zone"
        subtitle="New zones appear across the system; staff assigned to them see only their own zone."
        size="md"
        footer={
          <Btn onClick={saveZone} disabled={!zoneDraft.name.trim() || !zoneDraft.short.trim()}>
            <Save className="w-3.5 h-3.5" /> Create zone
          </Btn>
        }
      >
        <div className="space-y-4">
          <TextInput label="Zone name" value={zoneDraft.name} onChange={(e) => setZoneDraft({ ...zoneDraft, name: e.target.value })} placeholder="e.g. Unguja Urban West" />
          <TextInput label="Short code" value={zoneDraft.short} onChange={(e) => setZoneDraft({ ...zoneDraft, short: e.target.value })} placeholder="e.g. UUW" />
          <div className="space-y-2 rounded-xl border border-border bg-secondary/40 p-3.5">
            {([
              ['isHQ', 'Headquarters (HQ)'],
              ['isPemba', 'Pemba region'],
              ['isCoordination', 'Coordination office'],
            ] as const).map(([key, label]) => (
              <label key={key} className="flex items-center gap-2 text-[12px] text-foreground">
                <input
                  type="checkbox"
                  checked={zoneDraft[key]}
                  onChange={(e) => setZoneDraft({ ...zoneDraft, [key]: e.target.checked })}
                  className="accent-teal-700"
                />
                {label}
              </label>
            ))}
          </div>
        </div>
      </Modal>

      <Modal
        open={deptOpen}
        onClose={() => setDeptOpen(false)}
        title="Add department"
        subtitle="Operational units are attached to an administrative zone."
        size="md"
        footer={
          <Btn onClick={saveDept} disabled={!deptDraft.name.trim()}>
            <Save className="w-3.5 h-3.5" /> Create department
          </Btn>
        }
      >
        <div className="space-y-4">
          <TextInput label="Department name" value={deptDraft.name} onChange={(e) => setDeptDraft({ ...deptDraft, name: e.target.value })} placeholder="e.g. Appeals Division" />
          <SelectInput label="Zone" value={deptDraft.zoneId} onChange={(e) => setDeptDraft({ ...deptDraft, zoneId: e.target.value })}>
            {allZones.map((z) => (
              <option key={z.id} value={z.id}>{z.name}</option>
            ))}
          </SelectInput>
        </div>
      </Modal>

      <Modal
        open={roleOpen}
        onClose={() => setRoleOpen(false)}
        title="Create approval role"
        subtitle="Custom roles start with no permissions — grant them in the matrix and granular codes, then assign holders."
        size="md"
        footer={
          <Btn onClick={saveRole} disabled={!roleDraft.label.trim()}>
            <Save className="w-3.5 h-3.5" /> Create role
          </Btn>
        }
      >
        <div className="space-y-4">
          <TextInput label="Role label" value={roleDraft.label} onChange={(e) => setRoleDraft({ ...roleDraft, label: e.target.value })} placeholder="e.g. Compliance Officer" />
          <TextInput label="Scope description" value={roleDraft.description} onChange={(e) => setRoleDraft({ ...roleDraft, description: e.target.value })} placeholder="What this role resolves…" />
        </div>
      </Modal>

      <Modal
        open={roleEdit !== null}
        onClose={() => setRoleEdit(null)}
        title={roleEdit ? `Edit role — ${roleName(roleEdit.id)}` : 'Edit role'}
        subtitle="The permission key stays stable; only the label and description change."
        size="md"
        footer={
          <Btn onClick={saveRoleEdit} disabled={!roleEditDraft.label.trim()}>
            <Save className="w-3.5 h-3.5" /> Save role
          </Btn>
        }
      >
        <div className="space-y-4">
          <TextInput label="Role label" value={roleEditDraft.label} onChange={(e) => setRoleEditDraft({ ...roleEditDraft, label: e.target.value })} />
          <TextInput label="Scope description" value={roleEditDraft.description} onChange={(e) => setRoleEditDraft({ ...roleEditDraft, description: e.target.value })} />
        </div>
      </Modal>

      <Modal
        open={posOpen}
        onClose={() => { if (!posBusy) setPosOpen(false) }}
        title={posEdit ? `Edit position — ${posEdit.title}` : 'Add position'}
        subtitle="Positions belong to a department or section and define the job title plus default approval roles."
        size="lg"
        footer={
          <div className="flex items-center gap-2">
            <Btn variant="ghost" onClick={() => setPosOpen(false)} disabled={posBusy}>Cancel</Btn>
            <Btn onClick={() => void savePos()} disabled={!posDraft.title.trim() || posBusy}>
              <Save className="w-3.5 h-3.5" /> {posBusy ? 'Saving…' : posEdit ? 'Save changes' : 'Create position'}
            </Btn>
          </div>
        }
      >
        <div className="space-y-4">
          <TextInput label="Position title" value={posDraft.title} onChange={(e) => setPosDraft({ ...posDraft, title: e.target.value })} placeholder="e.g. Head of Legal Research & Advisory" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            <SelectInput label="Department / section" value={posDraft.departmentId} onChange={(e) => setPosDraft({ ...posDraft, departmentId: e.target.value })}>
              {allDepts.map((d) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </SelectInput>
            <SelectInput label="Approval tier" value={posDraft.tier} onChange={(e) => setPosDraft({ ...posDraft, tier: Number(e.target.value) })}>
              {[1, 2, 3, 4, 5].map((t) => (
                <option key={t} value={t}>Tier {t}</option>
              ))}
            </SelectInput>
          </div>
          <button
            type="button"
            onClick={() => setPosDraft({ ...posDraft, isFinalAuthority: !posDraft.isFinalAuthority })}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11px] font-medium transition',
              posDraft.isFinalAuthority ? 'border-rose-300 bg-rose-50 text-rose-700 dark:bg-rose-950 dark:text-rose-300 dark:border-rose-900' : 'border-border bg-secondary text-muted-foreground hover:text-foreground',
            )}
          >
            <Sparkles className="w-3 h-3" /> {posDraft.isFinalAuthority ? 'Final authority — DPP sign-off' : 'Not final authority'}
          </button>
          <div>
            <p className="mb-1.5 text-[12px] font-medium text-foreground">Default approval roles</p>
            <p className="text-[10px] text-muted-foreground mb-2">New staff in this position inherit these roles unless roles are chosen explicitly at registration.</p>
            <div className="flex flex-wrap gap-1.5">
              {allRoleIds.map((r) => {
                const on = posDraft.defaultRoleIds.includes(r)
                return (
                  <button
                    key={r}
                    type="button"
                    onClick={() => togglePosRole(r, !on)}
                    className={cn(
                      'rounded-full border px-2.5 py-1 text-[11px] font-medium transition',
                      on ? 'border-teal-600 bg-teal-600 text-white' : 'border-border bg-secondary text-muted-foreground hover:text-foreground',
                    )}
                  >
                    {roleName(r)}
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      </Modal>

      <ConfirmModal
        open={posDelete !== null}
        onClose={() => setPosDelete(null)}
        title="Delete this position?"
        confirmLabel="Delete position"
        tone="danger"
        message={
          <p>
            Remove <span className="font-semibold text-foreground">{posDelete?.title}</span> and its default role mappings? Only possible while no staff member holds the position. The action is audited.
          </p>
        }
        onConfirm={() => {
          if (posDelete) void deletePosition(posDelete.id)
          setPosDelete(null)
        }}
      />

      <ConfirmModal
        open={toggleTarget !== null}
        onClose={() => setToggleTarget(null)}
        title={toggleTarget?.active ? 'Deactivate staff member?' : 'Activate staff member?'}
        confirmLabel={toggleTarget?.active ? 'Deactivate' : 'Activate'}
        message={
          <p>
            <span className="font-semibold text-foreground">{toggleTarget?.name}</span> will be{' '}
            {toggleTarget?.active ? 'deactivated. They will no longer appear as an active approver or applicant in routing.' : 're-activated and will become available in approval routing again.'}
            The change is audited.
          </p>
        }
        onConfirm={() => {
          if (toggleTarget) toggleEmployeeActive(toggleTarget.id)
        }}
      />

      <ConfirmModal
        open={zoneDelete !== null}
        onClose={() => setZoneDelete(null)}
        title="Delete this zone?"
        confirmLabel="Delete zone"
        tone="danger"
        message={
          <p>
            Remove <span className="font-semibold text-foreground">{zoneDelete ? zoneName(zoneDelete) : ''}</span> and its departments? This only affects custom zones added in the admin console. The action is audited.
          </p>
        }
        onConfirm={() => {
          if (zoneDelete) removeZone(zoneDelete)
          setZoneDelete(null)
        }}
      />

      <ConfirmModal
        open={deptDelete !== null}
        onClose={() => setDeptDelete(null)}
        title="Delete this department?"
        confirmLabel="Delete department"
        tone="danger"
        message={
          <p>
            Remove <span className="font-semibold text-foreground">{deptDelete ? allDepts.find((d) => d.id === deptDelete)?.name : ''}</span> from the directory. The action is audited.
          </p>
        }
        onConfirm={() => {
          if (deptDelete) removeDepartment(deptDelete)
          setDeptDelete(null)
        }}
      />

      <ConfirmModal
        open={roleDelete !== null}
        onClose={() => setRoleDelete(null)}
        title="Delete approval role?"
        confirmLabel="Delete role"
        tone="danger"
        message={
          <p>
            Remove <span className="font-semibold text-foreground">{roleDelete ? roleName(roleDelete) : ''}</span>, its permission entries and all holder assignments. Anyone holding it instantly loses its permissions. The action is audited.
          </p>
        }
        onConfirm={() => {
          if (roleDelete) deleteRole(roleDelete)
          setRoleDelete(null)
        }}
      />
    </div>
  )
}

function DetailCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-secondary/50 p-3.5">
      <p className="text-[11px] text-muted-foreground">{label}</p>
      <p className="text-[13px] font-semibold text-foreground mt-1 truncate">{value}</p>
    </div>
  )
}

function roleScopeText(role: string): string {
  switch (role) {
    case 'SUPERVISOR': return 'Immediate supervisor from the reporting line — checks coverage and recommends.'
    case 'DEPT_HEAD': return 'Head of the employee’s department — required for long or regulated leave.'
    case 'ZONAL_HEAD': return 'Zone / regional head for offices outside HQ (Unguja Kaskazini, Pemba).'
    case 'HR': return 'Verifies policy compliance, balances and documents — medical records stay here.'
    case 'FINAL_AUTHORITY': return 'Director of Public Prosecutions — required for maternity, study, LWP and >20-day requests.'
    default: return ''
  }
}

function Grid3x3Icon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" width="1em" height="1em" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <path d="M3 9h18M3 15h18M9 3v18M15 3v18" />
    </svg>
  )
}