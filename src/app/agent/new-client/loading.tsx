import { Skeleton } from '@/components/ui/skeleton'

export default function NewClientLoading() {
  return (
    <div className="flex h-[calc(100vh-4rem)]">
      {/* Left panel */}
      <div className="hidden w-56 flex-col border-r p-3 lg:flex">
        <Skeleton className="mb-3 h-8 w-full" />
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-14 w-full rounded-md" />
          ))}
        </div>
      </div>

      {/* Center */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="mx-auto max-w-2xl space-y-6">
          <Skeleton className="mx-auto h-10 w-80" />
          <div className="space-y-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-16 w-full rounded-md" />
            ))}
          </div>
        </div>
      </div>

      {/* Right panel */}
      <div className="hidden w-56 flex-col border-l p-3 lg:flex">
        <Skeleton className="mb-3 h-6 w-24" />
        <Skeleton className="mb-4 h-20 w-full rounded-md" />
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-6 w-full" />
          ))}
        </div>
      </div>
    </div>
  )
}
