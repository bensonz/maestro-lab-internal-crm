import { auth } from '@/backend/auth'
import { redirect } from 'next/navigation'
import { getAgentClients, getAgentClientStats } from '@/backend/data/agent'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { Plus, Users, Clock, CheckCircle2, AlertCircle, XCircle } from 'lucide-react'

export default async function MyClientsPage() {
  const session = await auth()
  if (!session?.user) redirect('/login')

  const [clients, stats] = await Promise.all([
    getAgentClients(session.user.id),
    getAgentClientStats(session.user.id),
  ])

  return (
    <div className="min-h-screen p-6 lg:p-8">
      {/* Header */}
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between animate-fade-in-up">
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight text-foreground">
            My Clients
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage and track all your client applications
          </p>
        </div>
        <Link href="/agent/new-client">
          <Button className="btn-glow group h-11 rounded-xl bg-primary px-5 text-primary-foreground font-medium shadow-lg shadow-primary/25 transition-all duration-300 hover:bg-primary/90 hover:shadow-xl hover:shadow-primary/30">
            <Plus className="mr-2 h-4 w-4 transition-transform duration-300 group-hover:rotate-90" />
            New Client
          </Button>
        </Link>
      </div>

      {/* Stats Pills */}
      <div className="mb-8 flex flex-wrap gap-3 animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
        <div className="flex items-center gap-2 rounded-full bg-card/80 px-4 py-2 ring-1 ring-border/50 backdrop-blur-sm">
          <Users className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">Total:</span>
          <span className="font-semibold text-foreground">{stats.total}</span>
        </div>
        <div className="flex items-center gap-2 rounded-full bg-primary/10 px-4 py-2 ring-1 ring-primary/25">
          <Clock className="h-4 w-4 text-primary" />
          <span className="text-sm text-primary/80">In Progress:</span>
          <span className="font-semibold text-primary">{stats.inProgress}</span>
        </div>
        <div className="flex items-center gap-2 rounded-full bg-accent/10 px-4 py-2 ring-1 ring-accent/25">
          <AlertCircle className="h-4 w-4 text-accent" />
          <span className="text-sm text-accent/80">Pending:</span>
          <span className="font-semibold text-accent">{stats.pendingApproval}</span>
        </div>
        <div className="flex items-center gap-2 rounded-full bg-chart-4/10 px-4 py-2 ring-1 ring-chart-4/25">
          <CheckCircle2 className="h-4 w-4 text-chart-4" />
          <span className="text-sm text-chart-4/80">Approved:</span>
          <span className="font-semibold text-chart-4">{stats.approved}</span>
        </div>
        <div className="flex items-center gap-2 rounded-full bg-destructive/10 px-4 py-2 ring-1 ring-destructive/25">
          <XCircle className="h-4 w-4 text-destructive" />
          <span className="text-sm text-destructive/80">Rejected:</span>
          <span className="font-semibold text-destructive">{stats.rejected}</span>
        </div>
      </div>

      {/* Client Cards */}
      {clients.length === 0 ? (
        <Card className="border-border/50 bg-card/80 backdrop-blur-sm animate-fade-in-up" style={{ animationDelay: '0.15s' }}>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="mb-4 rounded-2xl bg-muted/50 p-4 ring-1 ring-border/30">
              <Users className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="mb-2 font-display text-lg font-semibold text-foreground">
              No clients yet
            </h3>
            <p className="mb-6 text-sm text-muted-foreground">
              Start by adding your first client
            </p>
            <Link href="/agent/new-client">
              <Button className="btn-glow h-11 rounded-xl bg-primary px-6 text-primary-foreground font-medium shadow-lg shadow-primary/25 transition-all duration-300 hover:bg-primary/90 hover:shadow-xl hover:shadow-primary/30">
                <Plus className="mr-2 h-4 w-4" />
                Add Your First Client
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3 stagger-children">
          {clients.map((client) => (
            <Link key={client.id} href={`/agent/clients/${client.id}`}>
              <Card className="group h-full border-border/50 bg-card/80 backdrop-blur-sm transition-all duration-300 hover:border-primary/40 hover:shadow-lg hover:shadow-primary/10 card-interactive cursor-pointer">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <CardTitle className="truncate text-lg font-semibold text-foreground">
                        {client.name}
                      </CardTitle>
                      {client.nextTask && (
                        <p className="mt-1 truncate text-sm text-muted-foreground">
                          Next: {client.nextTask}
                        </p>
                      )}
                    </div>
                    <Badge
                      className={`shrink-0 rounded-lg px-2.5 py-1 text-xs font-medium ${client.statusColor}`}
                    >
                      {client.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Progress Bar */}
                  <div>
                    <div className="mb-2 flex items-center justify-between text-xs">
                      <span className="font-medium text-muted-foreground">
                        Step {client.step} of {client.totalSteps}
                      </span>
                      <span className="font-semibold text-foreground">{client.progress}%</span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-muted/50">
                      <div
                        className="h-full rounded-full bg-linear-to-r from-primary to-primary/70 transition-all duration-500"
                        style={{ width: `${client.progress}%` }}
                      />
                    </div>
                  </div>

                  {/* Footer */}
                  <div className="flex items-center justify-between border-t border-border/40 pt-4">
                    <p className="text-xs text-muted-foreground">
                      Updated {client.lastUpdated}
                    </p>
                    <span className="text-xs text-muted-foreground transition-colors group-hover:text-primary">
                      View Details →
                    </span>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
