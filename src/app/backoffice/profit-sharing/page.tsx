import { auth } from '@/backend/auth'
import { redirect } from 'next/navigation'
import { ProfitSharingView } from './_components/profit-sharing-view'
import { getProfitSharingOverview } from '@/backend/data/profit-sharing-overview'

export default async function ProfitSharingPage() {
  const session = await auth()
  if (!session?.user) redirect('/login')

  const data = await getProfitSharingOverview()
  return (
    <div
      className="space-y-6 p-6 animate-fade-in"
      data-testid="profit-sharing-page"
    >
      <div>
        <h1 className="text-2xl font-semibold text-foreground">
          Profit Sharing Rules
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Configure how profits are split with partners and manage pending
          payouts
        </p>
      </div>

      <ProfitSharingView data={data} />
    </div>
  )
}
