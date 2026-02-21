import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  serverExternalPackages: ['pg', '@prisma/adapter-pg'],
  compiler: {
    // Strip console.log in production builds on Vercel (keeps console.warn/error)
    ...(process.env.VERCEL_ENV === 'production' && {
      removeConsole: { exclude: ['warn', 'error'] },
    }),
  },
}

export default nextConfig
