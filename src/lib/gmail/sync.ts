import { google } from 'googleapis'
import prisma from '@/backend/prisma/client'
import { getGmailClient, fetchAndParseMessage } from './client'
import type { ParsedEmail } from './types'

interface SyncResult {
  messages: ParsedEmail[]
  newHistoryId: string | null
}

/**
 * Perform incremental sync using Gmail history.list API.
 * On first run (no historyId), fetches messages from last 24 hours.
 */
export async function syncNewMessages(integrationId: string): Promise<SyncResult> {
  const { gmail, integration } = await getGmailClient(integrationId)

  if (integration.historyId) {
    return incrementalSync(gmail, integration.historyId)
  } else {
    return initialSync(gmail)
  }
}

/**
 * First-time sync: fetch messages from the last 24 hours.
 */
async function initialSync(
  gmail: ReturnType<typeof google.gmail>,
): Promise<SyncResult> {
  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)
  const afterEpoch = Math.floor(yesterday.getTime() / 1000)

  const res = await gmail.users.messages.list({
    userId: 'me',
    q: `after:${afterEpoch}`,
    maxResults: 100,
  })

  const messageIds = (res.data.messages ?? []).map((m) => m.id!).filter(Boolean)

  // Dedup against already-processed
  const existing = await prisma.processedEmail.findMany({
    where: { gmailMessageId: { in: messageIds } },
    select: { gmailMessageId: true },
  })
  const existingSet = new Set(existing.map((e) => e.gmailMessageId))
  const newIds = messageIds.filter((id) => !existingSet.has(id))

  const messages: ParsedEmail[] = []
  for (const id of newIds) {
    try {
      const parsed = await fetchAndParseMessage(gmail, id)
      messages.push(parsed)
    } catch (err) {
      console.error(`[gmail-sync] Failed to fetch message ${id}:`, err)
    }
  }

  // Get current history ID for future incremental syncs
  const profile = await gmail.users.getProfile({ userId: 'me' })
  const newHistoryId = profile.data.historyId ?? null

  return { messages, newHistoryId }
}

/**
 * Incremental sync using history.list since last historyId.
 */
async function incrementalSync(
  gmail: ReturnType<typeof google.gmail>,
  startHistoryId: string,
): Promise<SyncResult> {
  const messageIds: string[] = []
  let pageToken: string | undefined

  do {
    const res = await gmail.users.history.list({
      userId: 'me',
      startHistoryId,
      historyTypes: ['messageAdded'],
      pageToken,
    })

    for (const history of res.data.history ?? []) {
      for (const msg of history.messagesAdded ?? []) {
        if (msg.message?.id) {
          messageIds.push(msg.message.id)
        }
      }
    }

    pageToken = res.data.nextPageToken ?? undefined
  } while (pageToken)

  // Dedup
  const uniqueIds = [...new Set(messageIds)]
  const existing = await prisma.processedEmail.findMany({
    where: { gmailMessageId: { in: uniqueIds } },
    select: { gmailMessageId: true },
  })
  const existingSet = new Set(existing.map((e) => e.gmailMessageId))
  const newIds = uniqueIds.filter((id) => !existingSet.has(id))

  const messages: ParsedEmail[] = []
  for (const id of newIds) {
    try {
      const parsed = await fetchAndParseMessage(gmail, id)
      messages.push(parsed)
    } catch (err) {
      console.error(`[gmail-sync] Failed to fetch message ${id}:`, err)
    }
  }

  // Get updated history ID
  const profile = await gmail.users.getProfile({ userId: 'me' })
  const newHistoryId = profile.data.historyId ?? null

  return { messages, newHistoryId }
}
