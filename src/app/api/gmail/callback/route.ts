import { NextRequest, NextResponse } from 'next/server'
import { exchangeCodeForTokens, createOAuth2Client } from '@/lib/gmail/client'

/**
 * OAuth callback for Gmail API authorization.
 * Google redirects here after user grants consent.
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const code = searchParams.get('code')
  const error = searchParams.get('error')

  if (error) {
    console.error('[gmail-callback] OAuth error:', error)
    return NextResponse.redirect(
      new URL('/backoffice/settings/gmail?error=oauth_denied', request.url),
    )
  }

  if (!code) {
    return NextResponse.redirect(
      new URL('/backoffice/settings/gmail?error=no_code', request.url),
    )
  }

  try {
    // Temporarily exchange to get the user's email
    const oauth2Client = createOAuth2Client()
    const { tokens } = await oauth2Client.getToken(code)
    oauth2Client.setCredentials(tokens)

    // Get the inbox email address
    const { google } = await import('googleapis')
    const gmail = google.gmail({ version: 'v1', auth: oauth2Client })
    const profile = await gmail.users.getProfile({ userId: 'me' })
    const inboxEmail = profile.data.emailAddress

    if (!inboxEmail) {
      return NextResponse.redirect(
        new URL('/backoffice/settings/gmail?error=no_email', request.url),
      )
    }

    // Store tokens using the full exchange flow
    await exchangeCodeForTokens(code, inboxEmail)

    return NextResponse.redirect(
      new URL('/backoffice/settings/gmail?success=connected', request.url),
    )
  } catch (err) {
    console.error('[gmail-callback] Token exchange error:', err)
    return NextResponse.redirect(
      new URL('/backoffice/settings/gmail?error=token_exchange', request.url),
    )
  }
}
