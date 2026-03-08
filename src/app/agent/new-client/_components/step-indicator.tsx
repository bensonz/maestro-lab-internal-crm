'use client'

import { cn } from '@/lib/utils'
import { Check, Lock } from 'lucide-react'

const STEP_LABELS = ['Pre-Qual', 'Background', 'Platforms', 'Contract']

interface StepIndicatorProps {
  currentStep: number
  totalSteps: number
  onStepChange?: (step: number) => void
  /** The highest step the user can navigate to (steps above are locked) */
  maxReachableStep?: number
}

export function StepIndicator({ currentStep, totalSteps, onStepChange, maxReachableStep }: StepIndicatorProps) {
  return (
    <div className="mb-8" data-testid="step-indicator">
      <div className="flex w-full rounded-lg border bg-muted/30 p-1">
        {Array.from({ length: totalSteps }).map((_, i) => {
          const step = i + 1
          const isCompleted = step < currentStep
          const isCurrent = step === currentStep
          const isLocked = maxReachableStep !== undefined && step > maxReachableStep && step !== currentStep

          return (
            <button
              key={step}
              type="button"
              className={cn(
                'flex flex-1 items-center justify-center gap-2 rounded-md px-3 py-2.5 text-sm font-medium transition-all',
                isCurrent &&
                  'bg-background text-foreground shadow-sm cursor-default',
                isCompleted && !isLocked &&
                  'text-primary hover:bg-background/50 cursor-pointer',
                isLocked &&
                  'cursor-not-allowed opacity-40 text-muted-foreground',
                !isCompleted && !isCurrent && !isLocked &&
                  'text-muted-foreground hover:text-foreground hover:bg-background/30 cursor-pointer',
              )}
              onClick={() => {
                if (isLocked) return
                onStepChange?.(step)
              }}
              disabled={isLocked}
              data-testid={`step-circle-${step}`}
            >
              <span
                className={cn(
                  'flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold',
                  isCurrent &&
                    'bg-primary text-primary-foreground',
                  isCompleted && !isLocked &&
                    'bg-primary text-primary-foreground',
                  isLocked &&
                    'bg-muted-foreground/10 text-muted-foreground',
                  !isCompleted && !isCurrent && !isLocked &&
                    'bg-muted-foreground/20 text-muted-foreground',
                )}
              >
                {isLocked ? (
                  <Lock className="h-3 w-3" />
                ) : isCompleted ? (
                  <Check className="h-3.5 w-3.5" />
                ) : (
                  step
                )}
              </span>
              <span className="hidden sm:inline">{STEP_LABELS[i]}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
