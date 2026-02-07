import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent } from '@/components/ui/card'

export default function ClientManagementLoading() {
  return (
    <div className="space-y-6 p-6 lg:p-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <Skeleton className="h-7 w-40" />
          <Skeleton className="h-4 w-64" />
        </div>
        <Skeleton className="h-9 w-28 rounded-md" />
      </div>

      <div className="grid gap-6 lg:grid-cols-4">
        {/* Stats sidebar */}
        <div className="space-y-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className="border-border/50 bg-card/80">
              <CardContent className="p-3">
                <Skeleton className="mb-1 h-2.5 w-20" />
                <Skeleton className="h-6 w-12" />
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Table */}
        <div className="lg:col-span-3">
          <Card className="border-border/50 bg-card/80">
            <div className="border-b border-border p-4">
              <Skeleton className="h-9 w-full max-w-sm rounded-md" />
            </div>
            <CardContent className="p-0">
              {/* Table header */}
              <div className="grid grid-cols-[1fr_100px_100px_80px_100px] gap-4 border-b border-border px-4 py-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-3 w-16" />
                ))}
              </div>
              {/* Table rows */}
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="grid grid-cols-[1fr_100px_100px_80px_100px] gap-4 border-b border-border/50 px-4 py-3">
                  <div className="space-y-1">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-20" />
                  </div>
                  <Skeleton className="h-5 w-20 rounded-full" />
                  <Skeleton className="h-3 w-12" />
                  <Skeleton className="h-1.5 w-full rounded-full" />
                  <Skeleton className="h-3 w-16" />
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
