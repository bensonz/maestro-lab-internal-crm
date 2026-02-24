'use client'

import { useState, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Search,
  MoreHorizontal,
  Pencil,
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { CreateUserDialog } from './create-user-dialog'
import { EditUserDialog } from './edit-user-dialog'
import { cn } from '@/lib/utils'

interface UserData {
  id: string
  name: string
  email: string
  role: string
  phone: string | null
  isActive: boolean
  createdAt: string
  tier: string
  starLevel: number
  supervisorId: string | null
}

interface LoginManagementViewProps {
  users: UserData[]
  currentUserRole: string
  currentUserId: string
}

const ROLE_BADGE_STYLES: Record<string, string> = {
  AGENT: 'bg-primary/20 text-primary border-primary/30',
  BACKOFFICE: 'bg-warning/20 text-warning border-warning/30',
  ADMIN: 'bg-chart-5/20 text-chart-5 border-chart-5/30',
  FINANCE: 'bg-chart-3/20 text-chart-3 border-chart-3/30',
}

export function LoginManagementView({
  users,
  currentUserRole,
  currentUserId,
}: LoginManagementViewProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [editingUser, setEditingUser] = useState<UserData | null>(null)

  const filteredUsers = useMemo(
    () =>
      users.filter(
        (user) =>
          user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
          user.role.toLowerCase().includes(searchQuery.toLowerCase()),
      ),
    [users, searchQuery],
  )

  return (
    <div className="flex h-full animate-fade-in">
      {/* Left sidebar */}
      <div className="w-64 min-w-64 space-y-4 border-r border-border bg-sidebar p-4">
        <h1 className="text-xl font-semibold text-foreground">
          Login Management
        </h1>

        {/* Summary */}
        <div className="space-y-2">
          <Card className="card-terminal">
            <CardContent className="p-3">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                Total Users
              </p>
              <p className="mt-0.5 text-xl font-mono font-semibold">
                {users.length}
              </p>
            </CardContent>
          </Card>
          <Card className="card-terminal">
            <CardContent className="p-3">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                Active
              </p>
              <p className="mt-0.5 text-xl font-mono font-semibold text-success">
                {users.filter((u) => u.isActive).length}
              </p>
            </CardContent>
          </Card>
          <Card className="card-terminal">
            <CardContent className="p-3">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                Inactive
              </p>
              <p className="mt-0.5 text-xl font-mono font-semibold text-destructive">
                {users.filter((u) => !u.isActive).length}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Actions */}
        <div className="space-y-2">
          <CreateUserDialog currentUserRole={currentUserRole} />
        </div>
      </div>

      {/* Right: user table */}
      <div className="flex-1 space-y-4 overflow-auto p-6">
        {/* Search */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search users by name, email, or role..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
            data-testid="login-mgmt-search"
          />
        </div>

        <Card className="card-terminal">
          <CardHeader className="border-b border-border px-4 py-3">
            <CardTitle className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
              All Users ({filteredUsers.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {filteredUsers.length === 0 ? (
              <p className="py-8 text-center text-muted-foreground">
                {users.length === 0
                  ? 'No users registered'
                  : 'No users match your search'}
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/30">
                      <th className="px-3 py-2 text-left font-medium text-muted-foreground">
                        Name
                      </th>
                      <th className="px-3 py-2 text-left font-medium text-muted-foreground">
                        Email
                      </th>
                      <th className="px-3 py-2 text-left font-medium text-muted-foreground">
                        Role
                      </th>
                      <th className="px-3 py-2 text-left font-medium text-muted-foreground">
                        Status
                      </th>
                      <th className="px-3 py-2 text-left font-medium text-muted-foreground">
                        Phone
                      </th>
                      <th className="px-3 py-2 text-left font-medium text-muted-foreground">
                        Joined
                      </th>
                      <th className="px-3 py-2 text-left font-medium text-muted-foreground sr-only">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.map((user) => (
                      <tr
                        key={user.id}
                        className={cn(
                          'border-b border-border transition-colors hover:bg-muted/30',
                          !user.isActive && 'opacity-50',
                        )}
                        data-testid={`user-row-${user.id}`}
                      >
                        <td className="px-3 py-2 font-medium">
                          {user.name}
                        </td>
                        <td className="px-3 py-2 text-muted-foreground">
                          {user.email}
                        </td>
                        <td className="px-3 py-2">
                          <Badge
                            className={`text-xs ${ROLE_BADGE_STYLES[user.role] || 'bg-muted text-muted-foreground'}`}
                            data-testid={`user-role-badge-${user.id}`}
                          >
                            {user.role}
                          </Badge>
                        </td>
                        <td className="px-3 py-2">
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
                        <td className="px-3 py-2 text-muted-foreground">
                          {user.phone || '—'}
                        </td>
                        <td className="px-3 py-2 text-muted-foreground">
                          {new Date(user.createdAt).toLocaleDateString()}
                        </td>
                        <td className="px-3 py-2">
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
                                <Pencil className="mr-2 h-4 w-4" />
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
      </div>

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
    </div>
  )
}
