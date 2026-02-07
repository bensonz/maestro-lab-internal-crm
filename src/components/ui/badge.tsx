import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { Slot } from 'radix-ui'

import { cn } from '@/lib/utils'

const badgeVariants = cva(
  'inline-flex items-center justify-center rounded-full border px-2.5 py-0.5 text-xs font-medium w-fit whitespace-nowrap shrink-0 [&>svg]:size-3 gap-1.5 [&>svg]:pointer-events-none transition-all duration-200 overflow-hidden',
  {
    variants: {
      variant: {
        default:
          'border-transparent bg-primary text-primary-foreground shadow-sm [a&]:hover:bg-primary/90',
        secondary:
          'border-transparent bg-secondary text-secondary-foreground [a&]:hover:bg-secondary/80',
        destructive:
          'border-transparent bg-destructive text-white shadow-sm [a&]:hover:bg-destructive/90 dark:bg-destructive/80',
        outline:
          'border-border text-foreground bg-transparent [a&]:hover:bg-primary/10 [a&]:hover:border-primary/40 [a&]:hover:text-foreground',
        ghost:
          'border-transparent [a&]:hover:bg-primary/10 [a&]:hover:text-foreground',
        success:
          'border-transparent bg-success/20 text-success dark:bg-success/15',
        warning:
          'border-transparent bg-warning/20 text-warning dark:bg-warning/15',
        info: 'border-transparent bg-primary/20 text-primary dark:bg-primary/15',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
)

function Badge({
  className,
  variant = 'default',
  asChild = false,
  ...props
}: React.ComponentProps<'span'> &
  VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot.Root : 'span'

  return (
    <Comp
      data-slot="badge"
      data-variant={variant}
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  )
}

export { Badge, badgeVariants }
