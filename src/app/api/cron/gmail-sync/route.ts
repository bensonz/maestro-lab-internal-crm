import { NextRequest, NextResponse } from 'next/server'
import { processNewEmails } from '@/lib/gmail/processor'

/**
 * Cron endpoint for Gmail sync. Runs every 5 minutes via Vercel Cron.
 * Secured with CRON_SECRET bearer token.
 */
export async function POST(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const summary = await processNewEmails()
    return NextResponse.json({ success: true, summary })
  } catch (error) {
    console.error('[gmail-sync] Cron error:', error)
    return NextResponse.json(
      { success: false, error: 'Sync failed' },
      { status: 500 },
    )
  }
}

// Also support GET for Vercel cron (it uses GET by default)
export async function GET(request: NextRequest) {
  return POST(request)
}
