'use client'

import { useMemo, useState, useRef, useCallback, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { AgentHeader } from './agent-header'
import { GrowthPanel } from './growth-panel'
import { MaintenancePanel } from './maintenance-panel'
import { TeamSupport } from './task-list'
import { FeedbackToast } from './feedback-toast'
import { AIDetectionModal } from '@/components/ai-detection-modal'
import {
  uploadToDoScreenshots,
  confirmToDoUpload,
  requestToDoExtension,
  nudgeTeamMember,
} from '@/app/actions/todos'
import type { AIDetection } from '@/app/actions/todos'
import type {
  GrowthClient,
  MaintenanceClient,
  MaintenanceUrgency,
  TeamSupportItem,
  AgentProfile,
} from './types'

// Server data shape from getAgentTodos + getAgentClients
interface ServerTodoData {
  todaysTasks: number
  thisWeek: number
  overdue: number
  completedToday: number
  pendingTasks: Array<{
    id: string
    task: string
    description: string
    client: string
    clientId: string
    due: string
    dueDate: string | null
    overdue: boolean
    stepNumber: number
    createdAt: string
    extensionsUsed: number
    maxExtensions: number
    createdByName: string
    metadata: Record<string, unknown> | null
  }>
}

interface ServerClientData {
  id: string
  name: string
  intakeStatus: string
  nextTask: string | null
  step: number
  totalSteps: number
  deadline: string | null
}

interface ServerTeamMember {
  id: string
  name: string
  currentStep: string
  totalSteps: number
  completedSteps: number
  isOneStepAway: boolean
  totalClients: number
}

interface EarningsData {
  totalEarnings: number
  pendingPayout: number
  thisMonth: number
  recentTransactions: Array<{
    id: string
    client: string
    description: string
    amount: number
    status: string
    date: string
    rawDate: string
  }>
  commission: {
    totalEarned: number
    pending: number
    paid: number
    directBonuses: number
    starSlices: number
  }
  overrides: {
    overrideTotal: number
    ownTotal: number
  }
}

interface TodoPageClientProps {
  todoData: ServerTodoData
  clients: ServerClientData[]
  agentName: string
  agentStarLevel: number
  earningsData: EarningsData
  teamMembers: ServerTeamMember[]
}

// Expected income per client based on star level: 1★=$250, 2★=$300, 3★=$350, 4★=$400
function getExpectedIncome(starLevel: number): number {
  return 200 + Math.min(starLevel, 4) * 50
}

// Map intake statuses to growth stages
function mapStageLabel(status: string): { stage: string; label: string } {
  const map: Record<string, { stage: string; label: string }> = {
    PENDING: { stage: 'pending', label: 'Pending' },
    PHONE_ISSUED: { stage: 'phone_issued', label: 'Phone Issued' },
    IN_EXECUTION: { stage: 'in_progress', label: 'In Progress' },
    NEEDS_MORE_INFO: { stage: 'needs_info', label: 'Needs Info' },
    PENDING_EXTERNAL: { stage: 'pending_external', label: 'Pending External' },
    EXECUTION_DELAYED: { stage: 'delayed', label: 'Delayed' },
    READY_FOR_APPROVAL: { stage: 'review', label: 'Ready for Review' },
  }
  return map[status] || { stage: 'pending', label: status }
}

// Build growth clients from server client data
function buildGrowthClients(
  clients: ServerClientData[],
  starLevel: number,
): GrowthClient[] {
  const growthStatuses = [
    'PENDING',
    'PHONE_ISSUED',
    'IN_EXECUTION',
    'NEEDS_MORE_INFO',
    'PENDING_EXTERNAL',
    'EXECUTION_DELAYED',
    'READY_FOR_APPROVAL',
  ]

  return clients
    .filter((c) => growthStatuses.includes(c.intakeStatus))
    .map((c) => {
      const { stage, label } = mapStageLabel(c.intakeStatus)
      const daysInPipeline = c.deadline
        ? Math.max(
            0,
            Math.ceil(
              (Date.now() - new Date(c.deadline).getTime()) /
                (1000 * 60 * 60 * 24),
            ),
          )
        : 0

      return {
        id: c.id,
        name: c.name,
        stage,
        stageLabel: label,
        daysInPipeline: Math.abs(daysInPipeline),
        expectedIncome: getExpectedIncome(starLevel),
        pendingTasks: c.nextTask ? 1 : 0,
      }
    })
}

// Classify urgency based on remaining time
function classifyUrgency(daysRemaining: number): MaintenanceUrgency {
  if (daysRemaining < 0) return 'critical' // overdue
  if (daysRemaining <= 1) return 'warning' // due within 24h
  return 'normal'
}

// Build maintenance clients from ALL pending todo data (not just overdue)
function buildMaintenanceClients(
  pendingTasks: ServerTodoData['pendingTasks'],
): MaintenanceClient[] {
  return pendingTasks.map((t) => {
    let daysRemaining: number
    if (t.dueDate) {
      const due = new Date(t.dueDate)
      const now = new Date()
      // Use Math.floor so partially-overdue days round to -1, not 0
      daysRemaining = Math.floor(
        (due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
      )
    } else {
      daysRemaining = 99 // no deadline = not urgent
    }

    const isHighPriority =
      t.task.toLowerCase().includes('high') ||
      t.task.toLowerCase().includes('urgent') ||
      t.task.toLowerCase().includes('critical')

    const urgency = classifyUrgency(daysRemaining)
    const overduePercent = daysRemaining < 0 ? Math.abs(daysRemaining) : 0

    return {
      id: t.clientId || t.id,
      todoId: t.id,
      name: t.client,
      taskCategory: isHighPriority
        ? ('high_priority' as const)
        : ('platform_verification' as const),
      taskDescription: t.task,
      daysRemaining,
      overduePercent,
      urgency,
      extensionsUsed: t.extensionsUsed,
      maxExtensions: t.maxExtensions,
    }
  })
}

// Map server team members to TeamSupportItem
function buildTeamSupport(
  members: ServerTeamMember[],
  starLevel: number,
): TeamSupportItem[] {
  return members.map((m) => {
    let hint: string
    if (m.isOneStepAway) {
      hint = `${m.name} is 1 step away from closing a client — could use guidance`
    } else if (m.completedSteps === 0 && m.totalClients === 0) {
      hint = `${m.name} is new and needs walkthrough on the onboarding process`
    } else if (m.currentStep === 'No active client') {
      hint = `${m.name} has no active clients — help them get started`
    } else {
      hint = `${m.name} is at "${m.currentStep}" — ${m.completedSteps}/${m.totalSteps} platforms done`
    }

    return {
      id: m.id,
      agentName: m.name,
      hint,
      potentialEarning: getExpectedIncome(starLevel),
      currentStep: m.currentStep,
      completedSteps: m.completedSteps,
      totalSteps: m.totalSteps,
      isOneStepAway: m.isOneStepAway,
    }
  })
}

export function TodoPageClient({
  todoData,
  clients,
  agentName,
  agentStarLevel,
  earningsData,
  teamMembers,
}: TodoPageClientProps) {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Local state for task mutations
  const [completedTodoIds, setCompletedTodoIds] = useState<Set<string>>(
    new Set(),
  )
  const [extendedTodos, setExtendedTodos] = useState<
    Map<string, { newDueDate: Date; extensionsUsed: number }>
  >(new Map())

  // Upload workflow state
  const [selectedTodoId, setSelectedTodoId] = useState<string | null>(null)
  const [detections, setDetections] = useState<AIDetection[]>([])
  const [uploadPreviewUrl, setUploadPreviewUrl] = useState('')
  const [isUploading, setIsUploading] = useState(false)
  const [showAIModal, setShowAIModal] = useState(false)

  // Extension workflow state
  const [extendingTodoId, setExtendingTodoId] = useState<string | null>(null)

  // Feedback toast state
  const [showFeedback, setShowFeedback] = useState(false)

  // Reset selectedTodoId when file picker is canceled (no onChange fires)
  useEffect(() => {
    const input = fileInputRef.current
    if (!input) return
    const handleCancel = () => setSelectedTodoId(null)
    input.addEventListener('cancel', handleCancel)
    return () => input.removeEventListener('cancel', handleCancel)
  }, [])

  // Build growth clients from server data
  const growthClients = useMemo(
    () => buildGrowthClients(clients, agentStarLevel),
    [clients, agentStarLevel],
  )

  // Build maintenance clients from ALL pending tasks, filtering out completed
  const maintenanceClients = useMemo(() => {
    const all = buildMaintenanceClients(todoData.pendingTasks)
    return all
      .filter((c) => !completedTodoIds.has(c.todoId))
      .map((c) => {
        const ext = extendedTodos.get(c.todoId)
        if (ext) {
          const now = new Date()
          const newDaysRemaining = Math.floor(
            (ext.newDueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
          )
          return {
            ...c,
            daysRemaining: newDaysRemaining,
            urgency: classifyUrgency(newDaysRemaining),
            overduePercent: newDaysRemaining < 0 ? Math.abs(newDaysRemaining) : 0,
            extensionsUsed: ext.extensionsUsed,
          }
        }
        return c
      })
  }, [todoData.pendingTasks, completedTodoIds, extendedTodos])

  // Team support — from real subordinate data
  const teamSupport = useMemo(
    () => buildTeamSupport(teamMembers, agentStarLevel),
    [teamMembers, agentStarLevel],
  )

  // Calculate total overdue percentage
  const totalOverduePercent = useMemo(
    () => maintenanceClients.reduce((s, c) => s + c.overduePercent, 0),
    [maintenanceClients],
  )

  // Use actual earnings for bonus calculation
  const bonusBase = earningsData.commission.totalEarned || earningsData.totalEarnings
  const effectiveBonus = Math.max(0, bonusBase * ((100 - totalOverduePercent) / 100))

  // Agent profile
  const agent: AgentProfile = {
    name: agentName,
    starLevel: agentStarLevel,
    totalClients: clients.length,
    activeClients: clients.filter((c) =>
      ['PHONE_ISSUED', 'IN_EXECUTION'].includes(c.intakeStatus),
    ).length,
  }

  // Total potential from growth clients
  const potentialNew = growthClients.reduce((s, c) => s + c.expectedIncome, 0)

  // Count today's tasks
  const totalTasks =
    maintenanceClients.length +
    growthClients.reduce((s, c) => s + c.pendingTasks, 0)

  const completedToday =
    todoData.completedToday + completedTodoIds.size

  // Daily goal stats
  const dailyGoal = useMemo(
    () => ({
      potentialNew,
      overduePercent: totalOverduePercent,
      bonusAmount: bonusBase,
      effectiveBonus,
      completedTasks: completedToday,
      totalTasks: totalTasks + completedTodoIds.size,
      currentStreak: completedToday,
    }),
    [
      potentialNew,
      totalOverduePercent,
      bonusBase,
      effectiveBonus,
      completedToday,
      totalTasks,
      completedTodoIds.size,
    ],
  )

  // ── Upload/Process workflow ──────────────────────────────────────

  const handleProcess = useCallback((todoId: string) => {
    setSelectedTodoId(todoId)
    fileInputRef.current?.click()
  }, [])

  const handleFileSelect = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files
      if (!files?.length || !selectedTodoId) {
        // User canceled file picker — reset selection
        setSelectedTodoId(null)
        return
      }

      setIsUploading(true)
      // Hoist so both try and catch can revoke on failure
      let previewUrl = ''
      try {
        const formData = new FormData()
        for (let i = 0; i < files.length; i++) {
          formData.append('files', files[i])
        }

        // Create preview from first file
        previewUrl = URL.createObjectURL(files[0])
        setUploadPreviewUrl(previewUrl)

        const result = await uploadToDoScreenshots(selectedTodoId, formData)
        if (result.success && result.detections) {
          setDetections(result.detections)
          setShowAIModal(true)
        } else {
          URL.revokeObjectURL(previewUrl)
          setUploadPreviewUrl('')
          toast.error(result.error || 'Upload failed')
        }
      } catch {
        if (previewUrl) URL.revokeObjectURL(previewUrl)
        setUploadPreviewUrl('')
        toast.error('Failed to upload screenshots')
      } finally {
        setIsUploading(false)
        // Reset file input
        if (fileInputRef.current) {
          fileInputRef.current.value = ''
        }
      }
    },
    [selectedTodoId],
  )

  const handleConfirmUpload = useCallback(async () => {
    if (!selectedTodoId || detections.length === 0) return

    try {
      const result = await confirmToDoUpload(selectedTodoId, detections)
      if (result.success) {
        setCompletedTodoIds((prev) => new Set([...prev, selectedTodoId]))
        toast.success('Task completed!')
        setShowFeedback(true)
        router.refresh()
      } else {
        toast.error(result.error || 'Failed to confirm upload')
      }
    } catch {
      toast.error('Failed to confirm upload')
    } finally {
      // Closing the modal triggers onOpenChange which handles URL cleanup
      setShowAIModal(false)
    }
  }, [selectedTodoId, detections, router])

  // ── Extension workflow ───────────────────────────────────────────

  const handleExtend = useCallback(
    async (todoId: string) => {
      setExtendingTodoId(todoId)
      try {
        const result = await requestToDoExtension(todoId)
        if (result.success && result.newDueDate) {
          const task = maintenanceClients.find((c) => c.todoId === todoId)
          setExtendedTodos((prev) => {
            const next = new Map(prev)
            next.set(todoId, {
              newDueDate: new Date(result.newDueDate!),
              extensionsUsed: (task?.extensionsUsed ?? 0) + 1,
            })
            return next
          })
          toast.success('Deadline extended by 3 days')
          router.refresh()
        } else {
          toast.error(result.error || 'Failed to extend deadline')
        }
      } catch {
        toast.error('Failed to extend deadline')
      } finally {
        setExtendingTodoId(null)
      }
    },
    [maintenanceClients, router],
  )

  // ── Nudge workflow ───────────────────────────────────────────────

  const handleNudge = useCallback(
    async (memberId: string): Promise<boolean> => {
      try {
        const result = await nudgeTeamMember(memberId)
        if (result.success) {
          toast.success('Nudge sent!')
          return true
        } else {
          toast.error(result.error || 'Failed to send nudge')
          return false
        }
      } catch {
        toast.error('Failed to send nudge')
        return false
      }
    },
    [],
  )

  return (
    <>
      <div className="mx-auto max-w-[1400px] animate-fade-in space-y-4 p-6">
        {/* Tier 1: Context & Daily Goal */}
        <AgentHeader agent={agent} data={dailyGoal} />

        {/* Tier 2: Growth + Maintenance */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <GrowthPanel clients={growthClients} starLevel={agentStarLevel} />
          <MaintenancePanel
            clients={maintenanceClients}
            totalOverduePercent={totalOverduePercent}
            onProcess={handleProcess}
            onExtend={handleExtend}
            isUploading={isUploading}
            uploadingTodoId={selectedTodoId}
            extendingTodoId={extendingTodoId}
          />
        </div>

        {/* Tier 3: Team Support */}
        <TeamSupport items={teamSupport} onNudge={handleNudge} />
      </div>

      {/* Hidden file input for upload workflow */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple
        className="hidden"
        onChange={handleFileSelect}
        data-testid="todo-file-input"
      />

      {/* AI Detection Modal */}
      {detections.length > 0 && (
        <AIDetectionModal
          open={showAIModal}
          onOpenChange={(open) => {
            setShowAIModal(open)
            // User dismissed modal without confirming — clean up
            if (!open) {
              if (uploadPreviewUrl) URL.revokeObjectURL(uploadPreviewUrl)
              setUploadPreviewUrl('')
              setDetections([])
              setSelectedTodoId(null)
            }
          }}
          imageUrl={uploadPreviewUrl}
          detectedData={{
            platform: detections[0].extracted.platform,
            username: detections[0].extracted.username,
            password: detections[0].extracted.password,
            contentType: detections[0].contentType,
            confidence: Math.round(detections[0].confidence * 100),
          }}
          onConfirm={handleConfirmUpload}
          onOverride={handleConfirmUpload}
        />
      )}

      {/* Feedback toast on task completion */}
      <FeedbackToast
        lastEarning={0}
        totalEarnedToday={0}
        currentStreak={completedToday}
        completedToday={completedToday}
        show={showFeedback}
        onDismiss={() => setShowFeedback(false)}
      />
    </>
  )
}
