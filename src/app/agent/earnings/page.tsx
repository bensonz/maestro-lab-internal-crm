import { auth } from '@/backend/auth'
import { redirect } from 'next/navigation'
import { getAgentEarnings } from '@/backend/data/agent'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default async function EarningsPage() {
  const session = await auth()
  if (!session?.user) redirect('/login')

  const earnings = await getAgentEarnings(session.user.id)

  return (
    <div className="p-6 text-white">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">My Earnings</h1>
        <p className="text-slate-400">Track your commissions and payouts</p>
      </div>

      {/* Stats */}
      <div className="mb-6 grid gap-4 md:grid-cols-4">
        <Card className="border-slate-800 bg-slate-900">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-400">Total Earnings</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">
              ${earnings.totalEarnings.toLocaleString()}
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-800 bg-slate-900">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-400">Pending Payout</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">
              ${earnings.pendingPayout.toLocaleString()}
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-800 bg-slate-900">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-400">This Month</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">
              ${earnings.thisMonth.toLocaleString()}
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-800 bg-slate-900">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-400">Transactions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-500">
              {earnings.recentTransactions.length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Transactions */}
      <Card className="border-slate-800 bg-slate-900">
        <CardHeader>
          <CardTitle className="text-lg text-white">Recent Transactions</CardTitle>
        </CardHeader>
        <CardContent>
          {earnings.recentTransactions.length === 0 ? (
            <p className="text-center text-slate-400 py-8">No earnings recorded yet</p>
          ) : (
            <div className="space-y-4">
              {earnings.recentTransactions.map((tx) => (
                <div key={tx.id} className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-white">{tx.client}</p>
                    <p className="text-sm text-slate-400">{tx.date}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-white">+${tx.amount}</p>
                    <p className={`text-sm ${tx.status === 'Paid' ? 'text-emerald-500' : 'text-yellow-500'}`}>
                      {tx.status}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
