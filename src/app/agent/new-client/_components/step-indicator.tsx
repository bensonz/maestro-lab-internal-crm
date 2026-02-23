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
    <div className="mb-8 flex items-center justify-center" data-testid="step-indicator">
      {Array.from({ length: totalSteps }).map((_, i) => {
        const step = i + 1
        const isCompleted = step < currentStep
        const isCurrent = step === currentStep

        return (
          <div key={step} className="flex items-center">
            {/* Step circle */}
            <button
              type="button"
              className="flex flex-col items-center cursor-pointer"
              onClick={() => onStepChange?.(step)}
              data-testid={`step-circle-${step}`}
            >
              <div
                className={cn(
                  'flex h-8 w-8 items-center justify-center rounded-full border-2 text-xs font-semibold transition-colors',
                  isCompleted &&
                    'border-primary bg-primary text-primary-foreground',
                  isCurrent &&
                    'border-primary bg-background text-primary',
                  !isCompleted &&
                    !isCurrent &&
                    'border-muted-foreground/30 bg-background text-muted-foreground',
                  onStepChange && 'hover:border-primary hover:text-primary',
                )}
              >
                {isCompleted ? <Check className="h-4 w-4" /> : step}
              </div>
              <span
                className={cn(
                  'mt-1 text-[10px]',
                  isCurrent
                    ? 'font-medium text-foreground'
                    : 'text-muted-foreground',
                )}
              >
                {STEP_LABELS[i]}
              </span>
            </button>

            {/* Connector line */}
            {step < totalSteps && (
              <div
                className={cn(
                  'mx-2 h-0.5 w-12',
                  isCompleted ? 'bg-primary' : 'bg-muted-foreground/30',
                )}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}
