'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Search,
  MoreHorizontal,
  Pencil,
  KeyRound,
  ShieldOff,
  ShieldCheck,
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { EditUserDialog } from './edit-user-dialog'

interface Agent {
  id: string
  name: string
  tier: string
  phone: string
  start: string
  clients: number
  working: number
  successRate: number
  delayRate: number
  avgDaysToConvert: number | null
}

interface UserData {
  id: string
  name: string
  email: string
  role: string
  phone: string
  isActive: boolean
  createdAt: string
  clientCount: number
}

interface AgentListProps {
  agents: Agent[]
  users: UserData[]
  currentUserRole: string
  currentUserId: string
}

type TabKey = 'agents' | 'users'

const ROLE_BADGE_STYLES: Record<string, string> = {
  AGENT: 'bg-primary/20 text-primary border-primary/30',
  BACKOFFICE: 'bg-warning/20 text-warning border-warning/30',
  ADMIN: 'bg-chart-5/20 text-chart-5 border-chart-5/30',
  FINANCE: 'bg-chart-3/20 text-chart-3 border-chart-3/30',
}

function getSuccessRateBg(rate: number): string {
  if (rate >= 80) return 'bg-success/20 text-success border-success/30'
  if (rate >= 60) return 'bg-warning/20 text-warning border-warning/30'
  return 'bg-destructive/20 text-destructive border-destructive/30'
}

function getDelayRateBg(rate: number): string {
  if (rate <= 10) return 'bg-success/20 text-success border-success/30'
  if (rate <= 20) return 'bg-warning/20 text-warning border-warning/30'
  return 'bg-destructive/20 text-destructive border-destructive/30'
}

export function AgentList({
  agents,
  users,
  currentUserRole,
  currentUserId,
}: AgentListProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [activeTab, setActiveTab] = useState<TabKey>('agents')
  const [editingUser, setEditingUser] = useState<UserData | null>(null)

  const filteredAgents = agents.filter(
    (agent) =>
      agent.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      agent.phone.includes(searchQuery),
  )

  const filteredUsers = users.filter(
    (user) =>
      user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.role.toLowerCase().includes(searchQuery.toLowerCase()),
  )

  return (
    <>
      <Card className="border-border/50 bg-card/80 backdrop-blur-sm lg:col-span-3">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex gap-1">
              <button
                onClick={() => setActiveTab('agents')}
                className={`px-3 py-1.5 text-xs font-semibold uppercase tracking-wider rounded-md transition-colors ${
                  activeTab === 'agents'
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
                data-testid="tab-agents"
              >
                Agent Directory ({agents.length})
              </button>
              <button
                onClick={() => setActiveTab('users')}
                className={`px-3 py-1.5 text-xs font-semibold uppercase tracking-wider rounded-md transition-colors ${
                  activeTab === 'users'
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
                data-testid="tab-users"
              >
                All Users ({users.length})
              </button>
            </div>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={
                activeTab === 'agents' ? 'Search agents...' : 'Search users...'
              }
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
              data-testid="agent-search-input"
            />
          </div>
        </CardHeader>
        <CardContent>
          {activeTab === 'agents' ? (
            /* Agent Directory Tab */
            filteredAgents.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                {agents.length === 0
                  ? 'No agents registered'
                  : 'No agents match your search'}
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-muted-foreground">
                      <th className="pb-3 font-medium">Agent</th>
                      <th className="pb-3 font-medium">Phone</th>
                      <th className="pb-3 font-medium">Start</th>
                      <th className="pb-3 font-medium">Clients</th>
                      <th className="pb-3 font-medium">Working</th>
                      <th className="pb-3 font-medium">Success %</th>
                      <th className="pb-3 font-medium">Delay %</th>
                      <th className="pb-3 font-medium">Avg Convert</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredAgents.map((agent) => (
                      <tr
                        key={agent.id}
                        className="border-t border-border/50"
                        data-testid={`agent-row-${agent.id}`}
                      >
                        <td className="py-3">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-muted-foreground">
                              {agent.tier}
                            </span>
                            <span className="font-medium text-foreground">
                              {agent.name}
                            </span>
                          </div>
                        </td>
                        <td className="text-muted-foreground">
                          {agent.phone || '—'}
                        </td>
                        <td className="text-muted-foreground">{agent.start}</td>
                        <td className="text-foreground font-mono">
                          {agent.clients}
                        </td>
                        <td className="text-muted-foreground font-mono">
                          {agent.working}
                        </td>
                        <td>
                          <Badge
                            className={`text-xs font-mono ${getSuccessRateBg(agent.successRate)}`}
                          >
                            {agent.successRate}%
                          </Badge>
                        </td>
                        <td>
                          <Badge
                            className={`text-xs font-mono ${getDelayRateBg(agent.delayRate)}`}
                          >
                            {agent.delayRate}%
                          </Badge>
                        </td>
                        <td className="font-mono text-muted-foreground">
                          {agent.avgDaysToConvert !== null
                            ? `${agent.avgDaysToConvert}d`
                            : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          ) : /* All Users Tab */
          filteredUsers.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              {users.length === 0
                ? 'No users registered'
                : 'No users match your search'}
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-muted-foreground">
                    <th className="pb-3 font-medium">Name</th>
                    <th className="pb-3 font-medium">Email</th>
                    <th className="pb-3 font-medium">Role</th>
                    <th className="pb-3 font-medium">Status</th>
                    <th className="pb-3 font-medium">Phone</th>
                    <th className="pb-3 font-medium">Clients</th>
                    <th className="pb-3 font-medium">Joined</th>
                    <th className="pb-3 font-medium sr-only">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map((user) => (
                    <tr
                      key={user.id}
                      className={`border-t border-border/50 ${!user.isActive ? 'opacity-50' : ''}`}
                      data-testid={`user-row-${user.id}`}
                    >
                      <td className="py-3 font-medium text-foreground">
                        {user.name}
                      </td>
                      <td className="text-muted-foreground">{user.email}</td>
                      <td>
                        <Badge
                          className={`text-xs ${ROLE_BADGE_STYLES[user.role] || 'bg-muted text-muted-foreground'}`}
                          data-testid={`user-role-badge-${user.id}`}
                        >
                          {user.role}
                        </Badge>
                      </td>
                      <td>
                        <Badge
                          className={`text-xs ${
                            user.isActive
                              ? 'bg-success/20 text-success border-success/30'
                              : 'bg-destructive/20 text-destructive border-destructive/30'
                          }`}
                          data-testid={`user-status-badge-${user.id}`}
                        >
                          {user.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                      </td>
                      <td className="text-muted-foreground">
                        {user.phone || '—'}
                      </td>
                      <td className="text-foreground font-mono">
                        {user.clientCount}
                      </td>
                      <td className="text-muted-foreground">
                        {user.createdAt}
                      </td>
                      <td>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0"
                              data-testid={`user-actions-${user.id}`}
                            >
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => setEditingUser(user)}
                              data-testid={`user-edit-${user.id}`}
                            >
                              <Pencil className="h-4 w-4 mr-2" />
                              Edit User
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit User Dialog */}
      {editingUser && (
        <EditUserDialog
          user={editingUser}
          currentUserRole={currentUserRole}
          currentUserId={currentUserId}
          open={!!editingUser}
          onOpenChange={(open) => {
            if (!open) setEditingUser(null)
          }}
        />
      )}
    </>
  )
}
