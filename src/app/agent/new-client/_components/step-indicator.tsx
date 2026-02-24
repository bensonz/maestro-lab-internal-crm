'use client'

import { cn } from '@/lib/utils'
import { Check } from 'lucide-react'

const STEP_LABELS = ['Pre-Qual', 'Background', 'Platforms', 'Contract']

interface StepIndicatorProps {
  currentStep: number
  totalSteps: number
  onStepChange?: (step: number) => void
}

export function StepIndicator({ currentStep, totalSteps, onStepChange }: StepIndicatorProps) {
  return (
    <div className="mb-8" data-testid="step-indicator">
      <div className="flex w-full rounded-lg border bg-muted/30 p-1">
        {Array.from({ length: totalSteps }).map((_, i) => {
          const step = i + 1
          const isCompleted = step < currentStep
          const isCurrent = step === currentStep

          return (
            <button
              key={step}
              type="button"
              className={cn(
                'flex flex-1 items-center justify-center gap-2 rounded-md px-3 py-2.5 text-sm font-medium transition-all cursor-pointer',
                isCurrent &&
                  'bg-background text-foreground shadow-sm',
                isCompleted &&
                  'text-primary hover:bg-background/50',
                !isCompleted &&
                  !isCurrent &&
                  'text-muted-foreground hover:text-foreground hover:bg-background/30',
              )}
              onClick={() => onStepChange?.(step)}
              data-testid={`step-circle-${step}`}
            >
              <span
                className={cn(
                  'flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold',
                  isCurrent &&
                    'bg-primary text-primary-foreground',
                  isCompleted &&
                    'bg-primary text-primary-foreground',
                  !isCompleted &&
                    !isCurrent &&
                    'bg-muted-foreground/20 text-muted-foreground',
                )}
              >
                {isCompleted ? <Check className="h-3.5 w-3.5" /> : step}
              </span>
              <span className="hidden sm:inline">{STEP_LABELS[i]}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
