import { auth } from '@/backend/auth'
import { redirect, notFound } from 'next/navigation'
import { getClientDetail } from '@/backend/data/agent'
import { SPORTS_PLATFORMS, FINANCIAL_PLATFORMS } from '@/lib/platforms'
import { ClientHeader } from './_components/client-header'
import { PlatformCard } from './_components/platform-card'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function ClientDetailPage({ params }: PageProps) {
  const session = await auth()
  if (!session?.user) redirect('/login')

  const { id } = await params
  const client = await getClientDetail(id, session.user.id)

  if (!client) {
    notFound()
  }

  // Separate platforms by category and maintain order
  const sportsPlatforms = client.platforms.filter((p) =>
    SPORTS_PLATFORMS.includes(p.platformType)
  )
  const financialPlatforms = client.platforms.filter((p) =>
    FINANCIAL_PLATFORMS.includes(p.platformType)
  )

  // Count verified platforms
  const verifiedCount = client.platforms.filter(
    (p) => p.status === 'VERIFIED'
  ).length
  const totalCount = client.platforms.length

  return (
    <div className="min-h-screen p-6 lg:p-8">
      {/* Client Header */}
      <ClientHeader client={client} />

      {/* Progress Summary */}
      <div
        className="mt-8 mb-6 flex items-center gap-4 animate-fade-in-up"
        style={{ animationDelay: '0.1s' }}
      >
        <div className="flex-1">
          <div className="mb-2 flex items-center justify-between text-sm">
            <span className="font-medium text-muted-foreground">
              Platform Progress
            </span>
            <span className="font-semibold text-foreground">
              {verifiedCount} of {totalCount} verified
            </span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-muted/50">
            <div
              className="h-full rounded-full bg-gradient-to-r from-primary to-chart-4 transition-all duration-500"
              style={{ width: `${(verifiedCount / totalCount) * 100}%` }}
            />
          </div>
        </div>
      </div>

      {/* Sports Platforms */}
      <section className="mb-8 animate-fade-in-up" style={{ animationDelay: '0.15s' }}>
        <h2 className="mb-4 font-display text-lg font-semibold text-foreground">
          Sports Betting Platforms
          <span className="ml-2 text-sm font-normal text-muted-foreground">
            ({sportsPlatforms.length})
          </span>
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {sportsPlatforms.map((platform) => (
            <PlatformCard key={platform.id} platform={platform} />
          ))}
        </div>
      </section>

      {/* Financial Platforms */}
      <section className="animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
        <h2 className="mb-4 font-display text-lg font-semibold text-foreground">
          Financial Platforms
          <span className="ml-2 text-sm font-normal text-muted-foreground">
            ({financialPlatforms.length})
          </span>
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {financialPlatforms.map((platform) => (
            <PlatformCard key={platform.id} platform={platform} />
          ))}
        </div>
      </section>
    </div>
  )
}
