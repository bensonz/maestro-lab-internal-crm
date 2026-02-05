import { getAllClients, getClientStats } from '@/backend/data/backoffice'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ClientList } from './_components/client-list'

export default async function ClientManagementPage() {
  const [clients, stats] = await Promise.all([
    getAllClients(),
    getClientStats(),
  ])

  return (
    <div className="p-6 text-white">
      <h1 className="mb-6 text-2xl font-bold">Client Management</h1>

      <div className="grid gap-6 lg:grid-cols-4">
        {/* Stats Sidebar */}
        <div className="space-y-4">
          <Card className="border-slate-800 bg-slate-900">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-slate-400">Total Clients</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-white">{stats.total}</div>
            </CardContent>
          </Card>

          <Card className="border-slate-800 bg-slate-900">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-slate-400">Active</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-emerald-500">{stats.active}</div>
            </CardContent>
          </Card>

          <Card className="border-slate-800 bg-slate-900">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-slate-400">Closed</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-slate-400">{stats.closed}</div>
            </CardContent>
          </Card>

          <Card className="border-slate-800 bg-slate-900">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-slate-400">Further Verification</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-yellow-500">{stats.furtherVerification}</div>
            </CardContent>
          </Card>
        </div>

        {/* Client Registry */}
        <ClientList clients={clients} />
      </div>
    </div>
  )
}
