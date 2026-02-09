import { auth } from '@/backend/auth'
import { redirect } from 'next/navigation'
import { PartnersView } from './_components/partners-view'
import { getPartnersOverview } from '@/backend/data/partners-overview'

export default async function PartnersPage() {
  const session = await auth()
  if (!session?.user) redirect('/login')

  const data = await getPartnersOverview()
  return (
    <div
      className="space-y-6 p-6 animate-fade-in"
      data-testid="partners-page"
    >
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Partners</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage partners, client assignments, and profit sharing relationships
        </p>
      </div>

      <PartnersView data={data} />
    </div>
  )
}
