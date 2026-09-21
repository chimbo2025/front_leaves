'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { AuthProvider, useAuth } from '@/lib/auth'
import { LeaveProvider } from '@/components/leave/leave-context'
import { LeaveSidebar } from '@/components/leave/leave-sidebar'
import { LeaveHeader } from '@/components/leave/leave-header'
import { DashboardView } from '@/components/leave/views/dashboard'
import { MyLeaveView } from '@/components/leave/views/myleave'
import { RequestsView } from '@/components/leave/views/requests'
import { ApprovalsView } from '@/components/leave/views/approvals'
import { WorkflowsView } from '@/components/leave/views/workflows'
import { CalendarView } from '@/components/leave/views/calendar'
import { PoliciesView } from '@/components/leave/views/policies'
import { DocumentsView } from '@/components/leave/views/documents'
import { DelegationsView } from '@/components/leave/views/delegations'
import { CasesView } from '@/components/leave/views/cases'
import { NotificationsView } from '@/components/leave/views/notifications'
import { ReportsView } from '@/components/leave/views/reports'
import { AuditView } from '@/components/leave/views/audit'
import { SettingsView } from '@/components/leave/views/settings'

type View =
  | 'dashboard'
  | 'myleave'
  | 'requests'
  | 'approvals'
  | 'calendar'
  | 'policies'
  | 'workflows'
  | 'documents'
  | 'delegations'
  | 'cases'
  | 'notifications'
  | 'reports'
  | 'audit'
  | 'settings'

function ViewRenderer({ view, onNavigate }: { view: View; onNavigate: (v: string) => void }) {
  switch (view) {
    case 'dashboard': return <DashboardView onNavigate={onNavigate} />
    case 'myleave': return <MyLeaveView />
    case 'requests': return <RequestsView />
    case 'approvals': return <ApprovalsView onNavigate={onNavigate} />
    case 'workflows': return <WorkflowsView onNavigate={onNavigate} />
    case 'calendar': return <CalendarView />
    case 'policies': return <PoliciesView />
    case 'documents': return <DocumentsView />
    case 'delegations': return <DelegationsView />
    case 'cases': return <CasesView />
    case 'notifications': return <NotificationsView />
    case 'reports': return <ReportsView />
    case 'audit': return <AuditView />
    case 'settings': return <SettingsView />
    default: return <DashboardView onNavigate={onNavigate} />
  }
}

function LeaveApp() {
  const [activeView, setActiveView] = useState<View>('dashboard')
  const navigate = (v: string) => setActiveView(v as View)

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <LeaveSidebar activeView={activeView} onNavigate={navigate} />
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        <LeaveHeader onNavigate={navigate} />
        <main className="flex-1 overflow-y-auto">
          <ViewRenderer view={activeView} onNavigate={navigate} />
        </main>
      </div>
    </div>
  )
}

export default function LeaveManagementApp() {
  return (
    <AuthProvider>
      <Gate />
    </AuthProvider>
  )
}

function Gate() {
  const { status } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (status === 'guest') router.replace('/login')
  }, [status, router])

  if (status !== 'authenticated') {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-3 bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-teal-600 border-t-transparent" />
        <p className="text-sm text-muted-foreground">Signing you in…</p>
      </div>
    )
  }

  return (
    <LeaveProvider>
      <LeaveApp />
    </LeaveProvider>
  )
}