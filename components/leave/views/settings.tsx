'use client'

import { Fragment, useState, useEffect } from 'react'
import {
  Building2,
  MapPin,
  Users,
  ShieldCheck,
  Lock,
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
  ChevronDown,
  ChevronRight,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import {
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
import { leaveApi, type PositionDto, type DivisionDto, type UnitDto } from '@/lib/leave-api'
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
  MultiSelect,
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

/** Initial passwords offered at registration. Each one satisfies the backend
 *  rule (min 8 chars, upper + lower + digit) — the old `password` /
 *  `password123` presets were rejected with a 422 on save. */
const PASSWORD_PRESETS = ['Password123', 'Password1', 'ChangeMe1', 'Welcome2026']

function passwordIsValid(value: string): boolean {
  return value.length >= 8 && /[a-z]/.test(value) && /[A-Z]/.test(value) && /\d/.test(value)
}

export function SettingsView() {
  const {
    supervisorMode,
    employee,
    employees,
    updateEmployee,
    toggleEmployeeActive,
    deleteEmployee,
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
    updateZone,
    removeZone,
    addDepartment,
    updateDepartment,
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
    roleDescriptions,
    allZones,
    allDepts,
    rolesOf,
  } = useLeave()
  const [tab, setTab] = useState('staff')
  const [orgTab, setOrgTab] = useState('zones')

  // Load divisions and units for the new tabs
  useEffect(() => {
    void (async () => {
      try { const r = await leaveApi.org.divisions(); setDivisions(r.data); } catch {}
      try { const r = await leaveApi.org.units(); setUnits(r.data); } catch {}
    })()
  }, [])

  const saveDiv = async () => {
    if (!divDraft.name.trim()) return
    if (divEditId) {
      await leaveApi.org.updateDivision(divEditId, { name: divDraft.name.trim(), parent_department_id: divDraft.parent_department_id || null, zone_id: divDraft.zone_id || null, unit_type: divDraft.unit_type, reports_directly_to_leadership: divDraft.reports_directly_to_leadership })
      setDivEditId(null)
    } else {
      await leaveApi.org.storeDivision({ name: divDraft.name.trim(), parent_department_id: divDraft.parent_department_id || null, zone_id: divDraft.zone_id || null, unit_type: divDraft.unit_type, reports_directly_to_leadership: divDraft.reports_directly_to_leadership })
    }
    setDivDraft({ name: '', parent_department_id: null, zone_id: '', unit_type: 'division', reports_directly_to_leadership: false })
    setDivOpen(false)
    try { const r = await leaveApi.org.divisions(); setDivisions(r.data); } catch {}
  }

  const saveUnit = async () => {
    if (!unitDraft.name.trim()) return
    if (unitEditId) {
      await leaveApi.org.updateUnit(unitEditId, { name: unitDraft.name.trim(), parent_department_id: unitDraft.parent_department_id || null, zone_id: unitDraft.zone_id || null, unit_type: unitDraft.unit_type, reports_directly_to_leadership: unitDraft.reports_directly_to_leadership })
      setUnitEditId(null)
    } else {
      await leaveApi.org.storeUnit({ name: unitDraft.name.trim(), parent_department_id: unitDraft.parent_department_id || null, zone_id: unitDraft.zone_id || null, unit_type: unitDraft.unit_type, reports_directly_to_leadership: unitDraft.reports_directly_to_leadership })
    }
    setUnitDraft({ name: '', parent_department_id: null, zone_id: '', unit_type: 'unit', reports_directly_to_leadership: false })
    setUnitOpen(false)
    try { const r = await leaveApi.org.units(); setUnits(r.data); } catch {}
  }

  const [permTab, setPermTab] = useState('matrix')

  const [zoneFilter, setZoneFilter] = useState('all')
  const [staffSearch, setStaffSearch] = useState('')
  const [activeFilter, setActiveFilter] = useState('all')
  const [viewTarget, setViewTarget] = useState<EmployeeRow | null>(null)
  const [editTarget, setEditTarget] = useState<EmployeeRow | null>(null)
  const [editDraft, setEditDraft] = useState({ title: '', email: '', payrollNo: '', positionId: '', departmentId: '', zoneId: '', gender: 'M' as 'M' | 'F', hireDate: '', roleIds: [] as string[], password: '' })
  const [toggleTarget, setToggleTarget] = useState<EmployeeRow | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<EmployeeRow | null>(null)
  const [matrixRole, setMatrixRole] = useState('HR')
  const [matrixDraft, setMatrixDraft] = useState<Record<string, Record<string, string[]>> | null>(null)
  /** Module rows the admin has opened in the matrix table (accordion). */
  const [openModules, setOpenModules] = useState<Set<string>>(new Set())
  const [matrixPage, setMatrixPage] = useState(1)
  const [matrixPageSize, setMatrixPageSize] = useState(5)
  /** Set when a role delete is refused because workflows still reference it —
   *  the modal then offers to hand those steps to another role instead. */
  const [roleReassign, setRoleReassign] = useState<{ id: string; steps: number } | null>(null)
  const [roleReassignTarget, setRoleReassignTarget] = useState('FINAL_AUTHORITY')

  const [zoneOpen, setZoneOpen] = useState(false)
  const [zoneDraft, setZoneDraft] = useState({ name: '', short: '', isHQ: false, isPemba: false, isCoordination: false })
  const [zoneEditId, setZoneEditId] = useState<string | null>(null)
  const [zoneDelete, setZoneDelete] = useState<string | null>(null)
  const [deptOpen, setDeptOpen] = useState(false)
  const [deptDraft, setDeptDraft] = useState({ name: '', zoneId: '' })
  const [deptEditId, setDeptEditId] = useState<string | null>(null)
  const [deptDelete, setDeptDelete] = useState<string | null>(null)
  const [divisions, setDivisions] = useState<DivisionDto[]>([])
  const [units, setUnits] = useState<UnitDto[]>([])
  const [divOpen, setDivOpen] = useState(false)
  const [divDraft, setDivDraft] = useState({ name: '', parent_department_id: '' as string | null, zone_id: '', unit_type: 'division', reports_directly_to_leadership: false })
  const [divEditId, setDivEditId] = useState<string | null>(null)
  const [divDelete, setDivDelete] = useState<string | null>(null)
  const [unitOpen, setUnitOpen] = useState(false)
  const [unitDraft, setUnitDraft] = useState({ name: '', parent_department_id: '' as string | null, zone_id: '', unit_type: 'unit', reports_directly_to_leadership: false })
  const [unitEditId, setUnitEditId] = useState<string | null>(null)
  const [unitDelete, setUnitDelete] = useState<string | null>(null)
  const [posOpen, setPosOpen] = useState(false)
  const [posBusy, setPosBusy] = useState(false)
  const [posEdit, setPosEdit] = useState<PositionDto | null>(null)
  const [posDelete, setPosDelete] = useState<PositionDto | null>(null)
  const [posDeptFilter, setPosDeptFilter] = useState('all')
  const [posDraft, setPosDraft] = useState({ title: '', departmentId: '', tier: 1, isFinalAuthority: false, defaultRoleIds: [] as string[] })
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
    password: 'Password123',
    passwordCustom: false,
    position_id: '',
    department_id: '',
    division_id: '',
    unit_id: '',
    zone_id: '',
    gender: 'M' as 'M' | 'F',
    hire_date: '',
    role_ids: [] as string[],
  })

  const scopeZone = supervisorMode ? 'all' : employee.zoneId
  const canManage = supervisorMode || can('admin', 'create')

  const zoneName = (id: string) => allZones.find((z) => z.id === id)?.name ?? id

  const roleName = (role: string): string => {
    const key =
      typeof role === 'string'
        ? role
        : typeof role === 'object' && role !== null
          ? String((role as Record<string, unknown>).role_id ?? (role as Record<string, unknown>).roleId ?? (role as Record<string, unknown>).position_id ?? '')
          : String(role ?? '')
    // Backend `roles.name` is authoritative; the static labels are only a
    // pre-hydration fallback for the built-ins.
    return (
      customRoles.find((c) => c.id === key)?.label ??
      roleNames[key] ??
      roleLabels[key as ApproverRole] ??
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

  const positionOptions = positions.length > 0 ? positions : []

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
      (rolesOf(e.id) ?? []).some((r) => roleName(r).toLowerCase().includes(q)) ||
      (e.roleIds ?? []).some((r) => roleName(r).toLowerCase().includes(q))
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
    { icon: Pencil, label: 'Edit profile', onClick: () => { setEditTarget(e); setEditDraft({ title: e.title, email: e.email, payrollNo: e.payrollNo, positionId: e.positionId, departmentId: e.departmentId, zoneId: e.zoneId, gender: e.gender ?? 'M', hireDate: e.hireDate, roleIds: [...new Set(e.roleIds ?? [])], password: '' }) } },
    {
      icon: Power,
      label: e.active ? 'Deactivate' : 'Activate',
      tone: e.active ? 'danger' : 'default',
      onClick: () => setToggleTarget(e),
    },
    ...(canManage && e.id !== employee.id
      ? [
          {
            icon: Trash2,
            label: 'Delete permanently',
            tone: 'danger' as const,
            onClick: () => setDeleteTarget(e),
          },
        ]
      : []),
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
    if (zoneEditId) {
      void updateZone(zoneEditId, { ...zoneDraft, name: zoneDraft.name.trim(), short: zoneDraft.short.trim() })
      setZoneEditId(null)
    } else {
      void addZone({ ...zoneDraft, name: zoneDraft.name.trim(), short: zoneDraft.short.trim() })
    }
    setZoneDraft({ name: '', short: '', isHQ: false, isPemba: false, isCoordination: false })
    setZoneOpen(false)
  }

  const saveDept = () => {
    if (!deptDraft.name.trim()) return
    if (deptEditId) {
      void updateDepartment(deptEditId, { name: deptDraft.name.trim(), zoneId: deptDraft.zoneId })
      setDeptEditId(null)
    } else {
      void addDepartment({ name: deptDraft.name.trim(), zoneId: deptDraft.zoneId })
    }
    setDeptDraft({ name: '', zoneId: allZones[0]?.id ?? '' })
    setDeptOpen(false)
  }

  const openPosCreate = () => {
    setPosEdit(null)
    setPosDraft({ title: '', departmentId: allDepts[0]?.id ?? '', tier: 1, isFinalAuthority: false, defaultRoleIds: [] })
    setPosOpen(true)
  }

  const openPosEdit = (p: PositionDto) => {
    setPosEdit(p)
    setPosDraft({
      title: p.title,
      departmentId: p.department_id ?? allDepts[0]?.id ?? '',
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

  /** Seed the draft from live org data — no hardcoded zone/department/position ids. */
  const seedRegDraft = () => {
    const zoneId = allZones[0]?.id ?? ''
    const zoneDepts = zoneId ? allDepts.filter((d) => d.zoneId === zoneId) : allDepts
    const deptId = (zoneDepts.find((d) => !d.parentId) ?? zoneDepts[0])?.id ?? ''
    const divisionId = zoneDepts.find((d) => d.parentId === deptId)?.id ?? ''
    const unitId = zoneDepts.find((d) => d.parentId === divisionId)?.id ?? ''
    const pathIds = new Set([deptId, divisionId, unitId].filter(Boolean))
    const posId = positionOptions.find((p) => !p.department_id || pathIds.has(p.department_id))?.id ?? positionOptions[0]?.id ?? ''
    setRegDraft({
      full_name: '',
      payroll_no: '',
      email: '',
      username: '',
      password: 'Password123',
      passwordCustom: false,
      position_id: posId,
      department_id: deptId,
      division_id: divisionId,
      unit_id: unitId,
      zone_id: zoneId,
      gender: 'M',
      hire_date: '',
      role_ids: [],
    })
  }

  const openRegister = () => {
    seedRegDraft()
    setRegOpen(true)
  }

  // Zone → department → division → unit. Employees only store one org unit id
  // on the backend (department_id), so the deepest chosen level is sent.
  const regZoneDepts = allDepts.filter((d) => d.zoneId === regDraft.zone_id)
  const rootRegDepts = regZoneDepts.filter((d) => !d.parentId || d.unitType === 'department')
  const regDepartments = rootRegDepts.length ? rootRegDepts : regZoneDepts
  const regDivisions = regZoneDepts.filter((d) => d.parentId === regDraft.department_id)
  const regUnits = regZoneDepts.filter((d) => d.parentId === regDraft.division_id)
  const regPlacementId = regDraft.unit_id || regDraft.division_id || regDraft.department_id
  const regPathIds = new Set([regDraft.department_id, regDraft.division_id, regDraft.unit_id].filter(Boolean))
  const regPositions = positionOptions.filter((p) => !p.department_id || regPathIds.has(p.department_id))

  const canRegister = Boolean(
    canManage &&
    regDraft.full_name.trim() &&
    regDraft.email.trim() &&
    regDraft.username.trim() &&
    passwordIsValid(regDraft.password) &&
    regDraft.hire_date &&
    regDraft.position_id &&
    regPlacementId &&
    regDraft.zone_id,
  )

  const saveRegister = () => {
    if (!canRegister || !regDraft.hire_date) return
    const payload: RegisterEmployeeInput = {
      full_name: regDraft.full_name.trim(),
      payrollNo: regDraft.payroll_no.trim() || null,
      email: regDraft.email.trim() || null,
      username: regDraft.username.trim(),
      password: regDraft.password,
      position_id: regDraft.position_id,
      department_id: regPlacementId,
      zone_id: regDraft.zone_id,
      gender: regDraft.gender,
      hire_date: regDraft.hire_date,
      role_ids: regDraft.role_ids.length ? regDraft.role_ids : undefined,
    }
    setRegBusy(true)
    void registerEmployee(payload).then((created) => {
      setRegBusy(false)
      if (created) {
        setRegOpen(false)
        seedRegDraft()
      }
    })
  }

  return (
    <div className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      <SectionHeading
        title="Admin & organisation"
        subtitle="Admin settings — staff, org, roles and permissions."
      />

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard icon={Users} label="Staff on file" value={employees.length} hint={`${employees.filter((e) => e.active).length} active`} tone="emerald" />
        <StatCard icon={Building2} label="Zones" value={allZones.length} hint={`${allDepts.length} departments`} tone="teal" />
        <StatCard icon={ShieldCheck} label="Approval roles" value={Object.keys(rolePermissions).length} hint={`${activeRoles} with permissions`} tone="violet" />
        <StatCard icon={UserCheck} label="With approval role" value={new Set(employees.flatMap((e) => e.roleIds ?? []).concat(Object.values(customRoleAssignments).flat())).size} hint="holders across the office" tone="amber" />
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
              <Btn onClick={openRegister}>
                <UserPlus className="w-3.5 h-3.5" /> Add employee
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
                    const roles = [...new Set(e.active ? [...(e.roleIds ?? []), ...(rolesOf(e.id) ?? []), ...(customRoleAssignments[e.id] ?? [])] : [])]
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
              { value: 'divisions', label: 'Divisions', icon: Network, badge: 0 },
              { value: 'units', label: 'Units', icon: Users, badge: 0 },
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
                  <Btn onClick={() => { setZoneEditId(null); setZoneDraft({ name: '', short: '', isHQ: false, isPemba: false, isCoordination: false }); setZoneOpen(true) }}>
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
                        {canManage && (
                          <>
                            <button
                              type="button"
                              onClick={() => { setZoneEditId(z.id); setZoneDraft({ name: z.name, short: z.short, isHQ: !!z.isHQ, isPemba: !!z.isPemba, isCoordination: !!z.isCoordination }); setZoneOpen(true) }}
                              className="inline-flex h-6 w-6 items-center justify-center rounded-lg border border-border text-foreground hover:bg-card transition"
                              aria-label={`Edit ${z.name}`}
                            >
                              <Pencil className="w-3 h-3" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setZoneDelete(z.id)}
                              className="inline-flex h-6 w-6 items-center justify-center rounded-lg border border-border text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950 transition"
                              aria-label={`Delete ${z.name}`}
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </>
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
                  <Btn onClick={() => { setDeptEditId(null); setDeptDraft({ name: '', zoneId: zoneFilter !== 'all' ? zoneFilter : allZones[0]?.id ?? '' }); setDeptOpen(true) }}>
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
                      {canManage && (
                        <>
                          <button
                            type="button"
                            onClick={() => { setDeptEditId(d.id); setDeptDraft({ name: d.name, zoneId: d.zoneId }); setDeptOpen(true) }}
                            className="inline-flex h-6 w-6 items-center justify-center rounded-lg border border-border text-foreground hover:bg-card transition"
                            aria-label={`Edit ${d.name}`}
                          >
                            <Pencil className="w-3 h-3" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeptDelete(d.id)}
                            className="inline-flex h-6 w-6 items-center justify-center rounded-lg border border-border text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950 transition"
                            aria-label={`Delete ${d.name}`}
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </>
                      )}
                    </div>
                  )
                })}
              </div>
            </Panel>
          )}

          {orgTab === 'divisions' && (
            <Panel
              title={`Divisions (${divisions.length})`}
              subtitle="Sub-departments — created based on zones and parent departments"
              actions={
                canManage ? (
                  <Btn onClick={() => { setDivEditId(null); setDivDraft({ name: '', parent_department_id: null, zone_id: allZones[0]?.id ?? '', unit_type: 'division', reports_directly_to_leadership: false }); setDivOpen(true) }}>
                    <Plus className="w-3.5 h-3.5" /> Add division
                  </Btn>
                ) : undefined
              }
            >
              <div className="space-y-2.5 max-h-[520px] overflow-y-auto pr-1">
                {divisions.map((d) => (
                  <div key={d.id} className="flex items-center gap-2.5 rounded-xl border border-border bg-warm dark:bg-muted/30 px-3 py-2.5">
                    <Network className="w-4 h-4 text-teal-700 flex-shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="text-[13px] font-medium text-foreground truncate">{d.name}</p>
                      <p className="text-[10px] text-muted-foreground">Zone: {zoneName(d.zone_id || '') || '—'} · Parent: {allDepts.find((dept) => dept.id === d.parent_department_id)?.name || '—'}</p>
                      <p className="text-[10px] text-muted-foreground">Type: {d.unit_type || 'division'} · Reports directly: {d.reports_directly_to_leadership ? 'Yes' : 'No'}</p>
                    </div>
                    {canManage && (
                      <>
                        <button type="button" onClick={() => { setDivEditId(d.id); setDivDraft({ name: d.name, parent_department_id: d.parent_department_id, zone_id: d.zone_id || allZones[0]?.id || '', unit_type: d.unit_type || 'division', reports_directly_to_leadership: d.reports_directly_to_leadership }); setDivOpen(true) }} className="inline-flex h-6 w-6 items-center justify-center rounded-lg border border-border text-foreground hover:bg-card transition" aria-label={`Edit ${d.name}`}>
                          <Pencil className="w-3 h-3" />
                        </button>
                        <button type="button" onClick={() => setDivDelete(d.id)} className="inline-flex h-6 w-6 items-center justify-center rounded-lg border border-border text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950 transition" aria-label={`Delete ${d.name}`}>
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </>
                    )}
                  </div>
                ))}
              </div>
            </Panel>
          )}

          {orgTab === 'units' && (
            <Panel
              title={`Units (${units.length})`}
              subtitle="Sub-divisions — created based on zones, departments and parent divisions"
              actions={
                canManage ? (
                  <Btn onClick={() => { setUnitEditId(null); setUnitDraft({ name: '', parent_department_id: null, zone_id: allZones[0]?.id ?? '', unit_type: 'unit', reports_directly_to_leadership: false }); setUnitOpen(true) }}>
                    <Plus className="w-3.5 h-3.5" /> Add unit
                  </Btn>
                ) : undefined
              }
            >
              <div className="space-y-2.5 max-h-[520px] overflow-y-auto pr-1">
                {units.map((d) => (
                  <div key={d.id} className="flex items-center gap-2.5 rounded-xl border border-border bg-warm dark:bg-muted/30 px-3 py-2.5">
                    <Users className="w-4 h-4 text-teal-700 flex-shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="text-[13px] font-medium text-foreground truncate">{d.name}</p>
                      <p className="text-[10px] text-muted-foreground">Zone: {zoneName(d.zone_id || '') || '—'} · Parent: {allDepts.find((dept) => dept.id === d.parent_department_id)?.name || '—'}</p>
                      <p className="text-[10px] text-muted-foreground">Type: {d.unit_type || 'unit'} · Reports directly: {d.reports_directly_to_leadership ? 'Yes' : 'No'}</p>
                    </div>
                    {canManage && (
                      <>
                        <button type="button" onClick={() => { setUnitEditId(d.id); setUnitDraft({ name: d.name, parent_department_id: d.parent_department_id, zone_id: d.zone_id || allZones[0]?.id || '', unit_type: d.unit_type || 'unit', reports_directly_to_leadership: d.reports_directly_to_leadership }); setUnitOpen(true) }} className="inline-flex h-6 w-6 items-center justify-center rounded-lg border border-border text-foreground hover:bg-card transition" aria-label={`Edit ${d.name}`}>
                          <Pencil className="w-3 h-3" />
                        </button>
                        <button type="button" onClick={() => setUnitDelete(d.id)} className="inline-flex h-6 w-6 items-center justify-center rounded-lg border border-border text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950 transition" aria-label={`Delete ${d.name}`}>
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </>
                    )}
                  </div>
                ))}
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

          {permTab === 'matrix' && (() => {
            const modules = permissionModules.length ? permissionModules : ROLE_PERMISSION_MODULES
            const actions = permissionActions.length ? permissionActions : ROLE_PERMISSION_ACTIONS
            const grantedCount = (role: string) =>
              Object.entries(matrix[role] ?? {}).reduce(
                (sum, [m, list]) => sum + list.filter((a) => validPermissionCodes.includes(`${m}.${a}`)).length,
                0,
              )
            const validInModule = (m: string) => actions.filter((a) => validPermissionCodes.includes(`${m}.${a}`))
            const onInModule = (m: string) => validInModule(m).filter((a) => (matrix[matrixRole]?.[m] ?? []).includes(a)).length
            const allOnInModule = (m: string) => {
              const valid = validInModule(m)
              return valid.length > 0 && valid.every((a) => (matrix[matrixRole]?.[m] ?? []).includes(a))
            }
            const toggleModule = (m: string) => {
              const valid = validInModule(m)
              if (valid.length === 0) return
              const turnOn = !allOnInModule(m)
              // One staged write — togglePerm would restart from the same base
              // on each loop iteration and only the last change would survive.
              const next: Record<string, Record<string, string[]>> = JSON.parse(JSON.stringify(matrixDraft ?? rolePermissions))
              const cur = next[matrixRole]?.[m] ?? []
              next[matrixRole] = {
                ...(next[matrixRole] ?? {}),
                [m]: turnOn ? [...new Set([...cur, ...valid])] : cur.filter((a) => !valid.includes(a)),
              }
              setMatrixDraft(next)
            }
            const toggleRow = (m: string) =>
              setOpenModules((prev) => {
                const next = new Set(prev)
                if (next.has(m)) next.delete(m)
                else next.add(m)
                return next
              })
            const pages = Math.max(1, Math.ceil(modules.length / matrixPageSize))
            const safePage = Math.min(matrixPage, pages)
            const visibleModules = modules.slice((safePage - 1) * matrixPageSize, safePage * matrixPageSize)
            return (
              <Panel
                title="Permission matrix"
                subtitle="Grant each role the actions it can perform."
                actions={
                  matrixDraft ? (
                    <div className="flex items-center gap-2">
                      <Btn variant="ghost" onClick={() => setMatrixDraft(null)}>Discard</Btn>
                      <Btn onClick={saveMatrix}><Save className="w-3.5 h-3.5" /> Save changes</Btn>
                    </div>
                  ) : undefined
                }
              >
                {/* Role picker — a dropdown rather than a row of pills so the
                    list stays usable as roles multiply. */}
                <div className="mb-5 flex flex-wrap items-end gap-3">
                  <div className="w-full max-w-xs">
                    <SelectInput
                      label="Role"
                      value={matrixRole}
                      onChange={(e) => { setMatrixRole(e.target.value); setMatrixDraft(null) }}
                    >
                      {Object.keys(rolePermissions).map((role) => (
                        <option key={role} value={role}>
                          {roleName(role)} ({grantedCount(role)} granted)
                        </option>
                      ))}
                    </SelectInput>
                  </div>
                  <p className="pb-2.5 text-[11px] text-muted-foreground">
                    {matrixDraft ? 'Unsaved changes — press Save to apply.' : 'Changes apply to this role only.'}
                  </p>
                </div>

                {/* Module table — one row per module, expandable to show its actions */}
                <div className="overflow-x-auto rounded-xl border border-border">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-border bg-warm dark:bg-muted/30">
                        <th className="py-2.5 pl-3 pr-2 w-8" />
                        <th className="py-2.5 px-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Module</th>
                        <th className="py-2.5 px-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground w-28">Granted</th>
                        <th className="py-2.5 px-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground w-32">All actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {visibleModules.map((m) => {
                        const total = validInModule(m).length
                        const on = onInModule(m)
                        const allOn = allOnInModule(m)
                        const expanded = openModules.has(m)
                        return (
                          <Fragment key={m}>
                            <tr
                              onClick={() => toggleRow(m)}
                              className={cn('border-b border-border/60 cursor-pointer transition', expanded ? 'bg-teal-50/50 dark:bg-teal-950/20' : 'hover:bg-accent/50')}
                            >
                              <td className="py-2.5 pl-3 pr-2 text-muted-foreground">
                                {expanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                              </td>
                              <td className="py-2.5 px-2">
                                <p className="text-[13px] font-semibold text-foreground capitalize">{m}</p>
                                {total === 0 && <p className="text-[10px] text-muted-foreground">no grantable actions in catalog</p>}
                              </td>
                              <td className="py-2.5 px-2">
                                {total > 0 ? (
                                  <div className="flex items-center gap-2">
                                    <div className="h-1.5 w-16 rounded-full bg-secondary overflow-hidden">
                                      <div className="h-full rounded-full bg-teal-600 transition-all" style={{ width: `${(on / total) * 100}%` }} />
                                    </div>
                                    <span className="text-[11px] tabular-nums text-muted-foreground">{on} / {total}</span>
                                  </div>
                                ) : (
                                  <span className="text-[11px] text-muted-foreground">—</span>
                                )}
                              </td>
                              <td className="py-2.5 px-2">
                                {total > 0 && (
                                  <button
                                    type="button"
                                    onClick={(e) => { e.stopPropagation(); toggleModule(m) }}
                                    className={cn(
                                      'rounded-full border px-2.5 py-1 text-[10px] font-semibold transition',
                                      allOn
                                        ? 'border-rose-200 bg-rose-50 text-rose-600 dark:bg-rose-950 dark:text-rose-300 dark:border-rose-900'
                                        : 'border-teal-200 bg-teal-50 text-teal-700 dark:bg-teal-950 dark:text-teal-300 dark:border-teal-900',
                                    )}
                                  >
                                    {allOn ? 'Revoke all' : 'Grant all'}
                                  </button>
                                )}
                              </td>
                            </tr>
                            {expanded && (
                              <tr className="border-b border-border/60 bg-warm/60 dark:bg-muted/20">
                                <td />
                                <td colSpan={3} className="py-3 px-2">
                                  <div className="flex flex-wrap gap-1.5">
                                    {actions.map((a) => {
                                      const code = `${m}.${a}`
                                      const valid = validPermissionCodes.includes(code)
                                      if (!valid) return null
                                      const isOn = (matrix[matrixRole]?.[m] ?? []).includes(a)
                                      return (
                                        <button
                                          key={a}
                                          type="button"
                                          onClick={() => togglePerm(m, a)}
                                          className={cn(
                                            'inline-flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-[11px] font-medium transition',
                                            isOn
                                              ? 'border-teal-700 bg-teal-700 text-white'
                                              : 'border-border bg-card text-muted-foreground hover:text-foreground hover:border-teal-300',
                                          )}
                                          aria-pressed={isOn}
                                          aria-label={`${m}.${a}`}
                                        >
                                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className={isOn ? 'opacity-100' : 'opacity-0'}>
                                            <polyline points="20 6 9 17 4 12" />
                                          </svg>
                                          {a}
                                        </button>
                                      )
                                    })}
                                  </div>
                                </td>
                              </tr>
                            )}
                          </Fragment>
                        )
                      })}
                    </tbody>
                  </table>
                  <Pagination
                    page={safePage}
                    pageSize={matrixPageSize}
                    total={modules.length}
                    onPage={setMatrixPage}
                    onPageSize={(s) => { setMatrixPageSize(s); setMatrixPage(1) }}
                    pageSizeOptions={[5, 10, 20]}
                  />
                </div>
                <p className="text-[11px] text-muted-foreground mt-3">Click a module row to open its capability list; changes are staged until you press Save, which writes the whole matrix for this role in one request.</p>
              </Panel>
            )
          })()}

          {permTab === 'scopes' && (
            <Panel
              title="Approval roles & scopes"
              subtitle="Live backend roles — edit names, archive to remove, and pick a replacement for workflow steps. Final Authority is protected."
              actions={
                canManage ? (
                  <Btn onClick={() => setRoleOpen(true)}>
                    <Plus className="w-3.5 h-3.5" /> Create role
                  </Btn>
                ) : undefined
              }
            >
              <div className="space-y-2">
                {allRoleIds.map((key) => {
                  const custom = customRoles.some((c) => c.id === key)
                  const desc = roleDescriptions[key] || roleScopeText(key)
                  const holders = employees.filter((e) => ((rolesOf(e.id) ?? []) as string[]).includes(key)).length
                  return (
                    <div key={key} className={cn('rounded-xl border px-3 py-2.5', custom ? 'border-teal-300 bg-teal-50/60 dark:bg-teal-950/40 dark:border-teal-900' : 'border-border bg-warm dark:bg-muted/30')}>
                      <div className="flex items-center gap-2 mb-1">
                        {custom ? <UserCog className="w-4 h-4 text-teal-700" /> : <ShieldCheck className="w-4 h-4 text-teal-700" />}
                        <p className="text-[13px] font-semibold text-foreground flex-1">{roleName(key)}</p>
                        {key === 'FINAL_AUTHORITY' && (
                          <span title="Terminal approver of last resort — this role cannot be deleted." className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-1.5 py-0.5 text-[9px] font-bold text-amber-700 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-300">
                            <Lock className="w-2.5 h-2.5" /> PROTECTED
                          </span>
                        )}
                        <span className={cn('rounded-full text-[9px] font-bold px-1.5 py-0.5', custom ? 'bg-teal-600 text-white' : 'bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300')}>
                          {custom ? 'CUSTOM' : 'SYSTEM'}
                        </span>
                        {holders > 0 && (
                          <span className="rounded-full border border-border bg-card text-[9px] font-semibold px-1.5 py-0.5 text-muted-foreground">
                            {holders} holder{holders === 1 ? '' : 's'}
                          </span>
                        )}
                        {/* Every role is deletable except Final Authority — DPP:
                            it is the terminal approver of last resort, and the
                            resolver falls back to it when a chain would be empty. */}
                        {canManage && key !== 'FINAL_AUTHORITY' && (
                          <>
                            <button
                              type="button"
                              onClick={() => { setRoleEdit({ id: key, label: roleName(key), description: roleDescriptions[key] ?? desc }); setRoleEditDraft({ label: roleName(key), description: roleDescriptions[key] ?? desc }) }}
                              className="inline-flex h-6 w-6 items-center justify-center rounded-lg border border-border text-foreground hover:bg-card transition"
                              aria-label={`Edit ${roleName(key)}`}
                            >
                              <Pencil className="w-3 h-3" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setRoleDelete(key)}
                              className="inline-flex h-6 w-6 items-center justify-center rounded-lg border border-border text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950 transition"
                              aria-label={`Delete ${roleName(key)}`}
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </>
                        )}
                      </div>
                      <p className="text-[11px] text-muted-foreground leading-relaxed">{desc || 'No description — permissions are set in the matrix and capped by the granular access codes.'}</p>
                      <p className="text-[10px] text-muted-foreground/70 mt-1 font-mono">{key}</p>
                    </div>
                  )
                })}
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
                  {employees.filter((e) => (rolesOf(e.id) ?? []).length > 0).map((e) => (
                    <div key={e.id} className="flex items-center gap-3 rounded-xl border border-border bg-warm dark:bg-muted/30 px-3 py-2">
                      <Avatar id={e.id} size="sm" />
                      <div className="min-w-0 flex-1">
                        <p className="text-[12px] font-semibold text-foreground truncate">{e.name}</p>
                        <p className="text-[10px] text-muted-foreground truncate">{(rolesOf(e.id) ?? []).map((r) => roleName(r)).join(', ')}</p>
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
        title="Add employee"
        subtitle="Creates a login, employee record and approval roles."
        size="lg"
        footer={
          <div className="flex items-center gap-2">
            <Btn variant="ghost" onClick={() => setRegOpen(false)} disabled={regBusy}>Cancel</Btn>
            <Btn onClick={saveRegister} disabled={!canRegister || regBusy}>
              <Save className="w-3.5 h-3.5" /> {regBusy ? 'Adding…' : 'Add employee'}
            </Btn>
          </div>
        }
      >
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            <TextInput label="Full name" value={regDraft.full_name} onChange={(e) => setRegDraft({ ...regDraft, full_name: e.target.value })} placeholder="e.g. Amina Yusuf Mwinyi" />
            <TextInput label="Payroll no." value={regDraft.payroll_no} onChange={(e) => setRegDraft({ ...regDraft, payroll_no: e.target.value })} placeholder="DPP-1013" />
            <TextInput label="Work email" type="email" value={regDraft.email} onChange={(e) => setRegDraft({ ...regDraft, email: e.target.value })} placeholder="name@dpp.go.tz" />
            <TextInput label="Username (login)" value={regDraft.username} onChange={(e) => setRegDraft({ ...regDraft, username: e.target.value })} placeholder="unique username" />
            <SelectInput label="Gender" value={regDraft.gender} onChange={(e) => setRegDraft({ ...regDraft, gender: e.target.value as 'M' | 'F' })}>
              <option value="M">Male</option>
              <option value="F">Female</option>
            </SelectInput>
            <MultiSelect
              label="Approval roles"
              hint="Blank inherits the position's defaults. Choosing a position auto-inherits its default roles."
              placeholder="Select approval roles…"
              options={allRoleIds.map((r) => ({ value: r, label: roleName(r) }))}
              value={regDraft.role_ids}
              onChange={(next) => setRegDraft((d) => ({ ...d, role_ids: next }))}
            />
          </div>

          {/* Placement — zone → department → division → unit → position */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
            <SelectInput label="Zone" value={regDraft.zone_id} onChange={(e) => {
              const zoneId = e.target.value
              setRegDraft((d) => {
                const zoneDepts = allDepts.filter((x) => x.zoneId === zoneId)
                const deptId = (zoneDepts.find((x) => !x.parentId) ?? zoneDepts[0])?.id ?? ''
                const divisionId = zoneDepts.find((x) => x.parentId === deptId)?.id ?? ''
                const unitId = zoneDepts.find((x) => x.parentId === divisionId)?.id ?? ''
                const path = new Set([deptId, divisionId, unitId].filter(Boolean))
                const pos = positionOptions.find((p) => !p.department_id || path.has(p.department_id))
                return { ...d, zone_id: zoneId, department_id: deptId, division_id: divisionId, unit_id: unitId, position_id: pos?.id ?? d.position_id }
              })
            }}>
              {allZones.map((z) => (
                <option key={z.id} value={z.id}>{z.name}</option>
              ))}
            </SelectInput>
            <SelectInput label="Department" value={regDraft.department_id} onChange={(e) => {
              const deptId = e.target.value
              setRegDraft((d) => {
                const divisionId = allDepts.find((x) => x.parentId === deptId)?.id ?? ''
                const unitId = allDepts.find((x) => x.parentId === divisionId)?.id ?? ''
                const path = new Set([deptId, divisionId, unitId].filter(Boolean))
                const pos = positionOptions.find((p) => !p.department_id || path.has(p.department_id))
                return { ...d, department_id: deptId, division_id: divisionId, unit_id: unitId, position_id: pos?.id ?? d.position_id }
              })
            }}>
              <option value="">— select —</option>
              {regDepartments.map((d) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </SelectInput>
            <SelectInput label="Division" value={regDraft.division_id} onChange={(e) => {
              const divisionId = e.target.value
              setRegDraft((d) => {
                const unitId = allDepts.find((x) => x.parentId === divisionId)?.id ?? ''
                return { ...d, division_id: divisionId, unit_id: unitId }
              })
            }}>
              <option value="">— none —</option>
              {regDivisions.map((d) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </SelectInput>
            <SelectInput label="Unit" value={regDraft.unit_id} onChange={(e) => setRegDraft({ ...regDraft, unit_id: e.target.value })}>
              <option value="">— none —</option>
              {regUnits.map((d) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </SelectInput>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            <SelectInput label="Position" value={regDraft.position_id} onChange={(e) => {
              const posId = e.target.value
              const pos = positionOptions.find((p) => p.id === posId)
              const inherited = pos?.default_roles ?? []
              setRegDraft((d) => ({ ...d, position_id: posId, role_ids: inherited.length ? [...new Set([...inherited, ...d.role_ids])] : d.role_ids }))
            }}>
              <option value="">— select —</option>
              {regPositions.map((p) => (
                <option key={p.id} value={p.id}>{p.title}</option>
              ))}
            </SelectInput>
            <TextInput label="Hire date" type="date" value={regDraft.hire_date} onChange={(e) => setRegDraft({ ...regDraft, hire_date: e.target.value })} />
          </div>

          {/* Password last — presets satisfy the backend password rule. */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            <div className="space-y-2">
              <SelectInput
                label="Initial password"
                hint="8+ characters with uppercase, lowercase and a number."
                value={regDraft.passwordCustom ? 'custom' : regDraft.password}
                onChange={(e) => {
                  const value = e.target.value
                  if (value === 'custom') setRegDraft({ ...regDraft, passwordCustom: true, password: '' })
                  else setRegDraft({ ...regDraft, passwordCustom: false, password: value })
                }}
              >
                {PASSWORD_PRESETS.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
                <option value="custom">Custom password…</option>
              </SelectInput>
              {regDraft.passwordCustom && (
                <TextInput
                  label="Custom password"
                  type="password"
                  value={regDraft.password}
                  onChange={(e) => setRegDraft({ ...regDraft, password: e.target.value })}
                  placeholder="Enter a password"
                  autoComplete="new-password"
                />
              )}
              {regDraft.password && !passwordIsValid(regDraft.password) && (
                <p className="text-[11px] text-rose-600">
                  Use at least 8 characters with an uppercase letter, a lowercase letter and a number.
                </p>
              )}
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
            {/* customRoleAssignments is derived from roleIds (the non-system subset),
                so merging the two without de-duplicating renders every custom role
                twice and trips React's unique-key warning. */}
            {([...new Set([...(viewTarget.roleIds ?? []), ...(customRoleAssignments[viewTarget.id] ?? [])])]).length > 0 && (
              <div className="rounded-xl border border-border p-3.5">
                <p className="text-[11px] text-muted-foreground uppercase tracking-wide font-semibold mb-1.5">Approval roles</p>
                <div className="flex flex-wrap gap-1.5">
                  {[...new Set([...(viewTarget.roleIds ?? []), ...(customRoleAssignments[viewTarget.id] ?? [])])].map((r) => (
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
          <MultiSelect
            label="Approval roles"
            hint="Unconditional roles are replaced on save; department/zone scoped heads are managed separately."
            placeholder="Select approval roles…"
            options={allRoleIds.map((r) => ({ value: r, label: roleName(r) }))}
            value={editDraft.roleIds}
            onChange={(next) => setEditDraft((d) => ({ ...d, roleIds: next }))}
          />
          <p className="text-[10px] text-muted-foreground">Full name is managed by HR records; the position drives the job title shown across the system.</p>
        </div>
      </Modal>

      <Modal
        open={zoneOpen}
        onClose={() => { setZoneEditId(null); setZoneOpen(false) }}
        title={zoneEditId ? `Edit zone — ${zoneName(zoneEditId)}` : 'Add administrative zone'}
        subtitle="Zones appear across the system; staff assigned to them see only their own zone."
        size="md"
        footer={
          <Btn onClick={saveZone} disabled={!zoneDraft.name.trim() || !zoneDraft.short.trim()}>
            <Save className="w-3.5 h-3.5" /> {zoneEditId ? 'Save changes' : 'Create zone'}
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
        onClose={() => { setDeptEditId(null); setDeptOpen(false) }}
        title={deptEditId ? `Edit department — ${deptDraft.name}` : 'Add department'}
        subtitle="Operational units are attached to an administrative zone."
        size="md"
        footer={
          <Btn onClick={saveDept} disabled={!deptDraft.name.trim()}>
            <Save className="w-3.5 h-3.5" /> {deptEditId ? 'Save changes' : 'Create department'}
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

      <Modal open={divOpen} onClose={() => { setDivEditId(null); setDivOpen(false) }} title={divEditId ? `Edit division — ${divDraft.name}` : 'Add division'} subtitle="Sub-department based on a parent department." size="md" footer={<Btn onClick={saveDiv} disabled={!divDraft.name.trim()}><Save className="w-3.5 h-3.5" /> {divEditId ? 'Save changes' : 'Create division'}</Btn>}>
        <div className="space-y-4">
          <TextInput label="Division name" value={divDraft.name} onChange={(e) => setDivDraft({ ...divDraft, name: e.target.value })} placeholder="e.g. Appeals Division" />
          <SelectInput label="Parent department" value={divDraft.parent_department_id || ''} onChange={(e) => setDivDraft({ ...divDraft, parent_department_id: e.target.value || null })}>
            <option value="">— root / none —</option>
            {allDepts.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
          </SelectInput>
          <SelectInput label="Zone" value={divDraft.zone_id} onChange={(e) => setDivDraft({ ...divDraft, zone_id: e.target.value })}>
            {allZones.map((z) => <option key={z.id} value={z.id}>{z.name}</option>)}
          </SelectInput>
          <div className="flex items-center gap-2"><input type="checkbox" checked={divDraft.reports_directly_to_leadership} onChange={(e) => setDivDraft({ ...divDraft, reports_directly_to_leadership: e.target.checked })} className="accent-teal-700" /><span className="text-[12px]">Reports directly to leadership</span></div>
        </div>
      </Modal>

      <Modal open={unitOpen} onClose={() => { setUnitEditId(null); setUnitOpen(false) }} title={unitEditId ? `Edit unit — ${unitDraft.name}` : 'Add unit'} subtitle="Sub-division based on a parent division or department." size="md" footer={<Btn onClick={saveUnit} disabled={!unitDraft.name.trim()}><Save className="w-3.5 h-3.5" /> {unitEditId ? 'Save changes' : 'Create unit'}</Btn>}>
        <div className="space-y-4">
          <TextInput label="Unit name" value={unitDraft.name} onChange={(e) => setUnitDraft({ ...unitDraft, name: e.target.value })} placeholder="e.g. Legal Research Unit" />
          <SelectInput label="Parent division/department" value={unitDraft.parent_department_id || ''} onChange={(e) => setUnitDraft({ ...unitDraft, parent_department_id: e.target.value || null })}>
            <option value="">— root / none —</option>
            {allDepts.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
          </SelectInput>
          <SelectInput label="Zone" value={unitDraft.zone_id} onChange={(e) => setUnitDraft({ ...unitDraft, zone_id: e.target.value })}>
            {allZones.map((z) => <option key={z.id} value={z.id}>{z.name}</option>)}
          </SelectInput>
          <div className="flex items-center gap-2"><input type="checkbox" checked={unitDraft.reports_directly_to_leadership} onChange={(e) => setUnitDraft({ ...unitDraft, reports_directly_to_leadership: e.target.checked })} className="accent-teal-700" /><span className="text-[12px]">Reports directly to leadership</span></div>
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

      <ConfirmModal open={divDelete !== null} onClose={() => setDivDelete(null)} title="Delete this division?" confirmLabel="Delete division" tone="danger" message={<p>Remove <span className="font-semibold text-foreground">{divDelete ? divisions.find((d) => d.id === divDelete)?.name : ''}</span> from the directory. The action is audited.</p>} onConfirm={() => { if (divDelete) { void leaveApi.org.deleteDivision(divDelete).then(() => { try { leaveApi.org.divisions().then((r) => setDivisions(r.data)) } catch {} }) }; setDivDelete(null) }} />

      <ConfirmModal open={unitDelete !== null} onClose={() => setUnitDelete(null)} title="Delete this unit?" confirmLabel="Delete unit" tone="danger" message={<p>Remove <span className="font-semibold text-foreground">{unitDelete ? units.find((d) => d.id === unitDelete)?.name : ''}</span> from the directory. The action is audited.</p>} onConfirm={() => { if (unitDelete) { void leaveApi.org.deleteUnit(unitDelete).then(() => { try { leaveApi.org.units().then((r) => setUnits(r.data)) } catch {} }) }; setUnitDelete(null) }} />

      <ConfirmModal
        open={roleDelete !== null}
        onClose={() => setRoleDelete(null)}
        title="Archive this approval role?"
        confirmLabel="Archive role"
        tone="danger"
        message={
          <p>
            <span className="font-semibold text-foreground">{roleDelete ? roleName(roleDelete) : ''}</span> will stop granting anything — holders keep the reference for history but lose its permissions immediately. If an approval workflow still routes steps through this role, you will be asked which role should take them over first. The action is audited and can be reversed by an administrator.
          </p>
        }
        onConfirm={() => {
          if (!roleDelete) return
          const target = roleDelete
          void deleteRole(target).then((res) => {
            // 'blocked' = live workflow steps still point at this role. Offer to
            // hand those steps to another role rather than leaving a dead end.
            if (res === 'blocked') {
              setRoleReassign({ id: target, steps: 0 })
              setRoleReassignTarget('FINAL_AUTHORITY')
            }
          })
          setRoleDelete(null)
        }}
      />

      <Modal
        open={roleReassign !== null}
        onClose={() => setRoleReassign(null)}
        title="Hand over this role's approval steps"
        size="md"
      >
        <p className="text-sm text-muted-foreground leading-relaxed">
          <span className="font-semibold text-foreground">{roleReassign ? roleName(roleReassign.id) : ''}</span> is
          still required by an approval workflow. Pick the role that should take over those steps — then this role can be archived.
        </p>
        <div className="mt-4">
          <SelectInput
            label="Route its steps to"
            value={roleReassignTarget}
            onChange={(e) => setRoleReassignTarget(e.target.value)}
          >
            {Object.keys(rolePermissions)
              .filter((r) => r !== roleReassign?.id)
              .map((r) => (
                <option key={r} value={r}>{roleName(r)}</option>
              ))}
          </SelectInput>
        </div>
        <div className="flex items-center justify-end gap-2 mt-6">
          <Btn variant="ghost" onClick={() => setRoleReassign(null)}>Cancel</Btn>
          <Btn
            onClick={() => {
              if (!roleReassign) return
              const { id } = roleReassign
              const to = roleReassignTarget
              setRoleReassign(null)
              void deleteRole(id, to)
            }}
          >
            Reassign &amp; archive
          </Btn>
        </div>
      </Modal>

      <ConfirmModal
        open={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        title="Delete this staff member?"
        confirmLabel="Delete permanently"
        tone="danger"
        message={
          <p>
            Permanently remove <span className="font-semibold text-foreground">{deleteTarget?.name}</span> — their login, employee record, approval roles and reporting line. Staff who are a department/zone head, or who have leave history, are refused for data integrity. This cannot be undone. The action is audited.
          </p>
        }
        onConfirm={() => {
          if (deleteTarget) void deleteEmployee(deleteTarget.id)
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