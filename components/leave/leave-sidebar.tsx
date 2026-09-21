'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard,
  CalendarClock,
  ClipboardCheck,
  CalendarDays,
  CalendarRange,
  ScrollText,
  FileText,
  Handshake,
  FolderKanban,
  Bell,
  BarChart3,
  History,
  Settings,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import { useLeave } from '@/components/leave/leave-context'

const NAV = [
  {
    section: 'Main',
    items: [
      { id: 'dashboard', label: 'Dashboard', sw: 'Dashibodi', icon: LayoutDashboard },
      { id: 'myleave', label: 'My Leave', sw: 'Likizo yangu', icon: CalendarRange },
      { id: 'requests', label: 'Leave Requests', sw: 'Maombi', icon: CalendarClock },
      { id: 'approvals', label: 'Approvals', sw: 'Idhini', icon: ClipboardCheck },
      { id: 'calendar', label: 'Leave Calendar', sw: 'Kalenda', icon: CalendarDays },
    ],
  },
  {
    section: 'HR & Policy',
    items: [
      { id: 'policies', label: 'Leave Policies', sw: 'Sera', icon: ScrollText },
      { id: 'workflows', label: 'Approval Workflows', sw: 'Michakato ya idhini', icon: ClipboardCheck },
      { id: 'documents', label: 'Documents', sw: 'Hati', icon: FileText },
      { id: 'delegations', label: 'Delegations', sw: 'Udhamini', icon: Handshake },
      { id: 'cases', label: 'Case Handovers', sw: 'Uhamishaji wa kesi', icon: FolderKanban },
    ],
  },
  {
    section: 'Oversight',
    items: [
      { id: 'notifications', label: 'Notifications', sw: 'Taarifa', icon: Bell },
      { id: 'reports', label: 'Reports', sw: 'Ripoti', icon: BarChart3 },
      { id: 'audit', label: 'Audit Trail', sw: 'Kumbukumbu', icon: History },
      { id: 'settings', label: 'Admin & Org', sw: 'Usimamizi', icon: Settings },
    ],
  },
]

interface SidebarProps {
  activeView: string
  onNavigate: (view: string) => void
}

export function LeaveSidebar({ activeView, onNavigate }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false)
  const { pendingApprovals, notifications, employeeId, supervisorMode } = useLeave()

  const myPending = pendingApprovals.filter(
    (r) => supervisorMode || r.steps.some((s) => s.status === 'pending' && s.assigneeId === employeeId),
  ).length
  const unread = notifications.filter((n) => !n.read && (n.userId === employeeId || supervisorMode)).length

  const badgeFor = (id: string) =>
    id === 'approvals' ? (supervisorMode ? pendingApprovals.length : myPending) : id === 'notifications' ? unread : 0

  return (
    <aside
      className={cn(
        'flex flex-col h-screen bg-sidebar border-r border-sidebar-border transition-all duration-300 ease-in-out relative z-20 print-hidden',
        collapsed ? 'w-[68px]' : 'w-[240px]',
      )}
    >
      <div className="flex items-center gap-3 px-4 py-4 border-b border-sidebar-border">
        <div className="h-8 w-8 rounded-[10px] bg-teal-700 text-white grid place-items-center flex-shrink-0 shadow-sm shadow-teal-700/20">
          <span className="font-serif text-[15px] leading-none">Z</span>
        </div>
        {!collapsed && (
          <div className="leading-tight">
            <p className="font-serif font-semibold text-sm text-sidebar-foreground leading-none">DPP Zanzibar</p>
            <p className="text-[10px] text-muted-foreground mt-0.5 tracking-[0.12em] uppercase">Leave System</p>
          </div>
        )}
      </div>

      <nav className="flex-1 overflow-y-auto py-3 space-y-1 px-2">
        {NAV.map((section) => (
          <div key={section.section} className="mb-4">
            {!collapsed && (
              <p className="text-[10px] font-semibold text-muted-foreground px-2 mb-2 tracking-widest">
                {section.section}
              </p>
            )}
            {section.items.map((item) => {
              const Icon = item.icon
              const isActive = activeView === item.id
              const badge = badgeFor(item.id)
              return (
                <button
                  key={item.id}
                  onClick={() => onNavigate(item.id)}
                  className={cn(
                    'w-full flex items-center gap-3 px-2 py-2 rounded-md text-sm font-medium transition-colors duration-150 group relative',
                    isActive
                      ? 'bg-teal-700/10 text-teal-800 dark:text-teal-300'
                      : 'text-sidebar-foreground hover:bg-sidebar-accent',
                    collapsed && 'justify-center',
                  )}
                  title={collapsed ? item.label : undefined}
                >
                  <Icon
                    className={cn('w-4 h-4 flex-shrink-0', isActive ? 'text-teal-700 dark:text-teal-300' : 'text-muted-foreground group-hover:text-sidebar-foreground')}
                  />
                  {!collapsed && (
                    <>
                      <span className="flex-1 text-left leading-tight">
                        {item.label}
                        <span className="block text-[10px] text-muted-foreground font-normal">{item.sw}</span>
                      </span>
                      {badge > 0 && (
                        <span className="min-w-5 h-5 px-1.5 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center">
                          {badge}
                        </span>
                      )}
                    </>
                  )}
                  {collapsed && badge > 0 && (
                    <span className="absolute translate-x-4 -translate-y-3 min-w-4 h-4 px-1 rounded-full bg-rose-500 text-white text-[9px] font-bold flex items-center justify-center">
                      {badge}
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        ))}
      </nav>

      <div className="border-t border-sidebar-border p-3">
        {!collapsed ? (
          <div className="rounded-xl border border-border bg-card p-3">
            <div className="flex items-center gap-2 mb-2">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <p className="text-[11px] text-muted-foreground">Least-privilege access active</p>
            </div>
            <p className="text-[10px] leading-relaxed text-muted-foreground">
              Regional staff only see requests within their assigned zone unless central permission is granted.
            </p>
          </div>
        ) : (
          <div className="flex justify-center">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
          </div>
        )}
      </div>

      <button
        onClick={() => setCollapsed(!collapsed)}
        className="absolute -right-3 top-20 w-6 h-6 rounded-full bg-card border border-border flex items-center justify-center hover:bg-accent transition-colors z-30 shadow-sm"
        aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        {collapsed ? <ChevronRight className="w-3 h-3" /> : <ChevronLeft className="w-3 h-3" />}
      </button>
    </aside>
  )
}