import { SalesInteractionView } from './_components/sales-interaction-view'
import { LiveRefreshWrapper } from '@/components/live-refresh-wrapper'
import { getAllRecordsForBackoffice, getApprovedRecordsForBackoffice } from '@/backend/data/client-records'
import { getActivePhoneAssignments, getReturnedPhoneAssignments } from '@/backend/data/phone-assignments'
import { getPendingTodosForBackoffice, getCompletedTodosForBackoffice, getTodoTimeline } from '@/backend/data/todos'
import prisma from '@/backend/prisma/client'
import { getAgentsForHierarchy } from '@/backend/data/users'
import { getAgentDisplayTier, LEADERSHIP_TIERS, STAR_THRESHOLDS } from '@/lib/commission-constants'
import { SPORTS_PLATFORMS, FINANCIAL_PLATFORMS, STEP3_SPORTS_PLATFORMS } from '@/lib/platforms'
import type { IntakeClient, InProgressSubStage, VerificationTask, CompletedTodoEntry, TodoTimelineEntry, ApprovedClientEntry, PostApprovalClient, PlatformEntry } from '@/types/backend-types'

function stepToSubStage(step: number): InProgressSubStage {
  const map: Record<number, InProgressSubStage> = {
    1: 'step-1',
    2: 'step-2',
    3: 'step-3',
    4: 'step-4',
  }
  return map[step] || 'step-1'
}

/** Check if both debit cards (Bank + Edgeboost) have been uploaded in platformData */
function hasDebitCardsUploaded(platformData: unknown): boolean {
  if (!platformData) return false
  // Object format (from updateDebitCardInfo): { onlineBanking: { cardNumber: '...' }, edgeboost: { cardNumber: '...' } }
  if (typeof platformData === 'object' && !Array.isArray(platformData)) {
    const pd = platformData as Record<string, Record<string, unknown>>
    return !!(pd.onlineBanking?.cardNumber) && !!(pd.edgeboost?.cardNumber)
  }
  return false
}

/** Compute platform registration progress (X/11) from draft data.
 *  BetMGM is handled in Step 1 (stored in draft-level fields), so we count it separately. */
function computePlatformProgress(
  platformData: unknown,
  betmgmDone: boolean,
): { verified: number; total: number } {
  const total = STEP3_SPORTS_PLATFORMS.length + FINANCIAL_PLATFORMS.length + 1 // 7 + 3 + 1 (BetMGM) = 11
  let verified = 0
  // BetMGM — counted from Step 1 draft-level fields
  if (betmgmDone) verified++
  if (platformData && Array.isArray(platformData)) {
    const pd = platformData as PlatformEntry[]
    // Step 3 sportsbooks (7 platforms, excluding BetMGM)
    for (const key of STEP3_SPORTS_PLATFORMS) {
      const entry = pd.find((e) => e.platform === key)
      if (entry && (entry.screenshot || entry.screenshotPersonalInfo || entry.screenshotDeposit || entry.username)) {
        verified++
      }
    }
    for (const key of FINANCIAL_PLATFORMS) {
      const entry = pd.find((e) => e.platform === key)
      if (entry && (entry.screenshot || entry.username)) {
        verified++
      }
    }
  }
  return { verified, total }
}

// Tier sort order: leadership tiers first (CMO→MD→SED→ED), then star levels descending (4-Star→Rookie)
const TIER_SORT_ORDER: Record<string, number> = {}
// Leadership tiers: highest first — CMO=0, MD=1, SED=2, ED=3
// LEADERSHIP_TIERS array is [ED, SED, MD, CMO], so reverse index for sort
for (let i = 0; i < LEADERSHIP_TIERS.length; i++) {
  TIER_SORT_ORDER[LEADERSHIP_TIERS[i].label] = LEADERSHIP_TIERS.length - 1 - i
}
// Star levels: 4-Star next, then descending — 4-Star=4, 3-Star=5, 2-Star=6, 1-Star=7, Rookie=8
for (let i = STAR_THRESHOLDS.length - 1; i >= 0; i--) {
  TIER_SORT_ORDER[STAR_THRESHOLDS[i].label] = LEADERSHIP_TIERS.length + (STAR_THRESHOLDS.length - 1 - i)
}

export default async function SalesInteractionPage() {
  // Fetch real agents from DB for team directory
  let agentHierarchy: { level: string; agents: { id: string; name: string; level: string; stars: number; clientCount: number }[] }[] = []
  try {
    const agents = await getAgentsForHierarchy()
    if (agents.length > 0) {
      // Group agents by their display tier label
      const groups = new Map<string, { id: string; name: string; level: string; stars: number; clientCount: number }[]>()
      for (const a of agents) {
        const tierLabel = getAgentDisplayTier(a.starLevel, a.leadershipTier)
        if (!groups.has(tierLabel)) groups.set(tierLabel, [])
        groups.get(tierLabel)!.push({
          id: a.id,
          name: a.name ?? 'Unknown',
          level: tierLabel,
          stars: a.starLevel,
          clientCount: a._count.clientRecords,
        })
      }
      // Sort groups by tier rank
      agentHierarchy = [...groups.entries()]
        .sort(([a], [b]) => (TIER_SORT_ORDER[a] ?? 99) - (TIER_SORT_ORDER[b] ?? 99))
        .map(([level, agents]) => ({ level, agents }))
    }
  } catch (e) {
    console.error('[sales-interaction] agents fetch error:', e)
  }

  // Fetch real records + device data from DB
  let recordIntake: IntakeClient[] = []

  try {
    const [records, activeAssignments, returnedAssignments] = await Promise.all([
      getAllRecordsForBackoffice(),
      getActivePhoneAssignments(),
      getReturnedPhoneAssignments(),
    ])

    // Map record ID → active assignment ID + phone number + carrier
    const recordToAssignmentId = new Map<string, string>()
    const recordToPhoneNumber = new Map<string, string>()
    const recordToCarrier = new Map<string, string>()
    for (const a of activeAssignments) {
      recordToAssignmentId.set(a.clientRecordId, a.id)
      recordToPhoneNumber.set(a.clientRecordId, a.phoneNumber)
      if (a.carrier) recordToCarrier.set(a.clientRecordId, a.carrier)
    }

    // Map record ID → returned assignment ID + phone number (most recent return per record)
    const recordToReturnedId = new Map<string, string>()
    for (const a of returnedAssignments) {
      if (!recordToReturnedId.has(a.clientRecordId)) {
        recordToReturnedId.set(a.clientRecordId, a.id)
        recordToPhoneNumber.set(a.clientRecordId, a.phoneNumber)
        if (a.carrier) recordToCarrier.set(a.clientRecordId, a.carrier)
      }
    }

    recordIntake = records.map((d) => {
      const isSubmitted = d.status === 'SUBMITTED'
      const subStage: InProgressSubStage = isSubmitted ? 'pending-approval' : stepToSubStage(d.step)
      const activeAssignmentId = recordToAssignmentId.get(d.id) ?? null
      const returnedAssignmentId = recordToReturnedId.get(d.id) ?? null

      // Status based on actual device activity, not step
      let status = ''
      let statusColor = ''
      if (activeAssignmentId) {
        status = 'PHONE ISSUED'
        statusColor = 'text-success'
      } else if (returnedAssignmentId) {
        status = 'PHONE RETURNED'
        statusColor = 'text-primary'
      }

      // Assign Device: step-2 or step-3 when device reservation exists but no active or returned assignment
      const canAssignPhone = (subStage === 'step-2' || subStage === 'step-3') && !!(d.deviceReservationDate) && !activeAssignmentId && !returnedAssignmentId

      const daysSince = Math.floor(
        (Date.now() - new Date(d.updatedAt).getTime()) / (1000 * 60 * 60 * 24),
      )

      return {
        id: d.id,
        name: d.firstName && d.lastName
          ? `${d.firstName} ${d.lastName}`
          : d.firstName || 'Untitled Draft',
        status,
        statusType: isSubmitted ? 'ready' as const : 'pending_platform' as const,
        statusColor,
        agentId: d.closerId,
        agentName: d.closer?.name ?? 'Unknown',
        days: daysSince,
        daysLabel: `${daysSince}d`,
        canApprove: false,
        canAssignPhone,
        subStage,
        executionDeadline: null,
        deadlineExtensions: 0,
        pendingExtensionRequest: null,
        platformProgress: computePlatformProgress(d.platformData, !!(d.betmgmRegScreenshot && d.betmgmLoginScreenshot)),
        exceptionStates: [],
        rejectedPlatforms: [],
        activeAssignmentId,
        returnedAssignmentId,
        assignedPhone: recordToPhoneNumber.get(d.id) ?? null,
        assignedCarrier: recordToCarrier.get(d.id) ?? null,
        hasDebitCards: isSubmitted ? hasDebitCardsUploaded(d.platformData) : undefined,
      }
    })
  } catch (e) {
    console.error('[sales-interaction] records fetch error:', e)
  }

  const clientIntake = recordIntake

  // Fetch real todos from DB and map to VerificationTask format
  let realTodoTasks: VerificationTask[] = []
  try {
    const todos = await getPendingTodosForBackoffice()
    realTodoTasks = todos.map((t) => {
      const clientName = [
        t.clientRecord?.firstName,
        t.clientRecord?.lastName,
      ].filter(Boolean).join(' ') || 'Unknown'
      const daysUntil = Math.floor((t.dueDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
      const latestPhone = t.clientRecord?.phoneAssignments?.[0] ?? null
      return {
        id: t.id,
        clientRecordId: t.clientRecord?.id ?? t.clientRecordId ?? '',
        clientName,
        platformType: null,
        platformLabel: t.issueCategory,
        task: t.title,
        agentId: t.assignedTo.id,
        agentName: t.assignedTo.name,
        deadline: t.dueDate,
        daysUntilDue: daysUntil,
        deadlineLabel: daysUntil < 0 ? `${Math.abs(daysUntil)}d overdue` : `${daysUntil}d`,
        clientDeadline: t.dueDate,
        status: 'Pending' as const,
        screenshots: [],
        assignedPhone: latestPhone?.phoneNumber ?? null,
        assignedCarrier: latestPhone?.carrier ?? null,
      }
    })
  } catch (e) {
    console.error('[sales-interaction] todos fetch error:', e)
  }

  const verificationTasks = realTodoTasks

  // Fetch completed todos + timeline + approved clients (separate try/catch so one failure doesn't kill both)
  let completedTodos: CompletedTodoEntry[] = []
  let todoTimeline: TodoTimelineEntry[] = []
  let approvedClients: ApprovedClientEntry[] = []

  try {
    todoTimeline = await getTodoTimeline()
  } catch (e) {
    console.error('[sales-interaction] timeline fetch error:', e)
  }

  try {
    const completedRaw = await getCompletedTodosForBackoffice()
    completedTodos = completedRaw.map((t) => {
      const clientName = [
        t.clientRecord?.firstName,
        t.clientRecord?.lastName,
      ].filter(Boolean).join(' ') || 'Unknown'
      const completionEvent = todoTimeline.find(
        (e) => e.action === 'completed' && e.event.includes(t.issueCategory) && e.event.includes(clientName)
      )
      return {
        id: t.id,
        clientName,
        agentId: t.assignedTo.id,
        agentName: t.assignedTo.name ?? 'Unknown',
        issueCategory: t.issueCategory,
        title: t.title,
        completedAt: t.completedAt ?? new Date(),
        completedByName: completionEvent?.actor ?? t.createdBy.name ?? 'Unknown',
        clientRecordId: t.clientRecord?.id ?? t.clientRecordId ?? '',
        createdByName: t.createdBy.name ?? 'Unknown',
      }
    })
  } catch (e) {
    console.error('[sales-interaction] completed todos fetch error:', e)
  }

  try {
    const approvedRecords = await getApprovedRecordsForBackoffice()

    // Fetch bonus pools + allocations for all approved records in one query
    const recordIds = approvedRecords.map((r) => r.id)
    const pools = recordIds.length > 0
      ? await prisma.bonusPool.findMany({
          where: { clientRecordId: { in: recordIds } },
          include: {
            allocations: {
              include: { agent: { select: { name: true } } },
              orderBy: { amount: 'desc' },
            },
          },
        })
      : []
    const poolByRecordId = new Map(pools.map((p) => [p.clientRecordId, p]))

    approvedClients = approvedRecords.map((r) => {
      const pool = poolByRecordId.get(r.id)
      return {
        id: r.id,
        clientName: [r.firstName, r.lastName].filter(Boolean).join(' ') || 'Unknown',
        agentId: r.closerId,
        agentName: r.closer?.name ?? 'Unknown',
        approvedAt: r.approvedAt ?? r.updatedAt,
        poolSummary: pool
          ? {
              totalAmount: pool.totalAmount,
              directAmount: pool.directAmount,
              starPoolAmount: pool.starPoolAmount,
              distributedSlices: pool.distributedSlices,
              recycledSlices: pool.recycledSlices,
              allocations: pool.allocations.map((a) => ({
                agentName: a.agent.name,
                type: a.type as 'DIRECT' | 'STAR_SLICE' | 'BACKFILL',
                amount: a.amount,
                slices: a.slices,
              })),
            }
          : null,
      }
    })
  } catch (e) {
    console.error('[sales-interaction] approved clients fetch error:', e)
  }

  // Compute stats from combined data
  const stats = {
    totalClients: clientIntake.length,
    inProgress: clientIntake.filter((c) => c.subStage !== 'verification-needed').length,
    pendingApproval: clientIntake.filter((c) => c.subStage === 'pending-approval').length,
    verificationNeeded: clientIntake.filter((c) => c.subStage === 'verification-needed').length,
  }

  // Fetch real approved records for post-approval tracking
  let postApprovalClients: PostApprovalClient[] = []
  try {
    const approvedRecords = await getApprovedRecordsForBackoffice()
    if (approvedRecords.length > 0) {
      postApprovalClients = approvedRecords.map((r) => {
        const daysSinceApproval = r.approvedAt
          ? Math.floor((Date.now() - new Date(r.approvedAt).getTime()) / (1000 * 60 * 60 * 24))
          : 0
        return {
          id: r.id,
          name: `${r.firstName} ${r.lastName}`,
          agentId: r.closerId,
          agentName: r.closer?.name ?? 'Unknown',
          approvedAt: r.approvedAt,
          daysSinceApproval,
          limitedPlatforms: [],
          pendingVerificationTodos: 0,
        }
      })
    }
  } catch {
    // DB not available — post-approval will be empty
  }

  const hasActiveDrafts = clientIntake.length > 0 || verificationTasks.length > 0

  return (
    <LiveRefreshWrapper enabled={hasActiveDrafts} interval={10000}>
      <SalesInteractionView
        stats={stats}
        agentHierarchy={agentHierarchy}
        clientIntake={clientIntake}
        verificationTasks={verificationTasks}
        completedTodos={completedTodos}
        approvedClients={approvedClients}
        todoTimeline={todoTimeline}
        lifecycleClients={[]}
      />
    </LiveRefreshWrapper>
  )
}
