import * as React from 'react'

import { cn } from '@/lib/utils'

function Textarea({ className, ...props }: React.ComponentProps<'textarea'>) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        'flex field-sizing-content min-h-16 w-full rounded-md border border-border bg-transparent px-3 py-2 text-base shadow-xs transition-all duration-200 outline-none',
        'placeholder:text-muted-foreground',
        'hover:border-border/80 dark:hover:border-primary/30',
        'focus-visible:border-primary/50 focus-visible:ring-primary/20 focus-visible:ring-[3px]',
        'disabled:cursor-not-allowed disabled:opacity-50',
        'aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40',
        'dark:bg-input/30 dark:border-border',
        'md:text-sm',
        className,
      )}
      {...props}
    />
  )
}

export { Textarea }
