import type { Metadata } from "next"
import NextTopLoader from "nextjs-toploader"
import { Toaster } from "@/components/ui/sonner"
import { teodor, inter } from "./fonts"
import { Providers } from "./providers"
import "./globals.css"
import { cn } from "@/lib/utils"

export const metadata: Metadata = {
  title: "AgentFlow | CRM & Operations",
  description: "Client workflow and operations management",
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
          teodor.variable,
          inter.variable
        )}
      >
        <NextTopLoader
          color="oklch(0.78 0.16 195)"
          showSpinner={false}
          height={3}
        />
        <Providers>{children}</Providers>
        <Toaster position="top-right" duration={2000} richColors />
      </body>
    </html>
  )
}
