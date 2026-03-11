import { redirect } from 'next/navigation'
import { auth } from '@/backend/auth'
import { getAccountStatusesData } from '@/backend/data/account-statuses'
import { AccountStatusesView } from './_components/account-statuses-view'

export default async function AccountStatusesPage() {
  const session = await auth()
  if (!session?.user) redirect('/login')

  let data = null
  try {
    data = await getAccountStatusesData()
  } catch (e) {
    console.error('[account-statuses] data fetch error:', e)
  }

  if (!data) {
    return (
      <div className="flex h-[400px] items-center justify-center text-muted-foreground">
        Failed to load account statuses data.
      </div>
    )
  }

  return <AccountStatusesView data={data} />
}
