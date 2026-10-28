'use client'

import * as React from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { Eye, EyeOff, Landmark, Lock, Mail, Loader2, ShieldCheck, Workflow } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ThemeToggle } from '@/components/leave/theme-toggle'
import { useAuth } from '@/lib/auth'
import { ApiError } from '@/lib/leave-api'

export function LoginPage() {
  const router = useRouter()
  const { status, login } = useAuth()

  const [identifier, setIdentifier] = React.useState('')
  const [password, setPassword] = React.useState('')
  const [showPassword, setShowPassword] = React.useState(false)
  const [submitting, setSubmitting] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    if (status === 'authenticated') router.replace('/')
  }, [status, router])

  if (status === 'authenticated') return null

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      await login(identifier.trim(), password)
      router.replace('/')
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to sign in. Is the backend running?')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center bg-[#eef1f6] px-4 py-10 dark:bg-neutral-950 sm:px-8">
      <div
        className="pointer-events-none absolute inset-0 opacity-80 dark:opacity-25"
        style={{
          backgroundImage:
            'linear-gradient(135deg, rgba(255,255,255,0.55) 25%, transparent 25%), linear-gradient(225deg, rgba(255,255,255,0.55) 25%, transparent 25%)',
          backgroundSize: '40px 40px',
        }}
      />

      <div className="relative z-10 grid w-full max-w-4xl overflow-hidden rounded-2xl border border-border bg-card shadow-2xl shadow-teal-950/10 lg:grid-cols-2">
        {/* Left — brand / info panel */}
        <div className="relative flex flex-col gap-5 bg-gradient-to-br from-teal-900 via-teal-800 to-teal-700 p-8 text-white sm:p-12 lg:min-h-[540px]">
          <div className="pointer-events-none absolute -right-20 -top-20 h-72 w-72 rounded-full bg-emerald-400/20 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-24 -left-16 h-72 w-72 rounded-full bg-cyan-400/20 blur-3xl" />

          <span className="inline-flex w-fit items-center gap-2 rounded-full border border-white/25 bg-white/10 px-4 py-1.5 text-[13px] font-semibold tracking-wide">
            <Landmark className="h-4 w-4" /> Official Government Portal
          </span>

          <div className="mt-3">
            <h1 className="text-[26px] font-bold leading-tight text-white">Afisi ya Mkurugenzi wa Mashtaka</h1>
            <h2 className="mt-1 text-xl font-semibold text-emerald-100">Zanzibar</h2>
            <div className="mt-4 h-[3px] w-12 rounded-full bg-white" />
          </div>

          <div className="mt-2 space-y-1">
            <p className="text-lg font-semibold text-white">Mfumo wa Likizo wa wafanyakazi</p>
            <p className="max-w-sm text-sm leading-relaxed text-teal-50/90">
              Karibu kwenye usimamizi wa likizo na kupata taarifa muhimu kwa urahisi.
            </p>
          </div>

          <ul className="mt-4 space-y-3.5">
            <li className="flex items-center gap-3 text-sm text-emerald-50">
              <Workflow className="h-[18px] w-[18px] shrink-0 text-emerald-300" /> Usimamizi wa likizo kwa njia ya kidijitali
            </li>
            <li className="flex items-center gap-3 text-sm text-emerald-50">
              <ShieldCheck className="h-[18px] w-[18px] shrink-0 text-emerald-300" /> Uwazi na usalama wa kumbukumbu
            </li>
            <li className="flex items-center gap-3 text-sm text-emerald-50">
              <Lock className="h-[18px] w-[18px] shrink-0 text-emerald-300" /> Likizo kwa wafanyakazi wote
            </li>
          </ul>
        </div>

        {/* Right — form */}
        <div className="relative flex flex-col items-center p-8 text-center sm:p-12">
          <div className="absolute right-5 top-5">
            <ThemeToggle />
          </div>

          <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-full border border-border bg-white shadow-sm">
            <Image
              src="/smz.png"
              alt="Serikali ya Mapinduzi ya Zanzibar"
              width={1080}
              height={621}
              priority
              className="h-auto w-3/4 object-contain"
            />
          </div>

          <p className="mt-4 text-xl font-bold text-teal-900 dark:text-teal-300">Serikali ya Mapinduzi ya Zanzibar</p>
          <p className="mt-1.5 text-base font-semibold text-foreground">Mfumo wa Likizo wa wafanyakazi</p>
          <div className="mt-3 h-[3px] w-11 rounded-full bg-teal-700" />
          <p className="mt-3 text-[13.5px] text-muted-foreground">Ingia kwenye mfumo kuomba na kusimamia likizo</p>

          <form onSubmit={onSubmit} className="mt-6 w-full max-w-sm space-y-4 text-left">
            <div className="space-y-2">
              <Label htmlFor="identifier">Barua pepe au jina la mtumiaji</Label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="identifier"
                  type="text"
                  autoComplete="username"
                  required
                  placeholder="you@dpp.go.tz au u8"
                  className="pl-9"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Nenosiri (password)</Label>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  placeholder="••••••••"
                  className="pl-9 pr-9"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button
                  type="button"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1.5 text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {error ? (
              <p className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
                {error}
              </p>
            ) : null}

            <Button type="submit" size="lg" className="w-full" disabled={submitting}>
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Inaingia…
                </>
              ) : (
                'Ingia'
              )}
            </Button>
          </form>
        </div>
      </div>

      <p className="relative z-10 mt-6 w-full max-w-4xl text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} Serikali ya Mapinduzi ya Zanzibar. Haki zote zimehifadhiwa na Afisi ya Mkurugenzi wa Mashtaka.
      </p>
    </div>
  )
}