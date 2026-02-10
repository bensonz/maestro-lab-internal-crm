import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent, CardHeader } from '@/components/ui/card'

export default function NewClientLoading() {
  return (
    <div className="flex h-[calc(100vh-4rem)]">
      {/* Pipeline panel skeleton (desktop only) */}
      <div className="hidden w-72 shrink-0 border-r border-border bg-card p-4 lg:block">
        <div className="mb-4 flex items-center justify-between">
          <Skeleton className="h-5 w-20" />
          <Skeleton className="h-7 w-14 rounded-md" />
        </div>
        <Skeleton className="mb-3 h-8 w-full rounded-md" />
        <Skeleton className="mb-4 h-8 w-full rounded-md" />
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-2 px-2 py-1.5">
              <Skeleton className="h-6 w-0.5 rounded-full" />
              <Skeleton className="h-4 w-4 rounded" />
              <div className="min-w-0 flex-1 space-y-1">
                <Skeleton className="h-3 w-24" />
                <Skeleton className="h-2.5 w-32" />
              </div>
              <Skeleton className="h-2.5 w-12" />
            </div>
          ))}
        </div>
      </div>

      {/* Form panel skeleton */}
      <div className="flex-1 overflow-y-auto p-6 lg:p-8">
        {/* Status header skeleton */}
        <div className="mb-6 flex items-center gap-3">
          <Skeleton className="h-8 w-8 rounded-md" />
          <Skeleton className="h-5 w-20 rounded-full" />
          <Skeleton className="h-5 w-28 rounded-full" />
          <Skeleton className="h-5 w-20 rounded-full" />
          <div className="flex-1" />
          <Skeleton className="h-8 w-24 rounded-md" />
          <Skeleton className="h-8 w-32 rounded-md" />
        </div>

        <div className="mx-auto max-w-3xl">
          {/* Phase header skeleton */}
          <div className="mb-4 flex items-center gap-3">
            <Skeleton className="h-5 w-16 rounded-full" />
            <Skeleton className="h-4 w-28" />
            <div className="flex-1 border-t border-border/50" />
          </div>

          {/* Form skeleton */}
          <Card className="border-border/50 bg-card/80">
            <CardHeader>
              <Skeleton className="h-5 w-36" />
              <Skeleton className="h-3 w-52" />
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="space-y-2">
                    <Skeleton className="h-3 w-20" />
                    <Skeleton className="h-9 w-full rounded-md" />
                  </div>
                ))}
              </div>
              <div className="space-y-2">
                <Skeleton className="h-3 w-16" />
                <Skeleton className="h-24 w-full rounded-md" />
              </div>
              <div className="flex gap-3 pt-4">
                <Skeleton className="h-10 w-32 rounded-md" />
                <Skeleton className="h-10 w-28 rounded-md" />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
