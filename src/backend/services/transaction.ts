/**
 * Transaction Service — Append-Only Ledger
 *
 * RULES:
 * 1. Transactions are NEVER updated or deleted
 * 2. To reverse a transaction, create a new ADJUSTMENT transaction with negative context
 * 3. All creation goes through recordTransaction() — never use prisma.transaction.create directly
 * 4. Status can only move forward: pending → completed | failed | reversed
 */

import prisma from '@/backend/prisma/client'
import { TransactionType, PlatformType } from '@/types'

// Prisma Decimal values are converted via Number() — accept both number and Decimal-like objects
type DecimalLike = number | { toString(): string }

// ── Core Record Function ────────────────────────────────────────────────────

interface RecordTransactionInput {
  type: TransactionType
  amount: number
  currency?: string
  status?: string
  clientId?: string
  platformType?: PlatformType
  fundMovementId?: string
  bonusPoolId?: string
  description?: string
  reference?: string
  documentUrl?: string
  recordedById: string
  metadata?: Record<string, string | number | boolean | null>
}

export async function recordTransaction(data: RecordTransactionInput) {
  return prisma.transaction.create({
    data: {
      type: data.type,
      amount: data.amount,
      currency: data.currency ?? 'USD',
      status: data.status ?? 'completed',
      clientId: data.clientId,
      platformType: data.platformType,
      fundMovementId: data.fundMovementId,
      bonusPoolId: data.bonusPoolId,
      description: data.description,
      reference: data.reference,
      documentUrl: data.documentUrl,
      recordedById: data.recordedById,
      metadata: data.metadata,
    },
  })
}

// ── FundMovement → Transaction(s) ───────────────────────────────────────────

export async function recordTransactionFromFundMovement(
  fundMovement: {
    id: string
    type: string
    flowType: string
    fromClientId: string | null
    toClientId: string | null
    fromPlatform: string
    toPlatform: string
    amount: DecimalLike
    currency: string
    fee: DecimalLike | null
  },
  recordedById: string,
) {
  const amount = Number(fundMovement.amount)
  const transactions: RecordTransactionInput[] = []

  if (fundMovement.flowType === 'external') {
    const isDeposit = fundMovement.toClientId != null
    transactions.push({
      type: isDeposit ? TransactionType.DEPOSIT : TransactionType.WITHDRAWAL,
      amount,
      currency: fundMovement.currency,
      clientId:
        fundMovement.toClientId ?? fundMovement.fromClientId ?? undefined,
      platformType: (isDeposit
        ? fundMovement.toPlatform
        : fundMovement.fromPlatform) as PlatformType | undefined,
      fundMovementId: fundMovement.id,
      description: `External ${isDeposit ? 'deposit' : 'withdrawal'}`,
      recordedById,
    })
  } else if (fundMovement.flowType === 'same_client') {
    transactions.push({
      type: TransactionType.INTERNAL_TRANSFER,
      amount,
      currency: fundMovement.currency,
      clientId: fundMovement.fromClientId ?? undefined,
      fundMovementId: fundMovement.id,
      description: `Internal transfer: ${fundMovement.fromPlatform} → ${fundMovement.toPlatform}`,
      recordedById,
    })
  } else if (fundMovement.flowType === 'different_clients') {
    transactions.push({
      type: TransactionType.WITHDRAWAL,
      amount,
      currency: fundMovement.currency,
      clientId: fundMovement.fromClientId ?? undefined,
      platformType: fundMovement.fromPlatform as PlatformType | undefined,
      fundMovementId: fundMovement.id,
      description: 'Transfer to another client',
      recordedById,
    })
    transactions.push({
      type: TransactionType.DEPOSIT,
      amount,
      currency: fundMovement.currency,
      clientId: fundMovement.toClientId ?? undefined,
      platformType: fundMovement.toPlatform as PlatformType | undefined,
      fundMovementId: fundMovement.id,
      description: 'Transfer from another client',
      recordedById,
    })
  }

  // Record fee as separate transaction if present
  const fee = fundMovement.fee ? Number(fundMovement.fee) : 0
  if (fee > 0) {
    transactions.push({
      type: TransactionType.FEE,
      amount: fee,
      currency: fundMovement.currency,
      clientId: fundMovement.fromClientId ?? undefined,
      fundMovementId: fundMovement.id,
      description: 'Transfer fee',
      recordedById,
    })
  }

  return Promise.all(transactions.map((t) => recordTransaction(t)))
}

// ── Commission → Transaction ────────────────────────────────────────────────

export async function recordCommissionTransaction(
  allocation: {
    id: string
    agentId: string
    bonusPoolId: string
    type: string
    amount: DecimalLike
    slices: number
  },
  recordedById: string,
) {
  return recordTransaction({
    type: TransactionType.COMMISSION_PAYOUT,
    amount: Number(allocation.amount),
    bonusPoolId: allocation.bonusPoolId,
    description: `Commission: ${allocation.type}${allocation.slices > 0 ? ` (${allocation.slices} slices)` : ''}`,
    recordedById,
  })
}

// ── Balance Queries ─────────────────────────────────────────────────────────

export async function getClientBalance(
  clientId: string,
  platformType?: PlatformType,
) {
  const where: Record<string, unknown> = {
    clientId,
    status: 'completed',
  }
  if (platformType) where.platformType = platformType

  const transactions = await prisma.transaction.findMany({ where })

  let balance = 0
  for (const tx of transactions) {
    const amt = Number(tx.amount)
    switch (tx.type) {
      case TransactionType.DEPOSIT:
      case TransactionType.INTERNAL_TRANSFER:
        balance += amt
        break
      case TransactionType.WITHDRAWAL:
      case TransactionType.FEE:
        balance -= amt
        break
    }
  }

  return { balance, transactionCount: transactions.length }
}

export async function getClientBalanceBreakdown(clientId: string) {
  const transactions = await prisma.transaction.findMany({
    where: { clientId, status: 'completed' },
  })

  const byPlatform: Record<
    string,
    { deposits: number; withdrawals: number; fees: number; balance: number }
  > = {}

  for (const tx of transactions) {
    const platform = tx.platformType ?? 'UNASSIGNED'
    if (!byPlatform[platform]) {
      byPlatform[platform] = { deposits: 0, withdrawals: 0, fees: 0, balance: 0 }
    }

    const amt = Number(tx.amount)
    switch (tx.type) {
      case TransactionType.DEPOSIT:
      case TransactionType.INTERNAL_TRANSFER:
        byPlatform[platform].deposits += amt
        byPlatform[platform].balance += amt
        break
      case TransactionType.WITHDRAWAL:
        byPlatform[platform].withdrawals += amt
        byPlatform[platform].balance -= amt
        break
      case TransactionType.FEE:
        byPlatform[platform].fees += amt
        byPlatform[platform].balance -= amt
        break
    }
  }

  return byPlatform
}

// ── Reversal ────────────────────────────────────────────────────────────────

export async function reverseTransaction(
  transactionId: string,
  reason: string,
  recordedById: string,
) {
  const original = await prisma.transaction.findUniqueOrThrow({
    where: { id: transactionId },
  })

  if (original.status === 'reversed') {
    throw new Error('Transaction already reversed')
  }

  // Mark original as reversed (this is the ONLY allowed update)
  await prisma.transaction.update({
    where: { id: transactionId },
    data: { status: 'reversed' },
  })

  // Create offsetting adjustment
  return recordTransaction({
    type: TransactionType.ADJUSTMENT,
    amount: Number(original.amount),
    currency: original.currency,
    clientId: original.clientId ?? undefined,
    platformType: original.platformType ?? undefined,
    description: `Reversal of ${original.id}: ${reason}`,
    reference: original.id,
    recordedById,
    metadata: { reversedTransactionId: original.id, reason },
  })
}

// ── Transaction History Query ───────────────────────────────────────────────

export async function getTransactionHistory(filters?: {
  clientId?: string
  type?: TransactionType
  platformType?: PlatformType
  status?: string
  fromDate?: Date
  toDate?: Date
  limit?: number
  offset?: number
}) {
  const where: Record<string, unknown> = {}
  if (filters?.clientId) where.clientId = filters.clientId
  if (filters?.type) where.type = filters.type
  if (filters?.platformType) where.platformType = filters.platformType
  if (filters?.status) where.status = filters.status
  if (filters?.fromDate || filters?.toDate) {
    where.createdAt = {}
    if (filters.fromDate)
      (where.createdAt as Record<string, unknown>).gte = filters.fromDate
    if (filters.toDate)
      (where.createdAt as Record<string, unknown>).lte = filters.toDate
  }

  const [transactions, total] = await Promise.all([
    prisma.transaction.findMany({
      where,
      include: {
        client: { select: { id: true, firstName: true, lastName: true } },
        recordedBy: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: filters?.limit ?? 50,
      skip: filters?.offset ?? 0,
    }),
    prisma.transaction.count({ where }),
  ])

  return { transactions, total }
}
