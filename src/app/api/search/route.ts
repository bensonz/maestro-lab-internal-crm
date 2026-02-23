import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get('q')
  if (!q || q.length < 2) {
    return NextResponse.json({ results: [] })
  }

  // Mock search results — no database
  return NextResponse.json({ results: [] })
}
