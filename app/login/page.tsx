import type { Metadata } from 'next'
import { AuthProvider } from '@/lib/auth'
import { LoginPage } from '@/components/auth/login-page'

export const metadata: Metadata = {
  title: 'Sign in — Mfumo wa Likizo (DPP Zanzibar)',
}

export default function LoginRoute() {
  return (
    <AuthProvider>
      <LoginPage />
    </AuthProvider>
  )
}