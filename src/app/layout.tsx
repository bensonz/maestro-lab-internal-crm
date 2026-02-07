import type { Metadata } from 'next'
import NextTopLoader from 'nextjs-toploader'
import { Toaster } from '@/components/ui/sonner'
import { inter, jetbrainsMono } from './fonts'
import { Providers } from './providers'
import './globals.css'
import { cn } from '@/lib/utils'

export const metadata: Metadata = {
  title: 'Maestro L.A.B | CRM & Operations',
  description:
    'Maestro L.A.B internal client workflow and operations management',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body
        className={cn(
          'min-h-svh bg-background font-inter antialiased',
          inter.variable,
          jetbrainsMono.variable,
        )}
      >
        <NextTopLoader
          color="hsl(217, 91%, 60%)"
          showSpinner={false}
          height={3}
        />
        <Providers>{children}</Providers>
        <Toaster position="top-right" duration={2000} richColors />
      </body>
    </html>
  )
}
