import { ClientDetailView } from './_components/client-detail-view'
import { requireAgent } from '../../_require-agent'
import { getDraftDetailForAgent } from '@/backend/data/client-drafts'
import { redirect } from 'next/navigation'
import { IntakeStatus, PlatformType, PlatformStatus, ToDoType, ToDoStatus, EventType } from '@/types'
import { PLATFORM_INFO } from '@/lib/platforms'

interface PageProps {
  params: Promise<{ id: string }>
}

/** Map draft step + device/submission status to an IntakeStatus */
function deriveIntakeStatus(
  step: number,
  draftStatus: string,
  hasPhone: boolean,
  clientStatus: string | null,
): IntakeStatus {
  if (clientStatus === 'APPROVED') return IntakeStatus.APPROVED
  if (clientStatus === 'REJECTED') return IntakeStatus.REJECTED
  if (draftStatus === 'SUBMITTED') return IntakeStatus.READY_FOR_APPROVAL
  if (step >= 3 && hasPhone) return IntakeStatus.IN_EXECUTION
  if (hasPhone) return IntakeStatus.PHONE_ISSUED
  return IntakeStatus.PENDING
}

function getStatusColor(intakeStatus: string): string {
  switch (intakeStatus) {
    case IntakeStatus.APPROVED: return 'text-success'
    case IntakeStatus.REJECTED: return 'text-destructive'
    case IntakeStatus.READY_FOR_APPROVAL: return 'text-primary'
    case IntakeStatus.IN_EXECUTION: return 'text-warning'
    case IntakeStatus.PHONE_ISSUED: return 'text-info'
    default: return 'text-muted-foreground'
  }
}

/** Parse platformData JSON into the platform array expected by the detail view */
function parsePlatforms(platformData: unknown) {
  if (!platformData || typeof platformData !== 'object') return []

  const data = platformData as Record<string, {
    username?: string
    password?: string
    screenshots?: string[]
    verified?: boolean
  }>

  return (Object.keys(PLATFORM_INFO) as PlatformType[]).map((key) => {
    const entry = data[key]
    const hasCredentials = !!(entry?.username || entry?.password)
    const hasScreenshots = (entry?.screenshots?.length ?? 0) > 0
    const verified = entry?.verified === true

    let status: PlatformStatus = PlatformStatus.NOT_STARTED
    let statusLabel = 'Not Started'
    let statusColor = 'text-muted-foreground'

    if (verified) {
      status = PlatformStatus.VERIFIED
      statusLabel = 'Verified'
      statusColor = 'text-success'
    } else if (hasScreenshots) {
      status = PlatformStatus.PENDING_REVIEW
      statusLabel = 'Pending Review'
      statusColor = 'text-warning'
    } else if (hasCredentials) {
      status = PlatformStatus.PENDING_UPLOAD
      statusLabel = 'Pending Upload'
      statusColor = 'text-primary'
    }

    return {
      id: key,
      platformType: key,
      status,
      statusLabel,
      statusColor,
      username: entry?.username ?? null,
      accountId: null as string | null,
      screenshots: entry?.screenshots ?? [],
      reviewNotes: null as string | null,
      updatedAt: new Date(),
    }
  })
}

export default async function ClientDetailPage({ params }: PageProps) {
  const agent = await requireAgent()
  const { id } = await params

  const draft = await getDraftDetailForAgent(id, agent.id)

  if (!draft) {
    redirect('/agent/clients')
  }

  const hasPhone = (draft.phoneAssignments?.length ?? 0) > 0
  const phone = hasPhone ? draft.phoneAssignments[0] : null
  const clientStatus = draft.resultClient?.status ?? null
  const intakeStatus = deriveIntakeStatus(draft.step, draft.status, hasPhone, clientStatus)

  const client = {
    id: draft.id,
    firstName: draft.firstName ?? '',
    lastName: draft.lastName ?? '',
    middleName: null as string | null,
    name: [draft.firstName, draft.lastName].filter(Boolean).join(' ') || 'Untitled Draft',
    email: draft.assignedGmail ?? draft.email ?? null,
    phone: draft.phone ?? null,
    address: draft.address ?? null,
    city: null as string | null,
    state: null as string | null,
    zipCode: null as string | null,
    country: 'US',
    secondaryAddress: draft.livesAtDifferentAddress && draft.currentAddress
      ? { address: draft.currentAddress }
      : null,
    dateOfBirth: draft.dateOfBirth?.toISOString().split('T')[0] ?? null,
    status: intakeStatus,
    statusColor: getStatusColor(intakeStatus),
    intakeStatus,
    deadline: null as Date | null,
    deadlineExtensions: 0,
    applicationNotes: null as string | null,
    complianceReview: null as string | null,
    complianceStatus: null as string | null,
    questionnaire: {} as Record<string, unknown>,
    agent: {
      id: draft.closer.id,
      name: draft.closer.name,
      email: draft.closer.email,
    },
    platforms: parsePlatforms(draft.platformData),
    toDos: draft.todos.map((t) => ({
      id: t.id,
      title: t.title,
      description: t.description,
      type: (t.issueCategory || ToDoType.EXECUTION) as ToDoType,
      status: (t.status === 'COMPLETED' ? ToDoStatus.COMPLETED : t.status === 'CANCELLED' ? ToDoStatus.CANCELLED : ToDoStatus.PENDING) as ToDoStatus,
      priority: 1,
      dueDate: t.dueDate as Date | null,
      platformType: null as PlatformType | null,
      stepNumber: null as number | null,
      extensionsUsed: 0,
      maxExtensions: 2,
      screenshots: [] as string[],
      metadata: t.metadata,
      createdAt: t.createdAt,
    })),
    eventLogs: [] as Array<{
      id: string
      eventType: EventType
      description: string
      metadata: unknown
      oldValue: string | null
      newValue: string | null
      userName: string
      createdAt: Date
    }>,
    phoneAssignment: phone
      ? {
          phoneNumber: phone.phoneNumber,
          deviceId: phone.deviceId,
          issuedAt: phone.signedOutAt,
          signedOutAt: phone.signedOutAt,
          returnedAt: phone.returnedAt,
        }
      : null,
    pendingExtensionRequest: null as { id: string; status: string; reason: string; requestedDays: number; createdAt: Date } | null,
    extensionRequestCount: 0,
    createdAt: draft.createdAt,
    updatedAt: draft.updatedAt,
    statusChangedAt: draft.updatedAt,
    closedAt: null as Date | null,
    closureReason: null as string | null,
    closureProof: [] as string[],
    closedBy: null as { id: string; name: string } | null,
  }

  return <ClientDetailView client={client} />
}
