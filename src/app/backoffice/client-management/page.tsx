import { getAllClients, getClientStats } from '@/backend/data/backoffice'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ExportCSVButton } from '@/components/export-csv-button'
import { ClientList } from './_components/client-list'

export default async function ClientManagementPage() {
  const [clients, stats] = await Promise.all([
    getAllClients(),
    getClientStats(),
  ])

  return (
    <div className="p-6 lg:p-8 space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Client Management
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Overview of all client accounts and platform status
          </p>
        </div>
        <ExportCSVButton
          href="/api/export/clients"
          data-testid="export-clients-csv"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-4">
        {/* Stats Sidebar */}
        <div className="space-y-4">
          <Card className="card-terminal">
            <CardContent className="p-3">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                Total Clients
              </p>
              <p className="text-xl font-mono font-semibold mt-0.5 text-foreground">
                {stats.total}
              </p>
            </CardContent>
          </Card>

          <Card className="card-terminal">
            <CardContent className="p-3">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                Active
              </p>
              <p className="text-xl font-mono font-semibold mt-0.5 text-success">
                {stats.active}
              </p>
            </CardContent>
          </Card>

          <Card className="card-terminal">
            <CardContent className="p-3">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                Closed
              </p>
              <p className="text-xl font-mono font-semibold mt-0.5 text-muted-foreground">
                {stats.closed}
              </p>
            </CardContent>
          </Card>

          <Card className="card-terminal">
            <CardContent className="p-3">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                Further Verification
              </p>
              <p className="text-xl font-mono font-semibold mt-0.5 text-warning">
                {stats.furtherVerification}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Client Registry */}
        <ClientList clients={clients} />
      </div>
    </div>
  )
}
