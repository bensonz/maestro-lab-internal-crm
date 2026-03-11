import { redirect } from 'next/navigation'
import { auth } from '@/backend/auth'
import { getDailyBalancesData } from '@/backend/data/action-hub'
import { DailyBalanceView } from './_components/daily-balance-view'

interface Props {
  searchParams: Promise<{ date?: string }>
}

export default async function DailyBalancesPage({ searchParams }: Props) {
  const session = await auth()
  if (!session?.user) redirect('/login')

  const params = await searchParams
  const dateParam = params.date ?? undefined

  let data = null
  try {
    data = await getDailyBalancesData(dateParam)
  } catch (e) {
    console.error('[daily-balances] data fetch error:', e)
  }

  if (!data) {
    return (
      <div className="flex h-[400px] items-center justify-center text-muted-foreground">
        Failed to load daily balances data.
      </div>
    )
  }

  return <DailyBalanceView data={data} />
}
