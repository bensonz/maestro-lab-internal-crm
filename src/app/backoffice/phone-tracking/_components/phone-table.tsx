'use client'

import { useState, useTransition } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Phone,
  Search,
  LogOut,
  RotateCcw,
  Calendar,
  User,
  CheckCircle2,
  Clock,
  XCircle,
} from 'lucide-react'
import { signOutPhone, returnPhone } from '@/app/actions/phones'
import { toast } from 'sonner'

interface PhoneAssignment {
  id: string
  number: string
  client: string
  clientId: string
  deviceId: string
  issuedDate: string
  issuedBy: string
  status: string
  notes: string | null
}

interface PhoneTableProps {
  phoneNumbers: PhoneAssignment[]
}

const statusConfig: Record<
  string,
  {
    label: string
    color: string
    icon: typeof CheckCircle2
  }
> = {
  active: {
    label: 'Active',
    color: 'bg-success/20 text-success',
    icon: CheckCircle2,
  },
  pending: {
    label: 'Pending',
    color: 'bg-warning/20 text-warning',
    icon: Clock,
  },
  suspended: {
    label: 'Signed Out',
    color: 'bg-destructive/20 text-destructive',
    icon: XCircle,
  },
  inactive: {
    label: 'Returned',
    color: 'bg-muted text-muted-foreground',
    icon: XCircle,
  },
}

export function PhoneTable({ phoneNumbers }: PhoneTableProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [isPending, startTransition] = useTransition()

  const filteredNumbers = phoneNumbers.filter((phone) => {
    const matchesSearch =
      phone.number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      phone.client.toLowerCase().includes(searchQuery.toLowerCase()) ||
      phone.clientId.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesStatus =
      statusFilter === 'all' || phone.status === statusFilter
    return matchesSearch && matchesStatus
  })

  function handleSignOut(assignmentId: string) {
    startTransition(async () => {
      const result = await signOutPhone(assignmentId)
      if (result.success) {
        toast.success('Phone signed out')
      } else {
        toast.error(result.error || 'Failed to sign out phone')
      }
    })
  }

  function handleReturn(assignmentId: string) {
    startTransition(async () => {
      const result = await returnPhone(assignmentId)
      if (result.success) {
        toast.success('Phone returned')
      } else {
        toast.error(result.error || 'Failed to return phone')
      }
    })
  }

  return (
    <>
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by phone, client name, or ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
            data-testid="phone-search-input"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="All Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="suspended">Signed Out</SelectItem>
            <SelectItem value="inactive">Returned</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <Card className="card-terminal">
        <CardContent className="p-0">
          {filteredNumbers.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              {phoneNumbers.length === 0
                ? 'No phone assignments'
                : 'No phone numbers match your filters'}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Phone Number</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Device ID</TableHead>
                  <TableHead>Issued Date</TableHead>
                  <TableHead>Issued By</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Notes</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredNumbers.map((phone) => {
                  const config = statusConfig[phone.status]
                  return (
                    <TableRow key={phone.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Phone className="h-4 w-4 text-primary" />
                          <span className="font-mono font-medium">
                            {phone.number}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{phone.client}</p>
                          {phone.clientId && (
                            <p className="text-xs text-muted-foreground">
                              {phone.clientId}
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {phone.deviceId ? (
                          <Badge variant="outline">{phone.deviceId}</Badge>
                        ) : (
                          <span className="text-muted-foreground/50">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <Calendar className="h-3 w-3" />
                          {phone.issuedDate || '—'}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-sm">
                          <User className="h-3 w-3 text-muted-foreground" />
                          {phone.issuedBy}
                        </div>
                      </TableCell>
                      <TableCell>
                        {config ? (
                          <Badge className={config.color}>
                            <config.icon className="mr-1 h-3 w-3" />
                            {config.label}
                          </Badge>
                        ) : (
                          <Badge variant="outline">{phone.status}</Badge>
                        )}
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate">
                        {phone.notes ? (
                          <span className="text-sm text-muted-foreground">
                            {phone.notes}
                          </span>
                        ) : (
                          <span className="text-sm text-muted-foreground/50">
                            —
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {phone.status === 'active' && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs"
                            onClick={() => handleSignOut(phone.id)}
                            disabled={isPending}
                            data-testid={`sign-out-${phone.id}`}
                          >
                            <LogOut className="mr-1 h-3 w-3" />
                            Sign Out
                          </Button>
                        )}
                        {phone.status === 'suspended' && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs"
                            onClick={() => handleReturn(phone.id)}
                            disabled={isPending}
                            data-testid={`return-${phone.id}`}
                          >
                            <RotateCcw className="mr-1 h-3 w-3" />
                            Return
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Results Footer */}
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>
          Showing {filteredNumbers.length} of {phoneNumbers.length} records
        </span>
        <span className="font-mono">
          Last updated: {new Date().toLocaleTimeString()}
        </span>
      </div>
    </>
  )
}
