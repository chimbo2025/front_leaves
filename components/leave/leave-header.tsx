'use client'

import * as React from 'react'
import { Bell, ChevronDown, LogOut } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth'
import { useLeave } from '@/components/leave/leave-context'
import { ThemeToggle } from '@/components/leave/theme-toggle'

interface HeaderProps {
  onNavigate: (view: string) => void
}

export function LeaveHeader({ onNavigate }: HeaderProps) {
  const router = useRouter()
  const { logout } = useAuth()
  const { employee, employeeId, notifications } = useLeave()
  const unread = notifications.filter((n) => !n.read && n.userId === employeeId).length

  const goProfile = () => router.push('/profile')

  return (
    <header className="sticky top-0 z-30 backdrop-blur-xl bg-warm/80 dark:bg-background/80 border-b border-border print-hidden">
      <div className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8 h-[64px] flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="h-9 w-9 rounded-[12px] bg-teal-700 text-white grid place-items-center shadow-sm shadow-teal-700/20 flex-shrink-0">
            <span className="font-serif text-[18px] leading-none translate-y-[1px]">Z</span>
          </div>
          <div className="leading-tight min-w-0">
            <div className="font-serif font-semibold text-[17px] tracking-tight truncate text-foreground">
              Mfumo wa Likizo
            </div>
            <div className="text-[11px] tracking-[0.14em] uppercase text-muted-foreground font-medium -mt-[1px] truncate">
              Zanzibar • DPP • HR
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <button
            type="button"
            onClick={goProfile}
            className="md:hidden inline-flex items-center gap-1 rounded-full border border-border bg-card px-2 py-1.5 text-[12px] font-medium text-foreground hover:bg-accent transition"
            aria-label="My profile"
          >
            <span className="w-6 h-6 rounded-full bg-gradient-to-br from-teal-600 to-cyan-600 grid place-items-center text-white text-[10px]">
              {employee.initials}
            </span>
            <ChevronDown className="w-3 h-3 text-muted-foreground" />
          </button>

          <ThemeToggle />

          <button
            type="button"
            onClick={() => onNavigate('notifications')}
            className="relative inline-flex items-center justify-center h-9 w-9 rounded-full border border-border bg-card text-foreground hover:bg-accent transition"
            aria-label="Notifications"
          >
            <Bell className="w-4 h-4" />
            {unread > 0 && (
              <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-rose-500 text-white text-[9px] flex items-center justify-center font-bold">
                {unread}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={goProfile}
            className="hidden sm:grid h-9 w-9 rounded-full bg-gradient-to-br from-teal-600 to-cyan-600 place-items-center text-white text-[13px] font-semibold shadow-sm shadow-teal-700/20 hover:ring-2 hover:ring-teal-600/40 transition"
            aria-label="My profile"
            title="My profile"
          >
            {employee.initials}
          </button>

          <button
            type="button"
            onClick={() => void logout()}
            className="hidden sm:inline-flex items-center gap-1.5 h-9 rounded-full border border-border bg-card px-3 text-[12px] font-medium text-foreground hover:bg-accent transition"
            aria-label="Log out"
            title="Log out"
          >
            <LogOut className="w-3.5 h-3.5" />
            Sign out
          </button>
        </div>
      </div>
    </header>
  )
}