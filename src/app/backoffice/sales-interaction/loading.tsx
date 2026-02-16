import { Skeleton } from '@/components/ui/skeleton'

export default function SalesInteractionLoading() {
  return (
    <div className="flex h-[calc(100vh-4rem)]">
      {/* Left panel — Summary + Team Directory */}
      <div className="hidden w-56 shrink-0 flex-col border-r border-sidebar-border bg-sidebar lg:flex">
        <div className="space-y-2 border-b border-sidebar-border p-4">
          <Skeleton className="h-5 w-28" />
          <Skeleton className="h-3 w-36" />
        </div>
        {/* Summary statuses */}
        <div className="space-y-1.5 border-b border-sidebar-border p-3">
          <Skeleton className="mb-2 h-2.5 w-16" />
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-center justify-between rounded-md px-3 py-2">
              <div className="flex items-center gap-2">
                <Skeleton className="h-4 w-4 rounded" />
                <Skeleton className="h-3 w-20" />
              </div>
              <Skeleton className="h-5 w-8 rounded" />
            </div>
          ))}
        </div>
        {/* Team Directory */}
        <div className="space-y-2 border-b border-sidebar-border p-3">
          <Skeleton className="mb-2 h-2.5 w-24" />
          <Skeleton className="h-7 w-full rounded-md" />
        </div>
        <div className="flex-1 space-y-2 p-2">
          <Skeleton className="mb-1 h-2.5 w-20 px-2" />
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center justify-between rounded px-2 py-1.5">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-4 w-6" />
            </div>
          ))}
        </div>
      </div>

      {/* Main content */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Toolbar */}
        <div className="flex items-center gap-3 border-b border-border p-4">
          <Skeleton className="h-9 max-w-md flex-1 rounded-md" />
          <Skeleton className="h-9 w-28 rounded-md" />
          <Skeleton className="ml-auto h-9 w-28 rounded-md" />
        </div>
        {/* Results strip */}
        <div className="border-b border-border bg-muted/30 px-4 py-2">
          <Skeleton className="h-3 w-32" />
        </div>
        {/* Collapsible sections */}
        <div className="flex-1 space-y-4 p-4">
          {/* In Progress skeleton */}
          <div>
            <Skeleton className="h-11 w-full rounded-md" />
            <div className="mt-1 space-y-0 overflow-hidden rounded-b-md border border-t-0 border-border/50">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex items-center justify-between border-b border-border/30 px-4 py-3">
                  <div className="flex-1 space-y-1.5">
                    <Skeleton className="h-4 w-40" />
                    <Skeleton className="h-3 w-28" />
                  </div>
                  <Skeleton className="h-5 w-20 rounded-full" />
                  <Skeleton className="ml-4 h-8 w-20 rounded-md" />
                </div>
              ))}
            </div>
          </div>
          {/* Verification Needed skeleton */}
          <div>
            <Skeleton className="h-11 w-full rounded-md" />
            <div className="mt-1 space-y-0 overflow-hidden rounded-b-md border border-t-0 border-border/50">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex items-center justify-between border-b border-border/30 px-4 py-3">
                  <div className="flex-1 space-y-1.5">
                    <Skeleton className="h-4 w-40" />
                    <Skeleton className="h-3 w-28" />
                  </div>
                  <Skeleton className="h-5 w-20 rounded-full" />
                  <Skeleton className="ml-4 h-8 w-20 rounded-md" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
