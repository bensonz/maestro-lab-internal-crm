import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Search, Users, UserCheck, Smartphone, Clock, Plus } from 'lucide-react'

interface StatsHeaderProps {
  stats: {
    clientCount: number
    agentCount: number
    activeApps: number
    pendingCount: number
  }
  searchQuery: string
  onSearch: (query: string) => void
}

export function StatsHeader({
  stats,
  searchQuery,
  onSearch,
}: StatsHeaderProps) {
  return (
    <div className="space-y-4">
      {/* Title and Add Button */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Sales Interaction
          </h1>
          <p className="text-sm text-muted-foreground">Operations Console</p>
        </div>
        <Button variant="outline" size="sm" className="gap-1">
          <Plus className="h-4 w-4" />
          <span className="font-medium">A</span>
        </Button>
      </div>

      {/* Stats Pills */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 rounded-full bg-muted/50 px-4 py-2 ring-1 ring-border/30">
          <Users className="h-4 w-4 text-primary" />
          <span className="text-sm text-muted-foreground">Clients</span>
          <span className="font-semibold text-foreground">
            {stats.clientCount}
          </span>
        </div>
        <div className="flex items-center gap-2 rounded-full bg-muted/50 px-4 py-2 ring-1 ring-border/30">
          <UserCheck className="h-4 w-4 text-success" />
          <span className="text-sm text-muted-foreground">Agents</span>
          <span className="font-semibold text-foreground">
            {stats.agentCount}
          </span>
        </div>
        <div className="flex items-center gap-2 rounded-full bg-muted/50 px-4 py-2 ring-1 ring-border/30">
          <Smartphone className="h-4 w-4 text-chart-5" />
          <span className="text-sm text-muted-foreground">Active Apps</span>
          <span className="font-semibold text-foreground">
            {stats.activeApps}
          </span>
        </div>
        <div className="flex items-center gap-2 rounded-full bg-muted/50 px-4 py-2 ring-1 ring-border/30">
          <Clock className="h-4 w-4 text-warning" />
          <span className="text-sm text-muted-foreground">Pending</span>
          <span className="font-semibold text-warning">
            {stats.pendingCount}
          </span>
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search clients, tasks, phone numbers..."
          className="pl-10 bg-muted/30 border-border/50"
          value={searchQuery}
          onChange={(e) => onSearch(e.target.value)}
        />
      </div>
    </div>
  )
}
