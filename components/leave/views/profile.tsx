'use client'

import * as React from 'react'
import { KeyRound, Save, UserCog } from 'lucide-react'
import { toast } from 'sonner'
import { getDept, getZone } from '@/lib/leave'
import { ApiError } from '@/lib/leave-api'
import { useAuth } from '@/lib/auth'
import { useLeave } from '@/components/leave/leave-context'
import { Btn, Panel, SectionHeading, TextInput } from '@/components/leave/shared'

function DetailCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-card px-3 py-2">
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">{label}</p>
      <p className="text-[12.5px] font-medium text-foreground truncate">{value}</p>
    </div>
  )
}

export function ProfileView() {
  const { user, updateProfile } = useAuth()
  const { employee } = useLeave()

  const [busy, setBusy] = React.useState(false)
  const [emailDraft, setEmailDraft] = React.useState('')
  const [payrollDraft, setPayrollDraft] = React.useState('')
  const [curPw, setCurPw] = React.useState('')
  const [newPw, setNewPw] = React.useState('')
  const [confirmPw, setConfirmPw] = React.useState('')

  React.useEffect(() => {
    setEmailDraft(user?.email ?? employee.email)
    setPayrollDraft(user?.employee?.payroll_no ?? '')
    setCurPw('')
    setNewPw('')
    setConfirmPw('')
    setBusy(false)
  }, [user?.email, user?.employee?.payroll_no, employee.email])

  const saveDetails = async () => {
    setBusy(true)
    try {
      await updateProfile({ email: emailDraft.trim(), payrollNo: payrollDraft.trim() })
      toast.success('Profile details updated.')
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Could not save details.')
    } finally {
      setBusy(false)
    }
  }

  const savePassword = async () => {
    if (!curPw) return toast.error('Enter your current password.')
    if (newPw.length < 8) return toast.error('New password must be at least 8 characters.')
    if (newPw !== confirmPw) return toast.error('New password confirmation does not match.')
    setBusy(true)
    try {
      await updateProfile({ currentPassword: curPw, newPassword: newPw })
      toast.success('Password changed.')
      setCurPw('')
      setNewPw('')
      setConfirmPw('')
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Could not change password.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mx-auto max-w-[960px] px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      <SectionHeading
        title="My profile"
        subtitle="Your account details — self-service changes are written to the audit trail."
      />

      <div className="flex items-center gap-4 rounded-xl border border-border bg-secondary/40 p-4">
        <div className="h-14 w-14 rounded-full bg-gradient-to-br from-teal-600 to-cyan-600 grid place-items-center text-white text-[18px] font-bold flex-shrink-0">
          {employee.initials}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-foreground truncate">{employee.name}</p>
          <p className="text-[12px] text-muted-foreground truncate">{employee.title}</p>
          <p className="text-[11px] text-muted-foreground truncate">
            {user?.email ?? employee.email} · {user?.employee?.payroll_no || 'no payroll no.'}
          </p>
        </div>
        <UserCog className="w-5 h-5 text-teal-700 flex-shrink-0" />
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <DetailCell label="Department" value={getDept(employee.departmentId).name} />
        <DetailCell label="Zone" value={getZone(employee.zoneId).name} />
        <DetailCell label="Hired" value={employee.hireDate ? employee.hireDate.slice(0, 10) : '—'} />
        <DetailCell label="Gender" value={employee.gender === 'M' ? 'Male' : 'Female'} />
      </div>

      <Panel title="Update details" subtitle="Work email and payroll number are maintained here.">
        <div className="space-y-3.5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            <TextInput
              label="Work email"
              type="email"
              value={emailDraft}
              onChange={(e) => setEmailDraft(e.target.value)}
              placeholder="name@dpp.go.tz"
            />
            <TextInput
              label="Payroll no."
              value={payrollDraft}
              onChange={(e) => setPayrollDraft(e.target.value)}
              placeholder="DPP-1001"
            />
          </div>
          <div className="flex items-center gap-2">
            <Btn onClick={saveDetails} disabled={busy}>
              <Save className="w-3.5 h-3.5" /> Save details
            </Btn>
            <span className="text-[10px] text-muted-foreground">Name, position, department and zone are managed by HR.</span>
          </div>
        </div>
      </Panel>

      <Panel title="Change password" subtitle="Enter your current password, then a new one of at least 8 characters.">
        <div className="space-y-3.5">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
            <TextInput label="Current password" type="password" value={curPw} onChange={(e) => setCurPw(e.target.value)} autoComplete="current-password" />
            <TextInput label="New password" type="password" value={newPw} onChange={(e) => setNewPw(e.target.value)} autoComplete="new-password" placeholder="Min. 8 characters" />
            <TextInput label="Confirm new password" type="password" value={confirmPw} onChange={(e) => setConfirmPw(e.target.value)} autoComplete="new-password" />
          </div>
          <Btn onClick={savePassword} disabled={busy}>
            <KeyRound className="w-3.5 h-3.5" /> Update password
          </Btn>
        </div>
      </Panel>
    </div>
  )
}