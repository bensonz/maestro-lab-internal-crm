import type { Metadata } from "next"
import NextTopLoader from "nextjs-toploader"
import { teodor, inter } from "./fonts"
import { Providers } from "./providers"
import "./globals.css"

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
    <html lang="en" className="dark">
      <body
        className={`${teodor.variable} ${inter.variable} font-sans antialiased`}
      >
        <NextTopLoader
          color="oklch(0.72 0.15 180)"
          showSpinner={false}
          height={2}
        />
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
