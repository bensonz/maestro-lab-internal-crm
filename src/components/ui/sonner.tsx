'use client'

import { Toaster as Sonner } from 'sonner'

type ToasterProps = React.ComponentProps<typeof Sonner>

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      theme="dark"
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            'group toast group-[.toaster]:bg-card group-[.toaster]:text-foreground group-[.toaster]:border-border/50 group-[.toaster]:shadow-xl group-[.toaster]:rounded-xl group-[.toaster]:backdrop-blur-sm',
          description: 'group-[.toast]:text-muted-foreground',
          actionButton:
            'group-[.toast]:bg-primary group-[.toast]:text-primary-foreground group-[.toast]:shadow-sm',
          cancelButton:
            'group-[.toast]:bg-muted group-[.toast]:text-muted-foreground',
          success:
            'group-[.toaster]:border-success/30 group-[.toaster]:bg-success/5',
          error:
            'group-[.toaster]:border-destructive/30 group-[.toaster]:bg-destructive/5',
          info: 'group-[.toaster]:border-primary/30 group-[.toaster]:bg-primary/5',
          warning:
            'group-[.toaster]:border-warning/30 group-[.toaster]:bg-warning/5',
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
