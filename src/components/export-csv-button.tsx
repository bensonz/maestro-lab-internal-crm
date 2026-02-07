'use client'

import { Download } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface ExportCSVButtonProps {
  href: string
  'data-testid': string
}

export function ExportCSVButton({
  href,
  'data-testid': testId,
}: ExportCSVButtonProps) {
  return (
    <Button
      variant="outline"
      size="sm"
      data-testid={testId}
      onClick={() => {
        window.location.href = href
      }}
    >
      <Download className="mr-2 h-4 w-4" />
      Export CSV
    </Button>
  )
}
