import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

/**
 * Edge-safe proxy/middleware. No NextAuth or Prisma imports.
 * Checks for the session cookie to gate access. Actual session
 * validation happens server-side in layout guards (requireAgent/requireAdmin).
 */
export default function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl

  // Check for session cookie (NextAuth v5 JWT strategy)
  const hasSession =
    req.cookies.has('authjs.session-token') ||
    req.cookies.has('__Secure-authjs.session-token')

  // Public routes — let /login through if not logged in
  if (pathname === '/login') {
    if (hasSession) {
      return NextResponse.redirect(new URL('/agent', req.url))
    }
    return NextResponse.next()
  }

  // Protected routes — redirect to login if no session cookie
  if (!hasSession) {
    return NextResponse.redirect(new URL('/login', req.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
}
