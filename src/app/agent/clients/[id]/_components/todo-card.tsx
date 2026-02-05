'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Clock, AlertCircle, Upload, Timer, Info } from 'lucide-react'
import { ToDoHoverPopover } from './todo-hover-popover'
import { UploadModal } from './upload-modal'
import { requestToDoExtension } from '@/app/actions/todos'
import { ToDoStatus, PlatformType } from '@/types'
import { toast } from 'sonner'

interface ToDoCardProps {
  todo: {
    id: string
    title: string
    description: string | null
    status: ToDoStatus
    dueDate: Date | null
    platformType: PlatformType | null
    stepNumber: number | null
    extensionsUsed: number
    maxExtensions: number
    createdAt: Date
  }
  onUpdate?: () => void
}

type UrgencyLevel = 'overdue' | 'due_soon' | 'normal'

function getUrgencyLevel(dueDate: Date | null, status: ToDoStatus): UrgencyLevel {
  if (status === ToDoStatus.OVERDUE) return 'overdue'
  if (!dueDate) return 'normal'

  const now = new Date()
  const due = new Date(dueDate)
  const hoursUntilDue = (due.getTime() - now.getTime()) / (1000 * 60 * 60)

  if (hoursUntilDue < 0) return 'overdue'
  if (hoursUntilDue <= 24) return 'due_soon'
  return 'normal'
}

function formatDueStatus(dueDate: Date | null, status: ToDoStatus): string {
  if (status === ToDoStatus.OVERDUE) return 'Overdue'
  if (!dueDate) return 'No deadline'

  const now = new Date()
  const due = new Date(dueDate)
  const diffMs = due.getTime() - now.getTime()
  const diffHours = diffMs / (1000 * 60 * 60)
  const diffDays = Math.ceil(diffHours / 24)

  if (diffHours < 0) {
    const overdueDays = Math.ceil(Math.abs(diffHours) / 24)
    return `Overdue by ${overdueDays} day${overdueDays !== 1 ? 's' : ''}`
  }
  if (diffHours < 24) {
    const hours = Math.ceil(diffHours)
    return `Due in ${hours} hour${hours !== 1 ? 's' : ''}`
  }
  return `Due in ${diffDays} day${diffDays !== 1 ? 's' : ''}`
}

function getUrgencyStyles(urgency: UrgencyLevel) {
  switch (urgency) {
    case 'overdue':
      return {
        card: 'ring-destructive/50 bg-destructive/5',
        icon: 'text-destructive',
        progress: 'bg-destructive',
        text: 'text-destructive',
      }
    case 'due_soon':
      return {
        card: 'ring-accent/50 bg-accent/5',
        icon: 'text-accent',
        progress: 'bg-accent',
        text: 'text-accent',
      }
    default:
      return {
        card: 'ring-border/50 bg-card/50',
        icon: 'text-muted-foreground',
        progress: 'bg-primary',
        text: 'text-muted-foreground',
      }
  }
}

export function ToDoCard({ todo, onUpdate }: ToDoCardProps) {
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false)
  const [isExtending, startExtendTransition] = useTransition()

  const urgency = getUrgencyLevel(todo.dueDate, todo.status)
  const styles = getUrgencyStyles(urgency)
  const extensionsLeft = todo.maxExtensions - todo.extensionsUsed

  const handleExtend = () => {
    startExtendTransition(async () => {
      const result = await requestToDoExtension(todo.id)
      if (result.success) {
        toast.success('Deadline extended by 3 days')
        onUpdate?.()
      } else {
        toast.error(result.error || 'Failed to extend deadline')
      }
    })
  }

  return (
    <>
      <div className={`rounded-xl p-4 ring-1 transition-all ${styles.card}`}>
        {/* Header */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-start gap-3">
            <div className={`mt-0.5 ${styles.icon}`}>
              {urgency === 'overdue' ? (
                <AlertCircle className="h-5 w-5" />
              ) : (
                <Clock className="h-5 w-5" />
              )}
            </div>
            <div>
              <h4 className="text-sm font-semibold text-foreground">{todo.title}</h4>
              <p className={`text-xs font-medium ${styles.text}`}>
                {formatDueStatus(todo.dueDate, todo.status)}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {todo.stepNumber && (
              <Badge variant="outline" className="text-xs rounded-md">
                Step {todo.stepNumber}
              </Badge>
            )}
            <ToDoHoverPopover
              title={todo.title}
              platformType={todo.platformType}
              stepNumber={todo.stepNumber}
              createdAt={todo.createdAt}
            >
              <button className="flex h-6 w-6 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
                <Info className="h-4 w-4" />
              </button>
            </ToDoHoverPopover>
          </div>
        </div>

        {/* Description */}
        {todo.description && (
          <p className="text-xs text-muted-foreground mb-3 line-clamp-2">
            {todo.description}
          </p>
        )}

        {/* Progress Bar */}
        <div className="mb-4">
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted/50">
            <div
              className={`h-full rounded-full transition-all duration-500 ${styles.progress}`}
              style={{
                width: urgency === 'overdue' ? '100%' : urgency === 'due_soon' ? '75%' : '25%',
              }}
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <Button
            onClick={() => setIsUploadModalOpen(true)}
            className="flex-1 h-9"
          >
            <Upload className="h-4 w-4 mr-2" />
            Upload / Submit
          </Button>
          <Button
            variant="outline"
            onClick={handleExtend}
            disabled={extensionsLeft <= 0 || isExtending}
            className="h-9"
          >
            <Timer className="h-4 w-4 mr-2" />
            Extend 3 days
            <span className="ml-1.5 text-xs text-muted-foreground">
              ({extensionsLeft} left)
            </span>
          </Button>
        </div>
      </div>

      <UploadModal
        todoId={todo.id}
        todoTitle={todo.title}
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        onComplete={() => {
          setIsUploadModalOpen(false)
          onUpdate?.()
        }}
      />
    </>
  )
}
