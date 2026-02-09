import { auth } from '@/backend/auth'
import { redirect } from 'next/navigation'
import { CommissionsView } from './_components/commissions-view'
import { getCommissionOverview } from '@/backend/data/commission-overview'

export default async function CommissionsPage() {
  const session = await auth()
  if (!session?.user) redirect('/login')

  const overview = await getCommissionOverview()
  return (
    <div className="space-y-6 p-6 animate-fade-in" data-testid="commissions-page">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">
          Commissions
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Commission rules, bonus pool history, agent tiers, and payout management
        </p>
      </div>

      <CommissionsView data={overview} />
    </div>
  )
}
