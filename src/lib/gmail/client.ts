import { google } from 'googleapis'
import prisma from '@/backend/prisma/client'
import type { ParsedEmail } from './types'

const GMAIL_CLIENT_ID = process.env.GMAIL_CLIENT_ID
const GMAIL_CLIENT_SECRET = process.env.GMAIL_CLIENT_SECRET
const GMAIL_REDIRECT_URI = process.env.GMAIL_REDIRECT_URI

/**
 * Create an OAuth2 client for Gmail API.
 */
export function createOAuth2Client() {
  if (!GMAIL_CLIENT_ID || !GMAIL_CLIENT_SECRET || !GMAIL_REDIRECT_URI) {
    throw new Error('Gmail OAuth credentials not configured')
  }
  return new google.auth.OAuth2(
    GMAIL_CLIENT_ID,
    GMAIL_CLIENT_SECRET,
    GMAIL_REDIRECT_URI,
  )
}

/**
 * Generate the authorization URL for Gmail OAuth.
 */
export function getAuthUrl() {
  const client = createOAuth2Client()
  return client.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: [
      'https://www.googleapis.com/auth/gmail.readonly',
      'https://www.googleapis.com/auth/gmail.modify',
    ],
  })
}

/**
 * Exchange authorization code for tokens and store in DB.
 */
export async function exchangeCodeForTokens(code: string, inboxEmail: string) {
  const client = createOAuth2Client()
  const { tokens } = await client.getToken(code)

  await prisma.gmailIntegration.upsert({
    where: { inboxEmail },
    update: {
      refreshToken: tokens.refresh_token ?? '',
      accessToken: tokens.access_token ?? null,
      tokenExpiry: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
      isActive: true,
    },
    create: {
      inboxEmail,
      refreshToken: tokens.refresh_token ?? '',
      accessToken: tokens.access_token ?? null,
      tokenExpiry: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
    },
  })

  return tokens
}

/**
 * Get an authenticated Gmail API client for a stored integration.
 */
export async function getGmailClient(integrationId: string) {
  const integration = await prisma.gmailIntegration.findUnique({
    where: { id: integrationId },
  })

  if (!integration || !integration.isActive) {
    throw new Error('Gmail integration not found or inactive')
  }

  const client = createOAuth2Client()
  client.setCredentials({
    refresh_token: integration.refreshToken,
    access_token: integration.accessToken ?? undefined,
    expiry_date: integration.tokenExpiry?.getTime(),
  })

  // Handle token refresh
  client.on('tokens', async (tokens) => {
    await prisma.gmailIntegration.update({
      where: { id: integrationId },
      data: {
        accessToken: tokens.access_token ?? undefined,
        tokenExpiry: tokens.expiry_date ? new Date(tokens.expiry_date) : undefined,
      },
    })
  })

  return {
    gmail: google.gmail({ version: 'v1', auth: client }),
    integration,
  }
}

/**
 * Fetch a single message by ID and parse it.
 */
export async function fetchAndParseMessage(
  gmail: ReturnType<typeof google.gmail>,
  messageId: string,
): Promise<ParsedEmail> {
  const res = await gmail.users.messages.get({
    userId: 'me',
    id: messageId,
    format: 'full',
  })

  const headers = res.data.payload?.headers ?? []
  const getHeader = (name: string) =>
    headers.find((h) => h.name?.toLowerCase() === name.toLowerCase())?.value ?? ''

  const from = getHeader('From')
  const to = getHeader('To')
  const subject = getHeader('Subject')
  const dateStr = getHeader('Date')

  // Extract body text
  let body = ''
  const payload = res.data.payload
  if (payload?.body?.data) {
    body = Buffer.from(payload.body.data, 'base64url').toString('utf-8')
  } else if (payload?.parts) {
    const textPart = payload.parts.find(
      (p) => p.mimeType === 'text/plain',
    )
    if (textPart?.body?.data) {
      body = Buffer.from(textPart.body.data, 'base64url').toString('utf-8')
    }
  }

  return {
    messageId,
    threadId: res.data.threadId ?? null,
    from,
    to,
    subject,
    snippet: res.data.snippet ?? '',
    body,
    receivedAt: dateStr ? new Date(dateStr) : new Date(),
  }
}
