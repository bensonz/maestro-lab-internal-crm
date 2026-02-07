import prisma from '@/backend/prisma/client'
import { IntakeStatus, EventType } from '@/types'
import { getClientBalanceBreakdown } from '@/backend/services/transaction'

// ── Verify Zero Balances ─────────────────────────────────────────────────────

export async function verifyZeroBalances(clientId: string): Promise<{
  allZero: boolean
  breakdown: Record<string, { balance: number }>
}> {
  const breakdown = await getClientBalanceBreakdown(clientId)

  const allZero = Object.values(breakdown).every(
    (p) => Math.abs(p.balance) < 0.01,
  )

  const simplified: Record<string, { balance: number }> = {}
  for (const [platform, data] of Object.entries(breakdown)) {
    simplified[platform] = { balance: data.balance }
  }

  return { allZero, breakdown: simplified }
}

// ── Close Client ─────────────────────────────────────────────────────────────

interface CloseClientInput {
  clientId: string
  closedById: string
  reason: string
  proofUrls?: string[]
  skipBalanceCheck?: boolean
}

export async function closeClient(data: CloseClientInput): Promise<{
  success: boolean
  error?: string
}> {
  // 1. Verify client exists and is APPROVED
  const client = await prisma.client.findUniqueOrThrow({
    where: { id: data.clientId },
  })

  if (client.intakeStatus !== IntakeStatus.APPROVED) {
    return {
      success: false,
      error: `Cannot close client in ${client.intakeStatus} status. Only APPROVED clients can be closed.`,
    }
  }

  // 2. Verify zero balances (unless admin override)
  if (!data.skipBalanceCheck) {
    const { allZero, breakdown } = await verifyZeroBalances(data.clientId)
    if (!allZero) {
      const nonZero = Object.entries(breakdown)
        .filter(([, v]) => Math.abs(v.balance) >= 0.01)
        .map(([platform, v]) => `${platform}: $${v.balance.toFixed(2)}`)
        .join(', ')
      return {
        success: false,
        error: `Non-zero balances remain: ${nonZero}. All platform balances must be zero before closure.`,
      }
    }
  }

  // 3. Update client
  const now = new Date()
  await prisma.client.update({
    where: { id: data.clientId },
    data: {
      intakeStatus: IntakeStatus.PARTNERSHIP_ENDED,
      statusChangedAt: now,
      closedAt: now,
      closureReason: data.reason,
      closureProof: data.proofUrls ?? [],
      closedById: data.closedById,
    },
  })

  // 4. Log event
  await prisma.eventLog.create({
    data: {
      eventType: EventType.STATUS_CHANGE,
      description: `Partnership ended: ${data.reason}`,
      clientId: data.clientId,
      userId: data.closedById,
      oldValue: IntakeStatus.APPROVED,
      newValue: IntakeStatus.PARTNERSHIP_ENDED,
      metadata: {
        reason: data.reason,
        proofCount: data.proofUrls?.length ?? 0,
        skipBalanceCheck: data.skipBalanceCheck ?? false,
      },
    },
  })

  // 5. Cancel any remaining open todos for this client
  await prisma.toDo.updateMany({
    where: {
      clientId: data.clientId,
      status: { in: ['PENDING', 'IN_PROGRESS'] },
    },
    data: {
      status: 'CANCELLED',
    },
  })

  return { success: true }
}

// ── Get Closure Details ──────────────────────────────────────────────────────

export async function getClosureDetails(clientId: string) {
  const client = await prisma.client.findUniqueOrThrow({
    where: { id: clientId },
    select: {
      id: true,
      intakeStatus: true,
      closedAt: true,
      closureReason: true,
      closureProof: true,
      closedById: true,
      closedBy: {
        select: { id: true, name: true },
      },
    },
  })

  return client
}
