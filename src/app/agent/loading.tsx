import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent } from '@/components/ui/card'

export default function AgentDashboardLoading() {
  return (
    <div className="min-h-screen space-y-8 p-6 lg:p-8">
      {/* Client Status */}
      <section>
        <Skeleton className="mb-4 h-4 w-28" />
        <div className="grid gap-4 sm:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i} className="border-l-2 border-l-muted border-border/50 bg-card/80">
              <CardContent className="flex items-center gap-4 py-5">
                <Skeleton className="h-12 w-12 rounded-xl" />
                <div className="space-y-2">
                  <Skeleton className="h-3 w-32" />
                  <Skeleton className="h-8 w-16" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Financial Overview */}
      <section>
        <Skeleton className="mb-4 h-4 w-36" />
        <div className="grid gap-4 sm:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i} className="border-border/50 bg-card/80">
              <CardContent className="py-5">
                <Skeleton className="mb-3 h-10 w-10 rounded-lg" />
                <Skeleton className="mb-1 h-3 w-28" />
                <Skeleton className="h-7 w-20" />
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Today's Tasks */}
      <section>
        <Skeleton className="mb-4 h-4 w-28" />
        <Card className="border-border/50 bg-card/80">
          <CardContent className="space-y-3 py-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 rounded-lg border border-border p-3">
                <div className="min-w-0 flex-1 space-y-2">
                  <Skeleton className="h-4 w-48" />
                  <Skeleton className="h-3 w-64" />
                </div>
                <Skeleton className="h-4 w-4" />
              </div>
            ))}
          </CardContent>
        </Card>
      </section>

      {/* To-Dos */}
      <section>
        <Skeleton className="mb-4 h-4 w-20" />
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="border-border/50 bg-card/80">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <div className="space-y-1.5">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-40" />
                  </div>
                  <Skeleton className="h-5 w-16 rounded-lg" />
                </div>
                <div className="space-y-1.5">
                  <div className="flex justify-between">
                    <Skeleton className="h-3 w-20" />
                    <Skeleton className="h-3 w-8" />
                  </div>
                  <Skeleton className="h-1.5 w-full rounded-full" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
    </div>
  )
}
