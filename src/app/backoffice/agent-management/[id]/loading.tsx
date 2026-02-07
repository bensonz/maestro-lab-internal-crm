import { Card, CardContent, CardHeader } from '@/components/ui/card'

export default function AgentDetailLoading() {
  return (
    <div className="space-y-6 p-6 animate-fade-in">
      {/* Header skeleton */}
      <div className="flex items-center gap-4">
        <div className="h-9 w-16 rounded-md bg-muted shimmer" />
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-muted shimmer" />
          <div className="space-y-2">
            <div className="h-5 w-40 rounded bg-muted shimmer" />
            <div className="h-3 w-20 rounded bg-muted shimmer" />
          </div>
        </div>
      </div>

      {/* Top 3-column grid skeleton */}
      <div className="grid grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="card-terminal">
            <CardHeader className="px-3 py-2">
              <div className="h-4 w-24 rounded bg-muted shimmer" />
            </CardHeader>
            <CardContent className="space-y-2 p-3 pt-0">
              {[1, 2, 3, 4, 5].map((j) => (
                <div key={j} className="flex justify-between">
                  <div className="h-3 w-20 rounded bg-muted shimmer" />
                  <div className="h-3 w-28 rounded bg-muted shimmer" />
                </div>
              ))}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* 4-card performance summary skeleton */}
      <div className="grid grid-cols-4 gap-3">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="card-terminal">
            <CardContent className="p-3 text-center">
              <div className="mx-auto h-7 w-16 rounded bg-muted shimmer" />
              <div className="mx-auto mt-2 h-3 w-20 rounded bg-muted shimmer" />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Performance + Team skeleton */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="card-terminal col-span-2">
          <CardHeader className="px-3 py-2">
            <div className="h-4 w-36 rounded bg-muted shimmer" />
          </CardHeader>
          <CardContent className="space-y-2 p-3 pt-0">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="flex justify-between">
                <div className="h-3 w-32 rounded bg-muted shimmer" />
                <div className="h-3 w-12 rounded bg-muted shimmer" />
              </div>
            ))}
          </CardContent>
        </Card>
        <Card className="card-terminal">
          <CardHeader className="px-3 py-2">
            <div className="h-4 w-28 rounded bg-muted shimmer" />
          </CardHeader>
          <CardContent className="space-y-3 p-3 pt-0">
            <div className="h-3 w-16 rounded bg-muted shimmer" />
            <div className="flex items-center gap-2">
              <div className="h-6 w-6 rounded-full bg-muted shimmer" />
              <div className="h-3 w-28 rounded bg-muted shimmer" />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
