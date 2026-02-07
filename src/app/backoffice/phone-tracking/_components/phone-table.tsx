'use client'

import { useState, useTransition } from 'react'
import { Card } from '@/components/ui/card'
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
import { Phone, Search, LogOut, RotateCcw } from 'lucide-react'
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

function getStatusBadge(status: string) {
  switch (status) {
    case 'active':
      return (
        <Badge className="bg-success/20 text-success border-success/30">
          Active
        </Badge>
      )
    case 'pending':
      return (
        <Badge className="bg-warning/20 text-warning border-warning/30">
          Pending
        </Badge>
      )
    case 'suspended':
      return (
        <Badge className="bg-destructive/20 text-destructive border-destructive/30">
          Signed Out
        </Badge>
      )
    case 'inactive':
      return (
        <Badge className="bg-muted text-muted-foreground border-border">
          Returned
        </Badge>
      )
    default:
      return <Badge variant="outline">{status}</Badge>
  }
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
      <div className="flex gap-4">
        <div className="relative flex-1">
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
      <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
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
              {filteredNumbers.map((phone) => (
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
                      <span className="font-mono text-sm">
                        {phone.deviceId}
                      </span>
                    ) : (
                      <span className="text-muted-foreground/50">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {phone.issuedDate || '—'}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {phone.issuedBy}
                  </TableCell>
                  <TableCell>{getStatusBadge(phone.status)}</TableCell>
                  <TableCell className="text-muted-foreground max-w-[200px] truncate">
                    {phone.notes || '—'}
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
                        <LogOut className="h-3 w-3 mr-1" />
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
                        <RotateCcw className="h-3 w-3 mr-1" />
                        Return
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>
    </>
  )
}
