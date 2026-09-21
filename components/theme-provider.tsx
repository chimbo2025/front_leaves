'use client'

import * as React from 'react'

type Theme = 'light' | 'dark'

const THEME_KEY = 'lms-theme'

interface ThemeContextValue {
  theme: Theme
  resolvedTheme: Theme
  setTheme: (theme: Theme) => void
}

const ThemeContext = React.createContext<ThemeContextValue | null>(null)

function applyTheme(theme: Theme) {
  document.documentElement.classList.toggle('dark', theme === 'dark')
}

function readStoredTheme(): Theme | null {
  try {
    const value = window.localStorage.getItem(THEME_KEY)
    return value === 'light' || value === 'dark' ? value : null
  } catch {
    return null
  }
}

export function ThemeProvider({
  children,
  defaultTheme = 'light',
}: {
  children: React.ReactNode
  defaultTheme?: Theme
}) {
  const [theme, setThemeState] = React.useState<Theme>(defaultTheme)

  React.useLayoutEffect(() => {
    const stored = readStoredTheme()
    const prefersDark =
      !stored &&
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-color-scheme: dark)').matches
    const initial: Theme = stored ?? (prefersDark ? 'dark' : defaultTheme)
    setThemeState(initial)
    applyTheme(initial)
  }, [defaultTheme])

  const setTheme = React.useCallback((next: Theme) => {
    setThemeState(next)
    applyTheme(next)
    try {
      window.localStorage.setItem(THEME_KEY, next)
    } catch {
      // ignore storage failures
    }
  }, [])

  const value = React.useMemo(
    () => ({ theme, resolvedTheme: theme, setTheme }),
    [theme, setTheme],
  )

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useThemeApp() {
  const ctx = React.useContext(ThemeContext)
  if (!ctx) {
    throw new Error('useThemeApp must be used within a ThemeProvider')
  }
  return ctx
}