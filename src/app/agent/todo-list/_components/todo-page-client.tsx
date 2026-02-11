'use client'

import { useState, useMemo, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { ScrollArea } from '@/components/ui/scroll-area'
import { AIDetectionModal } from '@/components/ai-detection-modal'
import { DailyStatsRow } from './daily-stats-row'
import { GrowthLevelCard } from './growth-level-card'
import { QuickGuidePanel } from './quick-guide-panel'
import { ConversionTasksCard } from './conversion-tasks-card'
import { MaintenanceTasksCard, type MaintenanceTask } from './maintenance-tasks-card'
import { StreakRewardCard } from './streak-reward-card'
import { TeamComparisonCard } from './team-comparison-card'
import { GrowthSignalsCard } from './growth-signals-card'
import { TeamActionZone } from './team-action-zone'
import { FeedbackToast } from './feedback-toast'
import {
  uploadToDoScreenshots,
  confirmToDoUpload,
  requestToDoExtension,
  type AIDetection,
} from '@/app/actions/todos'
import { toast } from 'sonner'
import type { Todo, TeamMember, TeamRanking } from './types'

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
  teamMembers: TeamMember[]
  teamRanking: TeamRanking
}

// $400 bonus pool per approved lead (matches commission rules)
const POOL_PER_LEAD = 400

// Reward per task based on star level
const REWARD_PER_TASK: Record<number, number> = {
  0: 25, 1: 30, 2: 35, 3: 45, 4: 55, 5: 65, 6: 75,
}

function getEarningForTask(taskType: string): number {
  const map: Record<string, number> = {
    'Bank Setup': 50,
    PayPal: 30,
    Edgeboost: 40,
    Platform: 200,
    Verification: 25,
    Document: 20,
  }
  return map[taskType] || 0
}

// Map our ToDoType enum values to display-friendly task types
function mapTaskType(task: string): string {
  const lower = task.toLowerCase()
  if (lower.includes('bank') || lower.includes('debit')) return 'Bank Setup'
  if (lower.includes('paypal')) return 'PayPal'
  if (lower.includes('edgeboost')) return 'Edgeboost'
  if (lower.includes('platform') || lower.includes('registration')) return 'Platform'
  if (lower.includes('verif') || lower.includes('identity') || lower.includes('compliance')) return 'Verification'
  if (lower.includes('document') || lower.includes('upload')) return 'Document'
  return 'Platform'
}

// Map intake statuses to display labels
function mapStageLabel(status: string): string {
  const map: Record<string, string> = {
    PENDING: 'Pending',
    PHONE_ISSUED: 'Phone Issued',
    IN_EXECUTION: 'In Progress',
    NEEDS_MORE_INFO: 'Needs Info',
    PENDING_EXTERNAL: 'Pending External',
    EXECUTION_DELAYED: 'Delayed',
    READY_FOR_APPROVAL: 'Ready for Review',
  }
  return map[status] || status
}

function parseDueToHours(due: string, isOverdue: boolean): number {
  const match = due.match(/(\d+)([dhm])/)
  if (!match) return 72

  const value = parseInt(match[1], 10)
  const unit = match[2]

  let hours = 0
  if (unit === 'd') hours = value * 24
  else if (unit === 'h') hours = value
  else if (unit === 'm') hours = Math.ceil(value / 60)

  return isOverdue ? -hours : hours
}

// Convert server todo into Todo shape
function mapServerTodoToTodo(
  serverTodo: ServerTodoData['pendingTasks'][0],
): Todo {
  const dueHours = parseDueToHours(serverTodo.due, serverTodo.overdue)
  const meta = serverTodo.metadata as {
    instructions?: {
      mustDo?: string[]
      mustNotDo?: string[]
      successCriteria?: string
    }
  } | null

  const defaultInstructions = {
    mustDo: ['Follow task instructions carefully'],
    mustNotDo: ['Do not skip required steps'],
    successCriteria: 'Task completed per guidelines',
  }

  return {
    id: serverTodo.id,
    title: serverTodo.task,
    description: serverTodo.description,
    client: serverTodo.client,
    clientId: serverTodo.clientId,
    taskType: mapTaskType(serverTodo.task),
    priority: serverTodo.overdue ? 'high' : dueHours <= 24 ? 'medium' : 'low',
    completed: false,
    dueHours,
    triggerType: serverTodo.createdByName === 'System' ? 'Rule' : 'Backoffice',
    triggerSource: serverTodo.createdByName,
    linkedStep: serverTodo.stepNumber,
    createdAt: serverTodo.createdAt,
    extensionsUsed: serverTodo.extensionsUsed,
    maxExtensions: serverTodo.maxExtensions,
    instructions: {
      mustDo: meta?.instructions?.mustDo ?? defaultInstructions.mustDo,
      mustNotDo: meta?.instructions?.mustNotDo ?? defaultInstructions.mustNotDo,
      successCriteria:
        meta?.instructions?.successCriteria ?? defaultInstructions.successCriteria,
    },
  }
}

export function TodoPageClient({
  todoData,
  clients,
  agentName,
  agentStarLevel,
  earningsData,
  teamMembers,
  teamRanking,
}: TodoPageClientProps) {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Map server data to Todo shape
  const initialTodos = useMemo(
    () => todoData.pendingTasks.map(mapServerTodoToTodo),
    [todoData.pendingTasks],
  )

  const [todos, setTodos] = useState<Todo[]>(initialTodos)

  // Upload / AI detection flow state
  const [selectedTodo, setSelectedTodo] = useState<Todo | null>(null)
  const [detections, setDetections] = useState<AIDetection[]>([])
  const [uploadPreviewUrl, setUploadPreviewUrl] = useState('')
  const [isUploading, setIsUploading] = useState(false)

  // Feedback state
  const [showFeedback, setShowFeedback] = useState(false)
  const [lastEarning, setLastEarning] = useState(0)
  const [totalEarnedToday, setTotalEarnedToday] = useState(0)

  // Build conversion clients from server client data
  const conversionClients = useMemo(() => {
    const growthStatuses = [
      'PENDING', 'PHONE_ISSUED', 'IN_EXECUTION', 'NEEDS_MORE_INFO',
      'PENDING_EXTERNAL', 'EXECUTION_DELAYED', 'READY_FOR_APPROVAL',
    ]
    return clients
      .filter((c) => growthStatuses.includes(c.intakeStatus))
      .map((c) => ({
        id: c.id,
        name: c.name,
        currentStep: c.nextTask || mapStageLabel(c.intakeStatus),
        completedSteps: c.step,
        totalSteps: c.totalSteps,
        isOneStepAway: c.totalSteps > 0 && (c.totalSteps - c.step) === 1,
        payoutOnComplete: POOL_PER_LEAD,
      }))
  }, [clients])

  // Build maintenance tasks from pending todos
  const maintenanceTasks: MaintenanceTask[] = useMemo(() => {
    return todos
      .filter((t) => !t.completed)
      .map((t) => {
        const urgency: MaintenanceTask['urgency'] =
          t.dueHours <= -1 || t.dueHours <= 6 ? 'critical'
            : t.dueHours <= 18 ? 'warning'
              : 'normal'

        const earlyBonus = t.dueHours > 24 ? getEarningForTask(t.taskType) : 0

        return {
          id: t.id,
          clientName: t.client,
          taskDescription: t.title,
          remainingHours: t.dueHours,
          urgency,
          earlyBonus,
          streakImpact: t.dueHours < 0 ? 'Streak at risk' : '',
        }
      })
  }, [todos])

  const earlyCompletionBonus = maintenanceTasks
    .filter((t) => t.earlyBonus > 0)
    .reduce((sum, t) => sum + t.earlyBonus, 0)

  // One-step-away count for quick guide
  const oneStepAwayCount = conversionClients.filter((c) => c.isOneStepAway).length

  // Daily targets
  const dailyTarget = Math.max(1, agentStarLevel + 1)
  const overdueCount = todos.filter((t) => !t.completed && t.dueHours < 0).length

  // Daily stats computations
  const maintenanceTotalCount = maintenanceTasks.length
  const overdueRiskAmount = overdueCount * (REWARD_PER_TASK[agentStarLevel] ?? 25)
  const potentialEarnings = conversionClients.length * 400 + maintenanceTasks.length * (REWARD_PER_TASK[agentStarLevel] ?? 25)
  const confirmedEarnings = todoData.completedToday * (REWARD_PER_TASK[agentStarLevel] ?? 25)

  // Streak multiplier based on streak days
  const streakMultiplier = todoData.completedToday >= 20 ? 2.0
    : todoData.completedToday >= 10 ? 1.5
      : todoData.completedToday >= 5 ? 1.2
        : todoData.completedToday >= 3 ? 1.1
          : 1.0

  // Handle "Process" click — open file picker for the maintenance task
  const handleProcess = useCallback((taskId: string) => {
    const todo = todos.find((t) => t.id === taskId)
    if (!todo) return
    setSelectedTodo(todo)
    // Trigger file picker
    fileInputRef.current?.click()
  }, [todos])

  // Handle file selection
  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0 || !selectedTodo) {
      setSelectedTodo(null)
      return
    }

    setIsUploading(true)

    // Create preview URL from first file
    const previewUrl = URL.createObjectURL(files[0])
    setUploadPreviewUrl(previewUrl)

    // Build FormData
    const formData = new FormData()
    for (const file of files) {
      formData.append('files', file)
    }

    try {
      const result = await uploadToDoScreenshots(selectedTodo.id, formData)
      if (result.success && result.detections) {
        setDetections(result.detections)
      } else {
        toast.error(result.error || 'Upload failed')
        setSelectedTodo(null)
      }
    } catch {
      toast.error('Upload failed')
      setSelectedTodo(null)
    } finally {
      setIsUploading(false)
      // Reset file input
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }, [selectedTodo])

  // Handle AI detection confirm
  const handleConfirmUpload = useCallback(async () => {
    if (!selectedTodo || detections.length === 0) return

    try {
      const result = await confirmToDoUpload(selectedTodo.id, detections)
      if (result.success) {
        const earning = getEarningForTask(selectedTodo.taskType)
        setLastEarning(earning)
        setTotalEarnedToday((prev) => prev + earning)
        setTodos((prev) =>
          prev.map((t) => (t.id === selectedTodo.id ? { ...t, completed: true } : t)),
        )
        setShowFeedback(true)
        toast.success('Task completed!')
        router.refresh()
      } else {
        toast.error(result.error || 'Confirmation failed')
      }
    } catch {
      toast.error('Confirmation failed')
    } finally {
      setSelectedTodo(null)
      setDetections([])
      setUploadPreviewUrl('')
    }
  }, [selectedTodo, detections, router])

  // Handle extend deadline
  const handleExtend = useCallback(async (taskId: string) => {
    const result = await requestToDoExtension(taskId)
    if (result.success) {
      setTodos((prev) =>
        prev.map((t) =>
          t.id === taskId && t.extensionsUsed < t.maxExtensions
            ? { ...t, dueHours: t.dueHours + 72, extensionsUsed: t.extensionsUsed + 1 }
            : t,
        ),
      )
      toast.success('Deadline extended by 3 days')
      router.refresh()
    } else {
      toast.error(result.error || 'Extension failed')
    }
  }, [router])

  const handleDismissFeedback = useCallback(() => {
    setShowFeedback(false)
  }, [])

  // Build first detection for AI modal
  const firstDetection = detections[0]
  const detectedData = firstDetection
    ? {
        platform: firstDetection.extracted.platform,
        username: firstDetection.extracted.username,
        password: firstDetection.extracted.password,
        contentType: firstDetection.contentType,
        confidence: firstDetection.confidence * 100,
      }
    : {}

  return (
    <ScrollArea className="h-full">
      <div className="p-6 animate-fade-in">
        {/* Page title */}
        <div className="mb-4">
          <h1 className="text-lg font-semibold text-foreground">
            Daily Action & Growth Hub
          </h1>
          <p className="text-xs text-muted-foreground font-mono mt-0.5">
            Every action has immediate value — track your level, streaks, and team rank
          </p>
        </div>

        {/* TOP: Growth Level Bar */}
        <div className="mb-4">
          <GrowthLevelCard
            currentLevel={agentStarLevel}
            tasksCompleted={todoData.completedToday}
            tasksForNextLevel={todos.filter((t) => !t.completed).length}
            rewardPotential={REWARD_PER_TASK[agentStarLevel] ?? 25}
          />
        </div>

        {/* Daily Stats Row */}
        <div className="mb-4">
          <DailyStatsRow
            potentialEarnings={potentialEarnings}
            confirmedEarnings={confirmedEarnings}
            overdueCount={overdueCount}
            overdueRiskAmount={overdueRiskAmount}
            maintenanceCompleted={maintenanceTotalCount - overdueCount}
            maintenanceTotal={maintenanceTotalCount}
            tasksCompleted={todoData.completedToday}
            tasksTotal={todoData.completedToday + todos.filter((t) => !t.completed).length}
          />
        </div>

        {/* MAIN: Left Guide + Center Actions */}
        <div className="flex gap-4 mb-4">
          <div className="hidden lg:block w-[280px] flex-shrink-0">
            <QuickGuidePanel
              agentName={agentName}
              starLevel={agentStarLevel}
              totalClients={clients.length}
              overdueCount={overdueCount}
              completedToday={todoData.completedToday}
              pendingTasksCount={todos.filter((t) => !t.completed).length}
              oneStepAwayCount={oneStepAwayCount}
            />
          </div>
          <div className="flex-1 min-w-0 grid grid-cols-1 xl:grid-cols-2 gap-4">
            <ConversionTasksCard
              clients={conversionClients}
              dailyCompleted={todoData.completedToday}
              dailyTarget={dailyTarget}
            />
            <MaintenanceTasksCard
              tasks={maintenanceTasks}
              earlyCompletionBonus={earlyCompletionBonus}
              onProcess={handleProcess}
              onExtend={handleExtend}
            />
          </div>
        </div>

        {/* Mobile-only guide */}
        <div className="lg:hidden mb-4">
          <QuickGuidePanel
            agentName={agentName}
            starLevel={agentStarLevel}
            totalClients={clients.length}
            overdueCount={overdueCount}
            completedToday={todoData.completedToday}
            pendingTasksCount={todos.filter((t) => !t.completed).length}
            oneStepAwayCount={oneStepAwayCount}
          />
        </div>

        {/* MIDDLE: Streak + Team Comparison */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
          <StreakRewardCard
            currentStreak={todoData.completedToday}
            rewardMultiplier={streakMultiplier}
            avgCompletionDays={2.5}
          />
          <TeamComparisonCard
            percentile={teamRanking.percentile}
            myRank={teamRanking.myRank}
            totalMembers={teamRanking.totalMembers}
            speed={teamRanking.speed}
            stability={teamRanking.stability}
            influence={teamRanking.influence}
          />
        </div>

        {/* BOTTOM: Growth Signals */}
        <div className="mb-4">
          <GrowthSignalsCard currentStar={agentStarLevel} />
        </div>

        {/* BOTTOM: Team Action Zone (only if has subordinates) */}
        {teamMembers.length > 0 && (
          <TeamActionZone members={teamMembers} />
        )}
      </div>

      {/* Hidden file input for screenshot upload */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/*"
        className="hidden"
        onChange={handleFileSelect}
        data-testid="screenshot-file-input"
      />

      {/* AI Detection Modal */}
      {selectedTodo && detections.length > 0 && (
        <AIDetectionModal
          open={!!selectedTodo && detections.length > 0}
          onOpenChange={(open) => {
            if (!open) {
              setSelectedTodo(null)
              setDetections([])
              setUploadPreviewUrl('')
            }
          }}
          imageUrl={uploadPreviewUrl}
          detectedData={detectedData}
          onConfirm={handleConfirmUpload}
          onOverride={handleConfirmUpload}
        />
      )}

      {/* Loading overlay for upload */}
      {isUploading && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80">
          <div className="flex flex-col items-center gap-2">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            <p className="text-sm text-muted-foreground">Uploading screenshots...</p>
          </div>
        </div>
      )}

      {/* Feedback toast */}
      <FeedbackToast
        lastEarning={lastEarning}
        totalEarnedToday={totalEarnedToday}
        currentStreak={todoData.completedToday}
        completedToday={todoData.completedToday}
        show={showFeedback}
        onDismiss={handleDismissFeedback}
      />
    </ScrollArea>
  )
}
