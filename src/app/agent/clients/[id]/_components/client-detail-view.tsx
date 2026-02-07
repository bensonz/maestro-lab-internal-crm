'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from '@/components/ui/hover-card'
import {
  ArrowLeft,
  Upload,
  Eye,
  FileText,
  Send,
  Clock,
} from 'lucide-react'
import { ClientProfile } from './client-profile'
import { ApplicationProgress } from './application-progress'
import { EventTimeline } from './event-timeline'
import { AIDetectionModal } from '@/components/ai-detection-modal'
import { EditCredentialModal } from '@/components/edit-credential-modal'
import {
  PlatformType,
  PlatformStatus,
  ToDoType,
  ToDoStatus,
  EventType,
  IntakeStatus,
} from '@/types'
import { getPlatformName, getPlatformAbbrev } from '@/lib/platforms'
import { cn } from '@/lib/utils'

// ── Upload item types ────────────────────────────────
type UploadStatus = 'not_uploaded' | 'uploaded' | 'verified'

interface UploadItem {
  id: string
  name: string
  status: UploadStatus
  uploadedAt?: string
  instructions?: {
    mustDo: string[]
    mustNotDo: string[]
    screenshotExample?: string
  }
}

// ── Helpers ──────────────────────────────────────────
const getUploadStatusColor = (status: UploadStatus) => {
  switch (status) {
    case 'verified':
      return 'bg-success/20 text-success border-success/40'
    case 'uploaded':
      return 'bg-primary/20 text-primary border-primary/40'
    default:
      return 'bg-muted/20 text-muted-foreground border-border'
  }
}

// Finance platform IDs for quick-select pills
const financePlatformPills = [
  { type: PlatformType.PAYPAL, abbr: 'PP' },
  { type: PlatformType.BANK, abbr: 'B' },
  { type: PlatformType.EDGEBOOST, abbr: 'EB' },
]

const sportsPlatformPills = [
  { type: PlatformType.DRAFTKINGS, abbr: 'DK' },
  { type: PlatformType.FANDUEL, abbr: 'FD' },
  { type: PlatformType.BETMGM, abbr: 'MGM' },
  { type: PlatformType.CAESARS, abbr: 'CZR' },
  { type: PlatformType.FANATICS, abbr: 'FAN' },
  { type: PlatformType.BALLYBET, abbr: 'BB' },
  { type: PlatformType.BETRIVERS, abbr: 'BR' },
  { type: PlatformType.BET365, abbr: '365' },
]

// Build upload items from client platform data
function buildPlatformUploads(
  platform: {
    platformType: PlatformType
    status: PlatformStatus
    screenshots: string[]
  },
): UploadItem[] {
  const name = getPlatformName(platform.platformType)
  const screenshotCount = platform.screenshots.length

  // Login screenshot is always needed
  const uploads: UploadItem[] = [
    {
      id: `${platform.platformType}_login`,
      name: `${name} Login Screenshot`,
      status:
        platform.status === PlatformStatus.VERIFIED
          ? 'verified'
          : screenshotCount > 0
            ? 'uploaded'
            : 'not_uploaded',
      uploadedAt:
        screenshotCount > 0 ? 'Uploaded' : undefined,
      instructions: {
        mustDo: [
          'Show username on account page',
          `Include ${name} branding/logo`,
        ],
        mustNotDo: ['Include password in screenshot'],
        screenshotExample: `${name} login confirmation screen`,
      },
    },
    {
      id: `${platform.platformType}_deposit`,
      name: `${name} Deposit Screenshot`,
      status:
        platform.status === PlatformStatus.VERIFIED && screenshotCount >= 2
          ? 'verified'
          : screenshotCount >= 2
            ? 'uploaded'
            : 'not_uploaded',
      instructions: {
        mustDo: ['Show deposit confirmation with amount'],
        mustNotDo: [],
        screenshotExample: 'Deposit confirmation screen',
      },
    },
  ]

  // Bank gets extra fields
  if (platform.platformType === PlatformType.BANK) {
    uploads.push(
      {
        id: 'bank_pin',
        name: 'PIN Confirmation',
        status: screenshotCount >= 3 ? 'uploaded' : 'not_uploaded',
        instructions: {
          mustDo: ['Confirm PIN is set to suggested value (2580)'],
          mustNotDo: ['Allow client to set custom PIN without approval'],
        },
      },
      {
        id: 'bank_routing',
        name: 'Routing Number Screenshot',
        status: screenshotCount >= 4 ? 'uploaded' : 'not_uploaded',
        instructions: {
          mustDo: ['Show routing number clearly', 'Bank name must be visible'],
          mustNotDo: ['Submit if routing number is obscured'],
        },
      },
      {
        id: 'bank_debit',
        name: 'Debit Card Photo',
        status: 'not_uploaded',
        instructions: {
          mustDo: [
            'Show front of card only',
            'Last 4 visible',
            'Cardholder name must match',
          ],
          mustNotDo: ['Show CVV (back of card)'],
        },
      },
    )
  }

  return uploads
}

function buildPersonalUploads(): UploadItem[] {
  return [
    {
      id: 'ssn_upload',
      name: 'SSN Document',
      status: 'not_uploaded',
      instructions: {
        mustDo: [
          'Upload clear photo of SSN card',
          'All digits must be readable',
          'Name must match client identity',
        ],
        mustNotDo: [
          'Submit blurry or partial images',
          'Include other documents in same photo',
        ],
        screenshotExample: 'Clear photo of SSN card front',
      },
    },
    {
      id: 'bank_statement',
      name: 'Bank Statement',
      status: 'not_uploaded',
      instructions: {
        mustDo: [
          'Upload recent bank statement (within 30 days)',
          'Client name and address must be visible',
        ],
        mustNotDo: ['Submit statements older than 30 days'],
      },
    },
    {
      id: 'address_confirm',
      name: 'Address Confirmation Document',
      status: 'not_uploaded',
      instructions: {
        mustDo: [
          'Upload utility bill or official mail',
          'Address must match primary address on file',
        ],
        mustNotDo: ['Submit expired documents'],
      },
    },
    {
      id: 'zelle_upload',
      name: 'Zelle Confirmation Screenshot',
      status: 'not_uploaded',
      instructions: {
        mustDo: [
          'Show Zelle enrollment confirmation',
          'Phone number must be visible',
          'Must be linked to company bank account',
        ],
        mustNotDo: ['Use personal Zelle account'],
      },
    },
    {
      id: 'id_back',
      name: 'ID Back Photo',
      status: 'not_uploaded',
      instructions: {
        mustDo: [
          'Upload clear photo of ID back',
          'Barcode must be scannable',
        ],
        mustNotDo: ['Submit blurry images'],
      },
    },
    {
      id: 'questionnaire',
      name: 'Interview Questionnaire',
      status: 'not_uploaded',
      instructions: {
        mustDo: ['Complete all 10 questions', 'Signed by client'],
        mustNotDo: ['Leave questions blank'],
      },
    },
  ]
}

function buildContractUploads(): UploadItem[] {
  return [
    {
      id: 'agreement_upload',
      name: 'Service Agreement (Signed)',
      status: 'not_uploaded',
      instructions: {
        mustDo: [
          'Ensure all pages are signed',
          'Date must be current',
          "Client's legal name must be printed",
        ],
        mustNotDo: ['Accept unsigned agreements'],
      },
    },
  ]
}

// ── Main View ────────────────────────────────────────
interface ClientDetailViewProps {
  client: {
    id: string
    firstName: string
    lastName: string
    middleName: string | null
    name: string
    email: string | null
    phone: string | null
    address: string | null
    city: string | null
    state: string | null
    zipCode: string | null
    country: string | null
    secondaryAddress: {
      address?: string
      city?: string
      state?: string
      zip?: string
    } | null
    dateOfBirth: string | null
    status: string
    statusColor: string
    intakeStatus: IntakeStatus
    deadline: Date | null
    deadlineExtensions: number
    applicationNotes: string | null
    complianceReview: string | null
    complianceStatus: string | null
    questionnaire: Record<string, unknown>
    agent: {
      id: string
      name: string
      email: string | null
    }
    platforms: {
      id: string
      platformType: PlatformType
      status: PlatformStatus
      statusLabel: string
      statusColor: string
      username: string | null
      accountId: string | null
      screenshots: string[]
      reviewNotes: string | null
      updatedAt: Date
    }[]
    toDos: {
      id: string
      title: string
      description: string | null
      type: ToDoType
      status: ToDoStatus
      priority: number
      dueDate: Date | null
      platformType: PlatformType | null
      stepNumber: number | null
      extensionsUsed: number
      maxExtensions: number
      screenshots: string[]
      metadata: unknown
      createdAt: Date
    }[]
    eventLogs: {
      id: string
      eventType: EventType
      description: string
      metadata: unknown
      oldValue: string | null
      newValue: string | null
      userName: string
      createdAt: Date
    }[]
    phoneAssignment: {
      phoneNumber: string
      deviceId: string | null
      issuedAt: Date | null
      signedOutAt: Date | null
      returnedAt: Date | null
    } | null
    pendingExtensionRequest: {
      id: string
      status: string
      reason: string
      requestedDays: number
      createdAt: Date
    } | null
    extensionRequestCount: number
    createdAt: Date
    updatedAt: Date
    statusChangedAt: Date
  }
}

export function ClientDetailView({ client }: ClientDetailViewProps) {
  const [selectedPlatform, setSelectedPlatform] = useState<PlatformType | null>(
    null,
  )
  const [activeSection, setActiveSection] = useState<
    'personal' | 'contract' | null
  >(null)
  const [aiModalOpen, setAiModalOpen] = useState(false)
  const [editPinModalOpen, setEditPinModalOpen] = useState(false)
  const [editCredentialModalOpen, setEditCredentialModalOpen] = useState(false)
  const [pinEditCount, setPinEditCount] = useState(0)
  const [credentialEditCount, setCredentialEditCount] = useState(0)
  const [currentBankPin, setCurrentBankPin] = useState('2580')
  const [currentBankLogin, setCurrentBankLogin] = useState({
    username: 'sjohnson_ops',
    password: 'securepass123',
  })

  // Determine which uploads to show in right panel
  const getCurrentUploads = (): { title: string; uploads: UploadItem[] } => {
    if (activeSection === 'personal') {
      return { title: 'Personal Documents', uploads: buildPersonalUploads() }
    }
    if (activeSection === 'contract') {
      return { title: 'Contract Upload', uploads: buildContractUploads() }
    }
    if (selectedPlatform) {
      const platform = client.platforms.find(
        (p) => p.platformType === selectedPlatform,
      )
      if (platform) {
        return {
          title: `${getPlatformName(selectedPlatform)} Uploads`,
          uploads: buildPlatformUploads(platform),
        }
      }
    }
    return { title: '', uploads: [] }
  }

  const currentContent = getCurrentUploads()

  const handlePlatformSelect = (platformType: PlatformType) => {
    setSelectedPlatform(platformType)
    setActiveSection(null)
  }

  const handleSectionSelect = (section: 'personal' | 'contract') => {
    setActiveSection(section)
    setSelectedPlatform(null)
  }

  const handlePinSave = (data: { pin?: string }) => {
    if (data.pin && data.pin !== currentBankPin) {
      setPinEditCount((prev) => prev + 1)
      setCurrentBankPin(data.pin)
    }
  }

  const handleCredentialSave = (data: {
    username?: string
    password?: string
  }) => {
    setCredentialEditCount((prev) => prev + 1)
    if (data.username)
      setCurrentBankLogin((prev) => ({ ...prev, username: data.username! }))
    if (data.password)
      setCurrentBankLogin((prev) => ({ ...prev, password: data.password! }))
  }

  // Check if all platforms are verified
  const allPlatformsVerified = client.platforms.every(
    (p) => p.status === PlatformStatus.VERIFIED,
  )

  // Get quick-select pill color for a platform type
  const getPillColor = (platformType: PlatformType) => {
    if (selectedPlatform === platformType) {
      return 'bg-primary text-primary-foreground border-primary'
    }
    const platform = client.platforms.find(
      (p) => p.platformType === platformType,
    )
    if (!platform) return 'bg-muted/50 text-muted-foreground border-border'
    if (platform.status === PlatformStatus.VERIFIED) {
      return 'bg-success/20 text-success border-success/40 hover:opacity-80'
    }
    if (platform.status === PlatformStatus.PENDING_REVIEW) {
      return 'bg-primary/20 text-primary border-primary/40 hover:opacity-80'
    }
    return 'bg-muted/50 text-muted-foreground border-border hover:opacity-80'
  }

  // Intake step mapping
  const stepMap: Record<string, number> = {
    [IntakeStatus.PENDING]: 1,
    [IntakeStatus.PHONE_ISSUED]: 2,
    [IntakeStatus.IN_EXECUTION]: 3,
    [IntakeStatus.READY_FOR_APPROVAL]: 4,
    [IntakeStatus.APPROVED]: 5,
  }
  const currentStep = stepMap[client.intakeStatus] ?? 1

  return (
    <div className="space-y-4 p-6 animate-fade-in">
      {/* Header: Back + Name + Status badge */}
      <div className="flex items-center gap-4">
        <Link href="/agent/clients">
          <Button variant="ghost" size="sm" data-testid="client-detail-back">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
        </Link>
        <div className="flex-1">
          <h1
            className="text-xl font-semibold text-foreground"
            data-testid="client-detail-name"
          >
            {client.name}
          </h1>
          <p className="text-xs text-muted-foreground">
            Client Lifecycle Panel — Agent View
          </p>
        </div>
        <Badge
          className={cn(
            'text-xs',
            client.intakeStatus === IntakeStatus.IN_EXECUTION ||
              client.intakeStatus === IntakeStatus.PHONE_ISSUED
              ? 'bg-primary/20 text-primary'
              : client.intakeStatus === IntakeStatus.APPROVED
                ? 'bg-success/20 text-success'
                : client.intakeStatus === IntakeStatus.REJECTED
                  ? 'bg-destructive/20 text-destructive'
                  : 'bg-muted text-muted-foreground',
          )}
          data-testid="client-status-badge"
        >
          Step {currentStep}/5 · {client.status}
        </Badge>
      </div>

      {/* Profile Summary — full width */}
      <ClientProfile
        client={client}
        bankPin={currentBankPin}
        bankLogin={currentBankLogin}
        pinEditCount={pinEditCount}
        credentialEditCount={credentialEditCount}
        onEditPin={() => setEditPinModalOpen(true)}
        onEditCredentials={() => setEditCredentialModalOpen(true)}
        onUploadSSN={() => handleSectionSelect('personal')}
        onUploadZelle={() => handleSectionSelect('personal')}
      />

      {/* Application Progress (left 2/6) + Upload Center (right 4/6) */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-6">
        <div className="lg:col-span-2">
          <ApplicationProgress
            client={client}
            selectedPlatform={selectedPlatform}
            onPlatformSelect={handlePlatformSelect}
            onSectionSelect={handleSectionSelect}
            activeSection={activeSection}
          />
        </div>

        {/* Upload Center */}
        <div className="lg:col-span-4">
          <Card className="card-terminal flex flex-col">
            <CardHeader className="px-4 pb-2 pt-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CardTitle className="flex items-center gap-1 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                    <Upload className="h-3.5 w-3.5" />
                    {currentContent.title || 'Select a Section'}
                  </CardTitle>
                </div>
                {currentContent.uploads.length > 0 && (
                  <div className="flex items-center gap-2 text-xs">
                    <span className="font-mono text-muted-foreground">
                      {
                        currentContent.uploads.filter(
                          (u) => u.status === 'verified',
                        ).length
                      }
                      /{currentContent.uploads.length} verified
                    </span>
                  </div>
                )}
              </div>

              {/* Quick-select pills bar */}
              <div className="mt-2 flex flex-wrap items-center gap-1">
                <TooltipProvider delayDuration={100}>
                  {/* PI pill */}
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        className={cn(
                          'flex h-5 items-center justify-center rounded border px-2 text-[9px] font-semibold transition-colors',
                          activeSection === 'personal'
                            ? 'border-primary bg-primary text-primary-foreground'
                            : 'border-border bg-muted/50 text-muted-foreground hover:opacity-80',
                        )}
                        onClick={() => handleSectionSelect('personal')}
                        data-testid="quick-pill-pi"
                      >
                        PI
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" className="text-xs">
                      Personal Information
                    </TooltipContent>
                  </Tooltip>

                  <div className="mx-0.5 h-4 w-px bg-border" />

                  {/* Finance platform pills */}
                  <div className="flex items-center gap-0.5">
                    {financePlatformPills.map((p) => (
                      <Tooltip key={p.type}>
                        <TooltipTrigger asChild>
                          <button
                            className={cn(
                              'flex h-5 w-6 items-center justify-center rounded border text-[9px] font-semibold transition-colors',
                              getPillColor(p.type),
                            )}
                            onClick={() => handlePlatformSelect(p.type)}
                            data-testid={`quick-pill-${p.abbr.toLowerCase()}`}
                          >
                            {p.abbr}
                          </button>
                        </TooltipTrigger>
                        <TooltipContent side="bottom" className="text-xs">
                          {getPlatformName(p.type)}
                        </TooltipContent>
                      </Tooltip>
                    ))}
                  </div>

                  <div className="mx-0.5 h-4 w-px bg-border" />

                  {/* Sportsbook pills */}
                  <div className="flex items-center gap-0.5">
                    {sportsPlatformPills.map((p) => (
                      <Tooltip key={p.type}>
                        <TooltipTrigger asChild>
                          <button
                            className={cn(
                              'flex h-5 w-6 items-center justify-center rounded border text-[8px] font-semibold transition-colors',
                              getPillColor(p.type),
                            )}
                            onClick={() => handlePlatformSelect(p.type)}
                            data-testid={`quick-pill-${p.abbr.toLowerCase()}`}
                          >
                            {p.abbr}
                          </button>
                        </TooltipTrigger>
                        <TooltipContent side="bottom" className="text-xs">
                          {getPlatformName(p.type)}
                        </TooltipContent>
                      </Tooltip>
                    ))}
                  </div>

                  <div className="mx-0.5 h-4 w-px bg-border" />

                  {/* Contract pill */}
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        className={cn(
                          'flex h-5 items-center justify-center rounded border px-2 text-[9px] font-semibold transition-colors',
                          activeSection === 'contract'
                            ? 'border-primary bg-primary text-primary-foreground'
                            : 'border-border bg-muted/50 text-muted-foreground hover:opacity-80',
                        )}
                        onClick={() => handleSectionSelect('contract')}
                        data-testid="quick-pill-c"
                      >
                        C
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" className="text-xs">
                      Contract
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            </CardHeader>

            <CardContent className="min-h-0 flex-1 p-0">
              <div className="p-3">
                {currentContent.uploads.length > 0 ? (
                  <div className="space-y-2">
                    {currentContent.uploads.map((upload) => (
                      <HoverCard
                        key={upload.id}
                        openDelay={200}
                        closeDelay={100}
                      >
                        <HoverCardTrigger asChild>
                          <div
                            className="flex cursor-help items-center justify-between rounded bg-muted/20 p-2.5 text-sm transition-colors hover:bg-muted/30"
                            data-testid={`upload-item-${upload.id}`}
                          >
                            <div className="flex min-w-0 flex-1 items-center gap-2">
                              <FileText className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                              <div className="min-w-0 flex-1">
                                <p className="truncate text-sm font-medium">
                                  {upload.name}
                                </p>
                                {upload.uploadedAt && (
                                  <p className="text-[10px] text-muted-foreground">
                                    {upload.uploadedAt}
                                  </p>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge
                                className={cn(
                                  'h-5 gap-0.5 rounded-full border px-1.5 text-[10px]',
                                  getUploadStatusColor(upload.status),
                                )}
                              >
                                {upload.status === 'verified'
                                  ? 'Complete'
                                  : upload.status === 'uploaded'
                                    ? 'Pending'
                                    : 'Incomplete'}
                              </Badge>
                              {upload.status === 'not_uploaded' ? (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-6 gap-1 px-2 text-[10px]"
                                  onClick={() => setAiModalOpen(true)}
                                  data-testid={`upload-btn-${upload.id}`}
                                >
                                  <Upload className="h-3 w-3" />
                                  Upload
                                </Button>
                              ) : (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-6 gap-1 px-2 text-[10px]"
                                  data-testid={`view-btn-${upload.id}`}
                                >
                                  <Eye className="h-3 w-3" />
                                  View
                                </Button>
                              )}
                            </div>
                          </div>
                        </HoverCardTrigger>
                        {upload.instructions && (
                          <HoverCardContent className="w-80" side="left">
                            <div className="space-y-3">
                              <p className="text-xs font-medium text-foreground">
                                {upload.name}
                              </p>
                              <div>
                                <p className="mb-1 text-xs font-semibold text-success">
                                  MUST DO
                                </p>
                                <ul className="space-y-0.5 text-xs text-muted-foreground">
                                  {upload.instructions.mustDo.map(
                                    (item, idx) => (
                                      <li
                                        key={idx}
                                        className="flex items-start gap-1"
                                      >
                                        <span className="text-success">
                                          &bull;
                                        </span>{' '}
                                        {item}
                                      </li>
                                    ),
                                  )}
                                </ul>
                              </div>
                              {upload.instructions.mustNotDo.length > 0 && (
                                <div>
                                  <p className="mb-1 text-xs font-semibold text-destructive">
                                    MUST NOT DO
                                  </p>
                                  <ul className="space-y-0.5 text-xs text-muted-foreground">
                                    {upload.instructions.mustNotDo.map(
                                      (item, idx) => (
                                        <li
                                          key={idx}
                                          className="flex items-start gap-1"
                                        >
                                          <span className="text-destructive">
                                            &bull;
                                          </span>{' '}
                                          {item}
                                        </li>
                                      ),
                                    )}
                                  </ul>
                                </div>
                              )}
                              {upload.instructions.screenshotExample && (
                                <div className="border-t border-border pt-2">
                                  <p className="text-xs text-muted-foreground">
                                    <span className="font-medium text-foreground">
                                      Example:
                                    </span>{' '}
                                    {upload.instructions.screenshotExample}
                                  </p>
                                </div>
                              )}
                            </div>
                          </HoverCardContent>
                        )}
                      </HoverCard>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                    <Upload className="mb-3 h-10 w-10 opacity-30" />
                    <p className="text-sm">
                      Select a section or platform to view uploads
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground/60">
                      Use the pills above or expand a section on the left
                    </p>
                  </div>
                )}
              </div>
            </CardContent>

            {/* Submit Application */}
            <div className="border-t border-border p-3">
              <Button
                className={cn(
                  'w-full gap-2',
                  allPlatformsVerified
                    ? 'bg-success text-success-foreground hover:bg-success/90'
                    : 'cursor-not-allowed bg-muted text-muted-foreground',
                )}
                disabled={!allPlatformsVerified}
                data-testid="submit-application-btn"
              >
                <Send className="h-4 w-4" />
                {allPlatformsVerified
                  ? 'Submit Application'
                  : 'Complete All Sections to Submit'}
              </Button>
            </div>
          </Card>
        </div>
      </div>

      {/* Event Timeline — full width */}
      <EventTimeline events={client.eventLogs} />

      {/* Modals */}
      <AIDetectionModal
        open={aiModalOpen}
        onOpenChange={setAiModalOpen}
        imageUrl=""
        detectedData={{
          platform: 'Chase Bank',
          username: 'sjohnson_ops',
          password: 'securepass123',
          contentType: 'Online Banking Login',
          confidence: 94,
        }}
        onConfirm={() => {}}
        onOverride={() => {}}
      />
      <EditCredentialModal
        open={editPinModalOpen}
        onOpenChange={setEditPinModalOpen}
        title="Edit Bank PIN"
        currentPin={currentBankPin}
        editCount={pinEditCount}
        onSave={handlePinSave}
        type="bankPin"
      />
      <EditCredentialModal
        open={editCredentialModalOpen}
        onOpenChange={setEditCredentialModalOpen}
        title="Edit Online Banking Credentials"
        currentUsername={currentBankLogin.username}
        currentPassword={currentBankLogin.password}
        editCount={credentialEditCount}
        onSave={handleCredentialSave}
        type="bankCredentials"
      />
    </div>
  )
}
