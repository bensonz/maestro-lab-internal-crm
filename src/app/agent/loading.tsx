import { Skeleton } from '@/components/ui/skeleton'

export default function AgentDashboardLoading() {
  return (
    <div className="space-y-5 p-6">
      {/* Hero Banner skeleton */}
      <div className="card-terminal space-y-4 border-primary/20">
        {/* Money row */}
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <div className="space-y-1">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-9 w-28" />
          </div>
          <div className="space-y-1">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-7 w-20" />
          </div>
          <div className="space-y-1">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-7 w-20" />
          </div>
          <div className="flex items-end">
            <Skeleton className="h-8 w-16 rounded-full" />
          </div>
        </div>
        {/* Level row */}
        <div className="flex items-center gap-3">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-1.5 w-32" />
        </div>
        {/* Context line */}
        <Skeleton className="h-3 w-48" />
      </div>

      {/* Do Now skeleton */}
      <div>
        <div className="mb-3 flex items-center gap-3">
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-20 rounded-full" />
        </div>
        <div className="card-terminal space-y-1.5">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="flex items-center gap-3 rounded-lg border border-border p-2.5"
            >
              <Skeleton className="h-2 w-2 rounded-full" />
              <Skeleton className="h-4 w-48 flex-1" />
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-3 w-12" />
            </div>
          ))}
        </div>
      </div>

      {/* Pipeline + Scorecard skeleton */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Pipeline */}
        <div className="card-terminal">
          <Skeleton className="mb-3 h-3 w-16" />
          <div className="space-y-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex items-center justify-between py-1.5">
                <div className="flex items-center gap-2">
                  <Skeleton className="h-1.5 w-1.5 rounded-full" />
                  <Skeleton className="h-4 w-28" />
                </div>
                <Skeleton className="h-4 w-6" />
              </div>
            ))}
          </div>
        </div>
        {/* Scorecard */}
        <div className="card-terminal">
          <Skeleton className="mb-3 h-3 w-20" />
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center justify-between py-1.5">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-10" />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="border-t border-border pt-4">
        <Skeleton className="h-3 w-48" />
      </div>
    </div>
  )
}
