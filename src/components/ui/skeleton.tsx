import { cn } from '@/lib/utils'

function Skeleton({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="skeleton"
      className={cn(
        'rounded-md bg-muted/50 dark:bg-muted/30',
        'animate-pulse',
        className,
      )}
      {...props}
    />
  )
}

export { Skeleton }
