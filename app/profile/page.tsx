'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { AuthProvider, useAuth } from '@/lib/auth'
import { LeaveProvider } from '@/components/leave/leave-context'
import { LeaveSidebar } from '@/components/leave/leave-sidebar'
import { LeaveHeader } from '@/components/leave/leave-header'
import { ProfileView } from '@/components/leave/views/profile'

function ProfileApp() {
  const router = useRouter()
  const { status } = useAuth()

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

  const navigate = () => router.push('/')

  return (
    <LeaveProvider>
      <div className="flex h-screen overflow-hidden bg-background">
        <LeaveSidebar activeView="profile" onNavigate={navigate} />
        <div className="flex-1 flex flex-col overflow-hidden min-w-0">
          <LeaveHeader onNavigate={navigate} />
          <main className="flex-1 overflow-y-auto">
            <ProfileView />
          </main>
        </div>
      </div>
    </LeaveProvider>
  )
}

export default function ProfilePage() {
  return (
    <AuthProvider>
      <ProfileApp />
    </AuthProvider>
  )
}