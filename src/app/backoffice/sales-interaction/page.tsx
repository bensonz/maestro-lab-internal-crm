import {
  getTeamDirectory,
  getIntakeClients,
  getVerificationClients,
} from '@/backend/data/operations'
import { getClientStats, getAgentStats } from '@/backend/data/backoffice'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { TeamDirectory } from './_components/team-directory'

export default async function SalesInteractionPage() {
  const [teamDirectory, intakeClients, verificationClients, clientStats, agentStats] = await Promise.all([
    getTeamDirectory(),
    getIntakeClients(),
    getVerificationClients(),
    getClientStats(),
    getAgentStats(),
  ])

  const pendingIntake = intakeClients.filter((c) =>
    c.status === 'Needs More Info' || c.status === 'Pending External' || c.status === 'Ready to Approve'
  ).length

  return (
    <div className="p-6 text-white">
      {/* Header Stats */}
      <div className="mb-6 flex items-center gap-6">
        <h1 className="text-2xl font-bold">Sales Interaction</h1>
        <div className="flex gap-4 text-sm">
          <span className="rounded bg-slate-800 px-3 py-1">Clients <strong>{clientStats.total}</strong></span>
          <span className="rounded bg-slate-800 px-3 py-1">Agents <strong>{agentStats.totalAgents}</strong></span>
          <span className="rounded bg-slate-800 px-3 py-1">Active Apps <strong>{intakeClients.length}</strong></span>
          <span className="rounded bg-slate-800 px-3 py-1">Pending <strong className="text-red-400">{pendingIntake}</strong></span>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Team Directory */}
        <TeamDirectory agents={teamDirectory} />

        {/* New Client Intake */}
        <Card className="border-slate-800 bg-slate-900 lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center justify-between text-white">
              New Client Intake
              <Badge className="bg-slate-700">{intakeClients.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {intakeClients.length === 0 ? (
              <p className="text-center text-slate-400 py-8">No clients in intake process</p>
            ) : (
              <div className="space-y-2">
                {intakeClients.map((client) => (
                  <div key={client.id} className="flex items-center justify-between rounded bg-slate-800 p-3">
                    <div>
                      <p className="font-medium text-white">{client.name}</p>
                      <Badge className={client.statusColor}>{client.status}</Badge>
                    </div>
                    <div className="text-right text-sm">
                      <p className="text-slate-400">{client.agent}</p>
                      <p className="text-slate-500">{client.days} days</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Active Client Verification */}
      <Card className="mt-6 border-slate-800 bg-slate-900">
        <CardHeader>
          <CardTitle className="flex items-center justify-between text-white">
            Active Client Verification
            <Badge className="bg-slate-700">{verificationClients.length}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {verificationClients.length === 0 ? (
            <p className="text-center text-slate-400 py-8">No verification tasks pending</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-slate-400">
                    <th className="pb-2">Client</th>
                    <th className="pb-2">Platform</th>
                    <th className="pb-2">Task</th>
                    <th className="pb-2">Agent</th>
                    <th className="pb-2">Deadline</th>
                    <th className="pb-2">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {verificationClients.map((client) => (
                    <tr key={client.id} className="border-t border-slate-800">
                      <td className="py-3 font-medium text-white">{client.name}</td>
                      <td><Badge className="bg-blue-600">{client.platform}</Badge></td>
                      <td className="text-slate-300">{client.task}</td>
                      <td className="text-slate-400">{client.agent}</td>
                      <td className="text-slate-400">{client.days} days</td>
                      <td>
                        <Badge className={client.status === 'Done' ? 'bg-emerald-600' : 'bg-yellow-600'}>
                          {client.status}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
