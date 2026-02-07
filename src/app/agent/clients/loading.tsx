import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent } from '@/components/ui/card'

export default function ClientsLoading() {
  return (
    <div className="flex h-[calc(100vh-4rem)]">
      {/* Summary panel skeleton */}
      <div className="hidden w-56 min-w-56 shrink-0 flex-col border-r border-sidebar-border bg-sidebar lg:flex">
        <div className="border-b border-sidebar-border p-4 space-y-2">
          <Skeleton className="h-5 w-24" />
          <Skeleton className="h-3 w-32" />
        </div>
        <div className="space-y-1 border-b border-sidebar-border p-3">
          <Skeleton className="mb-2 h-2.5 w-16" />
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex items-center justify-between rounded-md px-3 py-2">
              <div className="flex items-center gap-2">
                <Skeleton className="h-4 w-4" />
                <Skeleton className="h-3 w-20" />
              </div>
              <Skeleton className="h-5 w-8 rounded" />
            </div>
          ))}
        </div>
        <div className="space-y-3 p-3">
          <Skeleton className="h-2.5 w-20" />
          <Card className="border-border/50 bg-card/80">
            <CardContent className="space-y-2 p-3">
              <div className="flex items-center justify-between">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-3 w-8" />
              </div>
              <div className="flex items-center justify-between">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-3 w-8" />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Main content skeleton */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Toolbar */}
        <div className="flex items-center gap-3 border-b border-border p-4">
          <Skeleton className="h-9 max-w-md flex-1 rounded-md" />
          <Skeleton className="h-9 w-28 rounded-md" />
          <div className="ml-auto flex items-center gap-2">
            <Skeleton className="h-8 w-28 rounded-md" />
            <Skeleton className="h-9 w-20 rounded-md" />
          </div>
        </div>

        {/* Results count */}
        <div className="border-b border-border bg-muted/30 px-4 py-2">
          <Skeleton className="h-3 w-36" />
        </div>

        {/* Client list skeleton */}
        <div className="flex-1 p-4 space-y-2">
          <div className="mb-3 grid grid-cols-[1fr_120px_100px_140px_40px] gap-4 px-4 py-2">
            <Skeleton className="h-3 w-12" />
            <Skeleton className="h-3 w-12" />
            <Skeleton className="h-3 w-8" />
            <Skeleton className="h-3 w-20" />
            <div />
          </div>
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="grid grid-cols-[1fr_120px_100px_140px_40px] gap-4 border-b border-border/50 px-4 py-3">
              <div className="space-y-1.5">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-40" />
              </div>
              <Skeleton className="h-5 w-20 rounded-full" />
              <Skeleton className="h-3 w-12" />
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-4 w-4" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
