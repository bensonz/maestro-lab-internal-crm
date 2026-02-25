import {
  MOCK_SALES_HIERARCHY,
  MOCK_INTAKE_CLIENTS,
  MOCK_VERIFICATION_TASKS,
  MOCK_POST_APPROVAL_CLIENTS,
  MOCK_LIFECYCLE_CLIENTS,
} from '@/lib/mock-data'
import { SalesInteractionView } from './_components/sales-interaction-view'
import { getAllDraftsForBackoffice } from '@/backend/data/client-drafts'
import { getActivePhoneAssignments, getReturnedPhoneAssignments } from '@/backend/data/phone-assignments'
import { getAgentsForHierarchy } from '@/backend/data/users'
import { getAgentDisplayTier, LEADERSHIP_TIERS, STAR_THRESHOLDS } from '@/lib/commission-constants'
import type { IntakeClient, InProgressSubStage } from '@/types/backend-types'

function stepToSubStage(step: number): InProgressSubStage {
  const map: Record<number, InProgressSubStage> = {
    1: 'step-1',
    2: 'step-2',
    3: 'step-3',
    4: 'step-4',
  }
  return map[step] || 'step-1'
}

// Tier sort order: leadership tiers first (CMO→MD→SED→ED), then star levels descending (4★→Rookie)
const TIER_SORT_ORDER: Record<string, number> = {}
// Leadership tiers: highest first — CMO=0, MD=1, SED=2, ED=3
// LEADERSHIP_TIERS array is [ED, SED, MD, CMO], so reverse index for sort
for (let i = 0; i < LEADERSHIP_TIERS.length; i++) {
  TIER_SORT_ORDER[LEADERSHIP_TIERS[i].label] = LEADERSHIP_TIERS.length - 1 - i
}
// Star levels: 4-Star next, then descending — 4★=4, 3★=5, 2★=6, 1★=7, Rookie=8
for (let i = STAR_THRESHOLDS.length - 1; i >= 0; i--) {
  TIER_SORT_ORDER[STAR_THRESHOLDS[i].label] = LEADERSHIP_TIERS.length + (STAR_THRESHOLDS.length - 1 - i)
}

export default async function SalesInteractionPage() {
  // Fetch real agents from DB for team directory
  let agentHierarchy = MOCK_SALES_HIERARCHY
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
          clientCount: a._count.closedClients,
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

  // Fetch real drafts + device data from DB
  let draftIntake: IntakeClient[] = []

  try {
    const [drafts, activeAssignments, returnedAssignments] = await Promise.all([
      getAllDraftsForBackoffice(),
      getActivePhoneAssignments(),
      getReturnedPhoneAssignments(),
    ])

    // Map draft ID → active assignment ID + phone number
    const draftToAssignmentId = new Map<string, string>()
    const draftToPhoneNumber = new Map<string, string>()
    for (const a of activeAssignments) {
      draftToAssignmentId.set(a.clientDraftId, a.id)
      draftToPhoneNumber.set(a.clientDraftId, a.phoneNumber)
    }

    // Map draft ID → returned assignment ID + phone number (most recent return per draft)
    const draftToReturnedId = new Map<string, string>()
    for (const a of returnedAssignments) {
      if (!draftToReturnedId.has(a.clientDraftId)) {
        draftToReturnedId.set(a.clientDraftId, a.id)
        draftToPhoneNumber.set(a.clientDraftId, a.phoneNumber)
      }
    }

    draftIntake = drafts.map((d) => {
      const isSubmitted = d.status === 'SUBMITTED'
      const subStage = stepToSubStage(d.step)
      const activeAssignmentId = draftToAssignmentId.get(d.id) ?? null
      const returnedAssignmentId = draftToReturnedId.get(d.id) ?? null

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
        platformProgress: { verified: 0, total: 0 },
        exceptionStates: [],
        rejectedPlatforms: [],
        resultClientId: d.resultClientId,
        activeAssignmentId,
        returnedAssignmentId,
        assignedPhone: draftToPhoneNumber.get(d.id) ?? null,
      }
    })
  } catch (e) {
    console.error('[sales-interaction] drafts fetch error:', e)
  }

  // Combine real drafts + mock data (mock kept for UI development)
  const clientIntake = [...draftIntake, ...MOCK_INTAKE_CLIENTS]

  // Compute stats from combined data
  const stats = {
    totalClients: clientIntake.length,
    inProgress: clientIntake.filter((c) => c.subStage !== 'verification-needed').length,
    pendingApproval: clientIntake.filter((c) => c.subStage === 'step-4').length,
    verificationNeeded: clientIntake.filter((c) => c.subStage === 'verification-needed').length,
  }

  return (
    <SalesInteractionView
      stats={stats}
      agentHierarchy={agentHierarchy}
      clientIntake={clientIntake}
      verificationTasks={MOCK_VERIFICATION_TASKS}
      postApprovalClients={MOCK_POST_APPROVAL_CLIENTS}
      lifecycleClients={MOCK_LIFECYCLE_CLIENTS}
    />
  )
}
