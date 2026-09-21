'use client'

import * as React from 'react'
import { leaveApi, setApiToken, type AuthUser } from '@/lib/leave-api'

const STORAGE_KEY = 'lms_auth'

interface StoredAuth {
  token: string
  user: AuthUser
}

interface AuthContextValue {
  user: AuthUser | null
  token: string | null
  status: 'loading' | 'authenticated' | 'guest'
  login: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
  updateProfile: (input: { email?: string; payrollNo?: string; currentPassword?: string; newPassword?: string }) => Promise<AuthUser>
}

const AuthContext = React.createContext<AuthContextValue | null>(null)

function readStored(): StoredAuth | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as StoredAuth
    if (parsed && typeof parsed.token === 'string' && parsed.user) return parsed
    return null
  } catch {
    return null
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [stored, setStored] = React.useState<StoredAuth | null>(() => {
    const s = readStored()
    if (s) setApiToken(s.token)
    return s
  })
  const [user, setUser] = React.useState<AuthUser | null>(stored?.user ?? null)
  const [status, setStatus] = React.useState<'loading' | 'authenticated' | 'guest'>(
    stored ? 'loading' : 'guest',
  )

  React.useEffect(() => {
    if (!stored?.token) return
    let cancelled = false
    leaveApi.auth
      .me()
      .then(({ user: fresh }) => {
        if (cancelled) return
        setUser(fresh)
        setStored((prev) => (prev ? { ...prev, user: fresh } : prev))
        try {
          window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ token: stored.token, user: fresh }))
        } catch {
          /* ignore */
        }
        setStatus('authenticated')
      })
      .catch(() => {
        if (cancelled) return
        setApiToken(null)
        setUser(null)
        setStored(null)
        try {
          window.localStorage.removeItem(STORAGE_KEY)
        } catch {
          /* ignore */
        }
        setStatus('guest')
      })
    return () => {
      cancelled = true
    }
  }, [stored?.token])

  const login = React.useCallback(async (email: string, password: string) => {
    const res = await leaveApi.auth.login(email, password)
    setApiToken(res.token)
    setUser(res.user)
    setStored({ token: res.token, user: res.user })
    setStatus('authenticated')
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ token: res.token, user: res.user }))
    } catch {
      /* ignore */
    }
  }, [])

  const logout = React.useCallback(async () => {
    try {
      await leaveApi.auth.logout()
    } catch {
      /* token may already be invalid — still clear locally */
    }
    setApiToken(null)
    setUser(null)
    setStored(null)
    setStatus('guest')
    try {
      window.localStorage.removeItem(STORAGE_KEY)
    } catch {
      /* ignore */
    }
  }, [])

  const updateProfile = React.useCallback(
    async (input: { email?: string; payrollNo?: string; currentPassword?: string; newPassword?: string }) => {
      const res = await leaveApi.auth.updateMe({
        email: input.email ?? null,
        payroll_no: input.payrollNo ?? null,
        current_password: input.currentPassword,
        new_password: input.newPassword,
      })
      setUser(res.user)
      setStored((prev) => (prev ? { ...prev, user: res.user } : prev))
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ token: stored?.token, user: res.user }))
      } catch {
        /* ignore */
      }
      return res.user
    },
    [stored?.token],
  )

  const value = React.useMemo<AuthContextValue>(
    () => ({ user, token: stored?.token ?? null, status, login, logout, updateProfile }),
    [user, stored, status, login, logout, updateProfile],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const ctx = React.useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}