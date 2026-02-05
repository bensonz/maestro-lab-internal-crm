'use client'

import { useState } from 'react'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
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
} from 'lucide-react'

interface PhoneAssignment {
  id: string
  number: string
  client: string
  clientId: string
  carrier: string
  issuedDate: string
  issuedBy: string
  status: string
  notes: string | null
}

interface PhoneTableProps {
  phoneNumbers: PhoneAssignment[]
}

const carriers = ['Verizon', 'AT&T', 'T-Mobile']

function getStatusBadge(status: string) {
  switch (status) {
    case 'active':
      return <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20">Active</Badge>
    case 'pending':
      return <Badge className="bg-amber-500/10 text-amber-500 border-amber-500/20">Pending</Badge>
    case 'suspended':
      return <Badge className="bg-red-500/10 text-red-500 border-red-500/20">Suspended</Badge>
    case 'inactive':
      return <Badge className="bg-slate-500/10 text-slate-400 border-slate-500/20">Inactive</Badge>
    default:
      return <Badge variant="outline">{status}</Badge>
  }
}

function getCarrierBadge(carrier: string) {
  const colors: Record<string, string> = {
    'Verizon': 'bg-red-600',
    'AT&T': 'bg-blue-600',
    'T-Mobile': 'bg-pink-600',
  }
  return (
    <Badge className={`${colors[carrier] || 'bg-slate-600'} text-white`}>
      {carrier}
    </Badge>
  )
}

export function PhoneTable({ phoneNumbers }: PhoneTableProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [carrierFilter, setCarrierFilter] = useState('all')

  const filteredNumbers = phoneNumbers.filter((phone) => {
    const matchesSearch =
      phone.number.includes(searchQuery) ||
      phone.client.toLowerCase().includes(searchQuery.toLowerCase()) ||
      phone.clientId.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesStatus = statusFilter === 'all' || phone.status === statusFilter
    const matchesCarrier = carrierFilter === 'all' || phone.carrier === carrierFilter
    return matchesSearch && matchesStatus && matchesCarrier
  })

  return (
    <>
      {/* Filters */}
      <div className="flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Search by phone, client name, or ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 bg-slate-900 border-slate-700 text-white"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40 bg-slate-900 border-slate-700 text-white">
            <SelectValue placeholder="All Status" />
          </SelectTrigger>
          <SelectContent className="bg-slate-800 border-slate-700">
            <SelectItem value="all" className="text-white">All Status</SelectItem>
            <SelectItem value="active" className="text-white">Active</SelectItem>
            <SelectItem value="pending" className="text-white">Pending</SelectItem>
            <SelectItem value="suspended" className="text-white">Suspended</SelectItem>
            <SelectItem value="inactive" className="text-white">Inactive</SelectItem>
          </SelectContent>
        </Select>
        <Select value={carrierFilter} onValueChange={setCarrierFilter}>
          <SelectTrigger className="w-40 bg-slate-900 border-slate-700 text-white">
            <SelectValue placeholder="All Carriers" />
          </SelectTrigger>
          <SelectContent className="bg-slate-800 border-slate-700">
            <SelectItem value="all" className="text-white">All Carriers</SelectItem>
            {carriers.map((carrier) => (
              <SelectItem key={carrier} value={carrier} className="text-white">{carrier}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <Card className="bg-slate-900 border-slate-800">
        {filteredNumbers.length === 0 ? (
          <div className="py-12 text-center text-slate-400">
            {phoneNumbers.length === 0 ? 'No phone assignments' : 'No phone numbers match your filters'}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="border-slate-800 hover:bg-transparent">
                <TableHead className="text-slate-400">Phone Number</TableHead>
                <TableHead className="text-slate-400">Client</TableHead>
                <TableHead className="text-slate-400">Carrier</TableHead>
                <TableHead className="text-slate-400">Issued Date</TableHead>
                <TableHead className="text-slate-400">Issued By</TableHead>
                <TableHead className="text-slate-400">Status</TableHead>
                <TableHead className="text-slate-400">Notes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredNumbers.map((phone) => (
                <TableRow key={phone.id} className="border-slate-800 hover:bg-slate-800/50">
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-emerald-500" />
                      <span className="text-white font-medium">{phone.number}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div>
                      <p className="text-white">{phone.client}</p>
                      <p className="text-xs text-slate-400">{phone.clientId}</p>
                    </div>
                  </TableCell>
                  <TableCell>{getCarrierBadge(phone.carrier)}</TableCell>
                  <TableCell className="text-slate-300">{phone.issuedDate || '—'}</TableCell>
                  <TableCell className="text-slate-300">{phone.issuedBy}</TableCell>
                  <TableCell>{getStatusBadge(phone.status)}</TableCell>
                  <TableCell className="text-slate-400">{phone.notes || '—'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>
    </>
  )
}
