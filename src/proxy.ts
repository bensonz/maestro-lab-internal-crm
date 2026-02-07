import NextAuth from "next-auth";
import { NextResponse } from "next/server";
import { authConfig } from "@/backend/auth.config";

/**
 * Edge-safe middleware using auth.config.ts (no Prisma/pg imports).
 * This reads the JWT session cookie without hitting the database.
 */
const { auth } = NextAuth(authConfig);

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const isLoggedIn = !!req.auth;

  // Public routes
  if (pathname === "/login") {
    if (isLoggedIn) {
      return NextResponse.redirect(new URL("/agent", req.url));
    }
    return NextResponse.next();
  }

  // Protected routes
  if (!isLoggedIn) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  // Role-based access for backoffice
  if (pathname.startsWith("/backoffice")) {
    const role = req.auth?.user?.role;
    if (role !== "BACKOFFICE" && role !== "FINANCE" && role !== "ADMIN") {
      return NextResponse.redirect(new URL("/agent", req.url));
    }
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
