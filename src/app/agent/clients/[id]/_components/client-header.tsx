import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { ArrowLeft, Mail, Phone, Calendar, User } from 'lucide-react'

interface ClientHeaderProps {
  client: {
    name: string
    firstName: string
    lastName: string
    email: string | null
    phone: string | null
    status: string
    statusColor: string
    deadline: Date | null
    agent: {
      name: string
    }
    createdAt: Date
  }
}

export function ClientHeader({ client }: ClientHeaderProps) {
  return (
    <div className="animate-fade-in-up">
      {/* Back Button */}
      <Link href="/agent/clients">
        <Button
          variant="ghost"
          size="sm"
          className="mb-4 h-9 rounded-lg text-muted-foreground hover:bg-muted/50 hover:text-foreground"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Clients
        </Button>
      </Link>

      {/* Client Info Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <h1 className="font-display text-2xl font-semibold tracking-tight text-foreground">
              {client.name}
            </h1>
            <Badge className={`rounded-lg px-2.5 py-1 text-xs font-medium ${client.statusColor}`}>
              {client.status}
            </Badge>
          </div>

          {/* Contact Info Pills */}
          <div className="flex flex-wrap gap-2">
            {client.phone && (
              <div className="flex items-center gap-1.5 rounded-lg bg-muted/50 px-3 py-1.5 text-sm ring-1 ring-border/30">
                <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-foreground">{client.phone}</span>
              </div>
            )}
            {client.email && (
              <div className="flex items-center gap-1.5 rounded-lg bg-muted/50 px-3 py-1.5 text-sm ring-1 ring-border/30">
                <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-foreground">{client.email}</span>
              </div>
            )}
            <div className="flex items-center gap-1.5 rounded-lg bg-muted/50 px-3 py-1.5 text-sm ring-1 ring-border/30">
              <User className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-muted-foreground">Agent:</span>
              <span className="text-foreground">{client.agent.name}</span>
            </div>
          </div>
        </div>

        {/* Dates */}
        <div className="flex flex-col gap-2 text-sm">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Calendar className="h-4 w-4" />
            <span>Created: {formatDate(client.createdAt)}</span>
          </div>
          {client.deadline && (
            <div className="flex items-center gap-2 text-accent">
              <Calendar className="h-4 w-4" />
              <span>Deadline: {formatDate(client.deadline)}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function formatDate(date: Date): string {
  return new Date(date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}
