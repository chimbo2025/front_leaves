'use client'

import { Moon, Sun } from 'lucide-react'
import { useThemeApp } from '@/components/theme-provider'
import { cn } from '@/lib/utils'

export function ThemeToggle({ className }: { className?: string }) {
  const { resolvedTheme, setTheme } = useThemeApp()
  const isDark = resolvedTheme === 'dark'

  return (
    <button
      type="button"
      aria-label="Toggle dark and light mode"
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      className={cn(
        'inline-flex items-center justify-center rounded-full border-border transition-colors duration-200',
        'h-9 w-9 border bg-card text-foreground hover:bg-accent hover:text-accent-foreground',
        className,
      )}
    >
      {isDark ? (
        <Sun className="h-4 w-4 text-amber-400" />
      ) : (
        <Moon className="h-4 w-4 text-teal-700 dark:text-teal-300" />
      )}
    </button>
  )
}