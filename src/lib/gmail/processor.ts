import prisma from '@/backend/prisma/client'
import { getConfig } from '@/backend/data/config'
import { syncNewMessages } from './sync'
import { detectEmail } from './detectors'
import { matchFundAllocation } from './matcher'
import type { ParsedEmail, DetectionType, SyncSummary } from './types'

/** Map detection types to todo categories */
const DETECTION_TODO_MAP: Record<string, string> = {
  VIP_REPLY: 'VIP Account — Reply Required',
  ACCOUNT_VERIFICATION: 'Account Verification — Send to Client',
  FUND_DEPOSIT: 'Confirm Fund Deposit',
  FUND_WITHDRAWAL: 'Confirm Fund Withdrawal',
  PAYPAL_TRANSFER: 'Confirm Fund Deposit', // default; overridden by direction
}

/** Detections that trigger fund matching */
const FUND_TYPES: DetectionType[] = ['FUND_DEPOSIT', 'FUND_WITHDRAWAL', 'PAYPAL_TRANSFER']

/**
 * Process all new emails from all active Gmail integrations.
 */
export async function processNewEmails(): Promise<SyncSummary> {
  const summary: SyncSummary = {
    emailsFetched: 0,
    emailsProcessed: 0,
    todosCreated: 0,
    fundsMatched: 0,
    errors: [],
  }

  const integrations = await prisma.gmailIntegration.findMany({
    where: { isActive: true },
  })

  for (const integration of integrations) {
    try {
      const { messages, newHistoryId } = await syncNewMessages(integration.id)
      summary.emailsFetched += messages.length

      for (const email of messages) {
        try {
          const result = await processEmail(email)
          summary.emailsProcessed++
          if (result.todoCreated) summary.todosCreated++
          if (result.fundMatched) summary.fundsMatched++
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err)
          summary.errors.push(`Email ${email.messageId}: ${msg}`)
        }
      }

      // Update sync cursor
      await prisma.gmailIntegration.update({
        where: { id: integration.id },
        data: {
          historyId: newHistoryId ?? integration.historyId,
          lastSyncAt: new Date(),
        },
      })
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      summary.errors.push(`Integration ${integration.inboxEmail}: ${msg}`)
    }
  }

  // Log sync event
  if (integrations.length > 0) {
    await prisma.eventLog.create({
      data: {
        eventType: 'GMAIL_SYNCED',
        description: `Gmail sync: ${summary.emailsFetched} fetched, ${summary.todosCreated} todos created, ${summary.fundsMatched} funds matched`,
        metadata: {
          emailsFetched: summary.emailsFetched,
          emailsProcessed: summary.emailsProcessed,
          todosCreated: summary.todosCreated,
          fundsMatched: summary.fundsMatched,
          errorCount: summary.errors.length,
        },
      },
    })
  }

  return summary
}

/**
 * Process a single email: detect, create processed record, maybe create todo, maybe match fund.
 */
async function processEmail(email: ParsedEmail) {
  const detection = detectEmail(email)

  let todoId: string | undefined
  let fundAllocationId: string | undefined
  let todoCreated = false
  let fundMatched = false

  // Try to identify the client from the email recipient
  const clientInfo = await identifyClient(email.to)

  // Fund matching
  if (FUND_TYPES.includes(detection.type)) {
    const matchResult = await matchFundAllocation(detection, email.receivedAt)
    if (matchResult.matched) {
      fundMatched = true
      fundAllocationId = matchResult.allocationId

      if (matchResult.autoConfirmed) {
        await prisma.eventLog.create({
          data: {
            eventType: 'FUND_CONFIRMED',
            description: `Auto-confirmed fund allocation via email: $${matchResult.detectedAmount} on ${detection.data.platform}`,
            metadata: {
              allocationId: matchResult.allocationId,
              emailMessageId: email.messageId,
              detectedAmount: matchResult.detectedAmount,
            },
          },
        })
      }

      if (matchResult.discrepancy) {
        await prisma.eventLog.create({
          data: {
            eventType: 'FUND_DISCREPANCY_FLAGGED',
            description: `Auto-flagged fund discrepancy via email: recorded $${matchResult.recordedAmount} vs email $${matchResult.detectedAmount}`,
            metadata: {
              allocationId: matchResult.allocationId,
              emailMessageId: email.messageId,
              recordedAmount: matchResult.recordedAmount,
              detectedAmount: matchResult.detectedAmount,
            },
          },
        })
      }
    }
  }

  // Create todo if applicable
  const todoCategory = getTodoCategory(detection)
  const emailTodoDueDays = await getConfig('EMAIL_TODO_DUE_DAYS', 3)
  if (todoCategory && clientInfo) {
    const todo = await prisma.todo.create({
      data: {
        title: todoCategory,
        description: `${todoCategory} — ${clientInfo.clientName} (auto-detected from email)`,
        issueCategory: todoCategory,
        clientRecordId: clientInfo.clientRecordId,
        assignedToId: clientInfo.agentId,
        createdById: clientInfo.agentId, // system-created, attributed to agent
        dueDate: new Date(Date.now() + emailTodoDueDays * 24 * 60 * 60 * 1000),
        source: 'EMAIL_AUTO',
      },
    })

    todoId = todo.id
    todoCreated = true

    await prisma.eventLog.create({
      data: {
        eventType: 'EMAIL_TODO_CREATED',
        description: `Auto-created todo: "${todoCategory}" for ${clientInfo.clientName} from email`,
        metadata: {
          todoId: todo.id,
          emailMessageId: email.messageId,
          detectionType: detection.type,
          clientName: clientInfo.clientName,
          agentId: clientInfo.agentId,
        },
      },
    })
  }

  // Store processed email record
  await prisma.processedEmail.create({
    data: {
      gmailMessageId: email.messageId,
      threadId: email.threadId,
      from: email.from,
      subject: email.subject,
      snippet: email.snippet,
      receivedAt: email.receivedAt,
      detectionType: detection.type,
      detectionData: JSON.parse(JSON.stringify(detection.data)),
      processed: true,
      todoId,
      fundAllocationId,
    },
  })

  return { todoCreated, fundMatched }
}

/**
 * Determine the right todo category based on detection.
 */
function getTodoCategory(detection: { type: DetectionType; data: Record<string, unknown> }): string | null {
  if (detection.type === 'UNKNOWN' || detection.type === 'DEPOSIT_MATCH_BONUS') {
    return null
  }

  if (detection.type === 'PAYPAL_TRANSFER') {
    const direction = detection.data.direction as string
    if (direction === 'WITHDRAWAL') return 'Confirm Fund Withdrawal'
    return 'Confirm Fund Deposit'
  }

  return DETECTION_TODO_MAP[detection.type] ?? null
}

/**
 * Try to identify which client an email belongs to, based on the "to" address.
 * Matches against ClientRecord.assignedGmail.
 */
async function identifyClient(toAddress: string) {
  if (!toAddress) return null

  // Extract email address from "Name <email@example.com>" format
  const emailMatch = toAddress.match(/<([^>]+)>/) ?? [null, toAddress]
  const email = (emailMatch[1] ?? toAddress).trim().toLowerCase()

  // Look for a client record with this assigned Gmail
  const record = await prisma.clientRecord.findFirst({
    where: {
      assignedGmail: { equals: email, mode: 'insensitive' },
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      closerId: true,
    },
    orderBy: { updatedAt: 'desc' },
  })

  if (!record) return null

  const clientName = [record.firstName, record.lastName].filter(Boolean).join(' ') || 'Unknown Client'

  return {
    clientRecordId: record.id,
    clientName,
    agentId: record.closerId,
  }
}
