import type { Metadata } from 'next'
import { Plus_Jakarta_Sans, Fraunces } from 'next/font/google'
import './globals.css'
import { ThemeProvider } from '@/components/theme-provider'
import { Toaster } from '@/components/ui/sonner'

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
})

const fraunces = Fraunces({
  subsets: ['latin'],
  variable: '--font-serif',
  weight: ['500', '600'],
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Mfumo wa Likizo — DPP Zanzibar',
  description:
    'Digital Leave Management and Approval System for the Office of the Director of Public Prosecutions, Zanzibar.',
  keywords: ['DPP', 'Zanzibar', 'Leave Management', 'Likizo', 'HR', 'Approval Workflow'],
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${plusJakarta.variable} ${fraunces.variable}`}
    >
      <body>
        <ThemeProvider>{children}
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  )
}