import { ClientsView } from './_components/clients-view'
import { LiveRefreshWrapper } from './_components/live-refresh-wrapper'
import { requireAgent } from '../_require-agent'
import { getApprovedRecordsByCloser, getRecordsByCloser } from '@/backend/data/client-records'
import { IntakeStatus } from '@/types'
import { ALL_PLATFORMS, SPORTS_PLATFORMS, FINANCIAL_PLATFORMS, STEP3_SPORTS_PLATFORMS } from '@/lib/platforms'
import type { PlatformEntry } from '@/types/backend-types'
import type { AgentClient, AgentDraft } from './_components/types'

function mapRecordStatus(status: string): IntakeStatus {
  switch (status) {
    case 'APPROVED': return IntakeStatus.APPROVED
    case 'REJECTED': return IntakeStatus.REJECTED
    case 'SUBMITTED': return IntakeStatus.READY_FOR_APPROVAL
    case 'CLOSED': return IntakeStatus.PARTNERSHIP_ENDED
    case 'DRAFT':
    default: return IntakeStatus.PENDING
  }
}

/** Compute inner-step progress for a draft based on its current step */
function computeInnerStepProgress(draft: Awaited<ReturnType<typeof getRecordsByCloser>>[number]): { completed: number; total: number } {
  switch (draft.step) {
    case 1: {
      // 3 inner-steps: ID document, Gmail (address + screenshot), BetMGM (reg + login screenshots)
      const total = 3
      let completed = 0
      if (draft.idDocument) completed++
      if (draft.assignedGmail && draft.gmailScreenshot) completed++
      if (draft.betmgmRegScreenshot && draft.betmgmLoginScreenshot) completed++
      return { completed, total }
    }
    case 2: {
      // 3 inner-steps: Identity & Document, Platforms History, Client Background
      const total = 3
      let completed = 0
      if (draft.ssnDocument) completed++
      if (draft.bankingHistory) completed++
      if (draft.hasCriminalRecord != null) completed++
      return { completed, total }
    }
    case 3: {
      // 11 inner-steps: one per platform registration
      const total = ALL_PLATFORMS.length // 11
      let completed = 0
      // BetMGM is handled in Step 1 — count from draft-level fields, not platformData
      if (draft.betmgmRegScreenshot && draft.betmgmLoginScreenshot) {
        completed++
      }
      if (draft.platformData && Array.isArray(draft.platformData)) {
        const pd = draft.platformData as unknown as PlatformEntry[]
        // Count Step 3 sportsbooks (7 platforms, excluding BetMGM)
        for (const key of STEP3_SPORTS_PLATFORMS) {
          const entry = pd.find((e) => e.platform === key)
          if (entry && (entry.screenshot || entry.screenshotPersonalInfo || entry.screenshotDeposit || entry.username)) {
            completed++
          }
        }
        for (const key of FINANCIAL_PLATFORMS) {
          const entry = pd.find((e) => e.platform === key)
          // Financial platforms: done when has screenshot or username
          if (entry && (entry.screenshot || entry.username)) {
            completed++
          }
        }
      }
      return { completed, total }
    }
    case 4: {
      // Step 4 is contract upload + submission — no platform progress to track
      return { completed: 0, total: 0 }
    }
    default:
      return { completed: 0, total: 3 }
  }
}

/** Extract US state abbreviation from address string, e.g. "123 Main St, Chicago, IL 60601" → "IL" */
function extractState(address: string | null | undefined): string | null {
  if (!address) return null
  // Match 2-letter state code before zip
  const match = address.match(/\b([A-Z]{2})\s*\d{5}/)
  if (match) return match[1]
  // Match state after last comma
  const parts = address.split(',').map((s) => s.trim())
  if (parts.length >= 2) {
    const stateZip = parts[parts.length - 1]
    const stateMatch = stateZip.match(/^([A-Z]{2})\b/)
    if (stateMatch) return stateMatch[1]
  }
  return null
}

/** Compute age from date of birth */
function computeAge(dob: Date | null | undefined): number | null {
  if (!dob) return null
  const now = new Date()
  let age = now.getFullYear() - dob.getFullYear()
  const monthDiff = now.getMonth() - dob.getMonth()
  if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < dob.getDate())) {
    age--
  }
  return age
}

/** Format duration between two dates as compact string, e.g. "3d11h" */
function formatDuration(start: Date, end: Date): string {
  const ms = end.getTime() - start.getTime()
  if (ms < 0) return '0m'
  const totalMinutes = Math.floor(ms / 60000)
  if (totalMinutes < 60) return `${totalMinutes}m`
  const hours = Math.floor(totalMinutes / 60)
  if (hours < 24) return `${hours}h`
  const days = Math.floor(hours / 24)
  const remainingHours = hours % 24
  return remainingHours > 0 ? `${days}d${remainingHours}h` : `${days}d`
}

function getStatusLabel(status: string): { label: string; color: string } {
  switch (status) {
    case 'APPROVED': return { label: 'Approved', color: 'text-success' }
    case 'REJECTED': return { label: 'Rejected', color: 'text-destructive' }
    case 'SUBMITTED': return { label: 'Pending Approval', color: 'text-primary' }
    case 'CLOSED': return { label: 'Closed', color: 'text-muted-foreground' }
    case 'DRAFT':
    default: return { label: 'Draft', color: 'text-warning' }
  }
}

export default async function MyClientsPage() {
  const agent = await requireAgent()

  // Fetch draft records and approved/submitted records in parallel
  let dbRecords: Awaited<ReturnType<typeof getApprovedRecordsByCloser>> = []
  let dbDrafts: Awaited<ReturnType<typeof getRecordsByCloser>> = []
  try {
    ;[dbRecords, dbDrafts] = await Promise.all([
      getApprovedRecordsByCloser(agent.id),
      getRecordsByCloser(agent.id),
    ])
  } catch {
    // DB not available
  }

  // Map drafts to AgentDraft format
  const drafts: AgentDraft[] = dbDrafts.map((d) => {
    const { completed, total } = computeInnerStepProgress(d)
    return {
      id: d.id,
      name: d.firstName && d.lastName
        ? `${d.firstName} ${d.lastName}`
        : d.firstName || 'Untitled Draft',
      step: d.step,
      status: d.status,
      innerStepCompleted: completed,
      innerStepTotal: total,
      updatedAt: d.updatedAt.toISOString(),
      lastUpdated: d.updatedAt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    }
  })

  // If we have real records or drafts, map them; otherwise show empty state
  if (dbRecords.length > 0 || drafts.length > 0) {
    // Filter out DRAFT/SUBMITTED — those are shown in the drafts panel
    const clients: AgentClient[] = dbRecords
      .filter((r) => r.status !== 'DRAFT' && r.status !== 'SUBMITTED')
      .map((r) => {
        const { label, color } = getStatusLabel(r.status)
        const addr = r.currentAddress || r.address || null
        const dob = r.dateOfBirth ?? null

        // Duration from record creation (scan ID) to approval
        let intakeDuration: string | null = null
        if (r.status === 'APPROVED') {
          intakeDuration = formatDuration(r.createdAt, r.updatedAt)
        }

        return {
          id: r.id,
          name: `${r.firstName} ${r.lastName}`,
          intakeStatus: mapRecordStatus(r.status),
          status: label,
          statusColor: color,
          nextTask: null,
          step: r.status === 'APPROVED' ? 1 : 0,
          totalSteps: 1,
          progress: r.status === 'APPROVED' ? 100 : 0,
          lastUpdated: r.updatedAt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          updatedAt: r.updatedAt.toISOString(),
          deadline: null,
          phone: r._phone || r.phone || null,
          age: computeAge(dob),
          state: extractState(addr),
          zelle: r.closer?.zelle ?? null,
          intakeDuration,
          startDate: r.createdAt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          verificationSubCategory: null,
          verificationTask: null,
          verificationPlatform: null,
        }
      })

    const inProgressClientCount = clients.filter((c) =>
      c.intakeStatus === IntakeStatus.IN_EXECUTION ||
      c.intakeStatus === IntakeStatus.PENDING ||
      c.intakeStatus === IntakeStatus.READY_FOR_APPROVAL
    ).length
    const verificationCount = clients.filter((c) =>
      c.intakeStatus === IntakeStatus.NEEDS_MORE_INFO ||
      c.intakeStatus === IntakeStatus.PENDING_EXTERNAL ||
      c.intakeStatus === IntakeStatus.EXECUTION_DELAYED
    ).length
    const approvedCount = clients.filter((c) => c.intakeStatus === IntakeStatus.APPROVED).length
    const rejectedCount = clients.filter((c) => c.intakeStatus === IntakeStatus.REJECTED).length
    const abortedCount = 0
    const stats = {
      // Total = approved + rejected + aborted + in-progress (drafts)
      // Excludes verification-needed to avoid double-counting active clients
      total: approvedCount + rejectedCount + abortedCount + drafts.length,
      inProgress: inProgressClientCount + drafts.length,
      verificationNeeded: verificationCount,
      approved: approvedCount,
      rejected: rejectedCount,
      aborted: abortedCount,
      draftsCount: drafts.length,
    }

    const hasActiveDrafts = drafts.length > 0

    return (
      <div className="flex h-[calc(100vh-4rem)] animate-fade-in">
        <LiveRefreshWrapper enabled={hasActiveDrafts}>
          <ClientsView clients={clients} drafts={drafts} stats={stats} />
        </LiveRefreshWrapper>
      </div>
    )
  }

  // No clients or drafts yet — show empty state
  const emptyStats = {
    total: 0,
    inProgress: 0,
    verificationNeeded: 0,
    approved: 0,
    rejected: 0,
    aborted: 0,
    draftsCount: 0,
  }
  return (
    <div className="flex h-[calc(100vh-4rem)] animate-fade-in">
      <ClientsView
        clients={[]}
        drafts={[]}
        stats={emptyStats}
      />
    </div>
  )
}
