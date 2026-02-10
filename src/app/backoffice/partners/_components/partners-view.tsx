'use client'

import { useState, useTransition } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Field, FieldLabel } from '@/components/ui/field'
import { Textarea } from '@/components/ui/textarea'
import {
  Users,
  UserPlus,
  DollarSign,
  Building2,
  Plus,
  Pencil,
  Trash2,
  UserMinus,
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import {
  createPartner,
  updatePartner,
  deletePartner,
  assignClientToPartner,
} from '@/app/actions/partners'

interface PartnerDetail {
  partnerAmount: unknown
  status: string
}

interface PartnerData {
  id: string
  name: string
  contactName: string | null
  contactEmail: string | null
  contactPhone: string | null
  company: string | null
  type: string
  status: string
  notes: string | null
  createdAt: string | Date
  _count: {
    clients: number
    profitShareRules: number
    profitShareDetails: number
  }
  profitShareDetails: PartnerDetail[]
}

interface ClientOption {
  id: string
  firstName: string
  lastName: string
  partnerId: string | null
}

interface PartnersData {
  partners: PartnerData[]
  unassignedCount: number
  clients: ClientOption[]
}

const TYPE_COLORS: Record<string, string> = {
  referral: 'bg-chart-4/20 text-chart-4',
  platform: 'bg-chart-3/20 text-chart-3',
  investor: 'bg-primary/20 text-primary',
  affiliate: 'bg-accent/20 text-accent',
}

const STATUS_COLORS: Record<string, string> = {
  active: 'bg-success/20 text-success',
  inactive: 'bg-muted text-muted-foreground',
  suspended: 'bg-destructive/20 text-destructive',
}

function formatMoney(value: number) {
  return `$${value.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
}

function getPartnerEarnings(details: PartnerDetail[]) {
  return details.reduce((sum, d) => sum + Number(d.partnerAmount), 0)
}

export function PartnersView({ data }: { data: PartnersData }) {
  const [isPending, startTransition] = useTransition()
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [editingPartner, setEditingPartner] = useState<PartnerData | null>(null)
  const [managingClientsFor, setManagingClientsFor] =
    useState<PartnerData | null>(null)
  const { toast } = useToast()

  const activePartners = data.partners.filter((p) => p.status === 'active')
  const totalAssigned = data.partners.reduce(
    (sum, p) => sum + p._count.clients,
    0,
  )
  const totalEarnings = data.partners.reduce(
    (sum, p) => sum + getPartnerEarnings(p.profitShareDetails),
    0,
  )

  const handleCreate = (formData: FormData) => {
    startTransition(async () => {
      const result = await createPartner({
        name: formData.get('name') as string,
        contactName: (formData.get('contactName') as string) || undefined,
        contactEmail: (formData.get('contactEmail') as string) || undefined,
        contactPhone: (formData.get('contactPhone') as string) || undefined,
        company: (formData.get('company') as string) || undefined,
        type: (formData.get('type') as string) || undefined,
        notes: (formData.get('notes') as string) || undefined,
      })
      if (result.success) {
        toast({ title: 'Partner created' })
        setShowAddDialog(false)
      } else {
        toast({
          title: 'Error',
          description: result.error,
          variant: 'destructive',
        })
      }
    })
  }

  const handleUpdate = (formData: FormData) => {
    if (!editingPartner) return
    startTransition(async () => {
      const result = await updatePartner(editingPartner.id, {
        name: formData.get('name') as string,
        contactName: (formData.get('contactName') as string) || undefined,
        contactEmail: (formData.get('contactEmail') as string) || undefined,
        contactPhone: (formData.get('contactPhone') as string) || undefined,
        company: (formData.get('company') as string) || undefined,
        type: formData.get('type') as string,
        status: formData.get('status') as string,
        notes: (formData.get('notes') as string) || undefined,
      })
      if (result.success) {
        toast({ title: 'Partner updated' })
        setEditingPartner(null)
      } else {
        toast({
          title: 'Error',
          description: result.error,
          variant: 'destructive',
        })
      }
    })
  }

  const handleDelete = (partnerId: string) => {
    startTransition(async () => {
      const result = await deletePartner(partnerId)
      if (result.success) {
        toast({ title: 'Partner deleted' })
      } else {
        toast({
          title: 'Error',
          description: result.error,
          variant: 'destructive',
        })
      }
    })
  }

  const handleAssignClient = (clientId: string, partnerId: string | null) => {
    startTransition(async () => {
      const result = await assignClientToPartner({ clientId, partnerId })
      if (result.success) {
        toast({ title: partnerId ? 'Client assigned' : 'Client unassigned' })
      } else {
        toast({
          title: 'Error',
          description: result.error,
          variant: 'destructive',
        })
      }
    })
  }

  return (
    <div className="space-y-6">
      {/* ── Summary Cards ── */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="card-terminal" data-testid="total-partners-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Active Partners
            </CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono">
              {activePartners.length}
            </div>
          </CardContent>
        </Card>

        <Card className="card-terminal" data-testid="assigned-clients-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Clients Assigned
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono">{totalAssigned}</div>
          </CardContent>
        </Card>

        <Card className="card-terminal" data-testid="unassigned-clients-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Unassigned Clients
            </CardTitle>
            <UserPlus className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono">
              {data.unassignedCount}
            </div>
          </CardContent>
        </Card>

        <Card className="card-terminal" data-testid="total-earnings-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Partner Earnings
            </CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono text-success">
              {formatMoney(totalEarnings)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Partner List Header ── */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">All Partners</h2>
        <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
          <DialogTrigger asChild>
            <Button data-testid="add-partner-btn" size="sm">
              <Plus className="mr-1 h-4 w-4" /> Add Partner
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Partner</DialogTitle>
            </DialogHeader>
            <PartnerForm onSubmit={handleCreate} isPending={isPending} />
          </DialogContent>
        </Dialog>
      </div>

      {/* ── Partner List ── */}
      {data.partners.length === 0 ? (
        <Card className="card-terminal">
          <CardContent className="py-8 text-center text-muted-foreground">
            No partners yet. Click &ldquo;Add Partner&rdquo; to create one.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {data.partners.map((partner) => (
            <Card
              key={partner.id}
              className="card-terminal"
              data-testid={`partner-card-${partner.id}`}
            >
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-base">{partner.name}</CardTitle>
                    {partner.company && (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {partner.company}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-1">
                    <Badge
                      className={
                        TYPE_COLORS[partner.type] ?? 'bg-muted text-muted-foreground'
                      }
                    >
                      {partner.type}
                    </Badge>
                    <Badge
                      className={
                        STATUS_COLORS[partner.status] ??
                        'bg-muted text-muted-foreground'
                      }
                    >
                      {partner.status}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {/* Contact info */}
                {(partner.contactName ||
                  partner.contactEmail ||
                  partner.contactPhone) && (
                  <div className="text-xs text-muted-foreground space-y-0.5">
                    {partner.contactName && <p>{partner.contactName}</p>}
                    {partner.contactEmail && <p>{partner.contactEmail}</p>}
                    {partner.contactPhone && <p>{partner.contactPhone}</p>}
                  </div>
                )}

                {/* Stats row */}
                <div className="flex gap-4 text-xs">
                  <span className="font-mono">
                    {partner._count.clients} client
                    {partner._count.clients !== 1 ? 's' : ''}
                  </span>
                  <span className="font-mono">
                    {partner._count.profitShareRules} rule
                    {partner._count.profitShareRules !== 1 ? 's' : ''}
                  </span>
                  <span className="font-mono text-success">
                    {formatMoney(getPartnerEarnings(partner.profitShareDetails))}
                  </span>
                </div>

                {/* Actions */}
                <div className="flex gap-2 pt-1">
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs"
                    data-testid={`edit-partner-${partner.id}`}
                    onClick={() => setEditingPartner(partner)}
                  >
                    <Pencil className="mr-1 h-3 w-3" /> Edit
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs"
                    data-testid={`manage-clients-${partner.id}`}
                    onClick={() => setManagingClientsFor(partner)}
                  >
                    <Users className="mr-1 h-3 w-3" /> Clients
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs text-destructive hover:text-destructive"
                    data-testid={`delete-partner-${partner.id}`}
                    disabled={isPending}
                    onClick={() => handleDelete(partner.id)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* ── Edit Partner Dialog ── */}
      <Dialog
        open={!!editingPartner}
        onOpenChange={(open) => !open && setEditingPartner(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Partner</DialogTitle>
          </DialogHeader>
          {editingPartner && (
            <PartnerForm
              onSubmit={handleUpdate}
              isPending={isPending}
              defaultValues={editingPartner}
              showStatus
            />
          )}
        </DialogContent>
      </Dialog>

      {/* ── Manage Clients Dialog ── */}
      <Dialog
        open={!!managingClientsFor}
        onOpenChange={(open) => !open && setManagingClientsFor(null)}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              Manage Clients — {managingClientsFor?.name}
            </DialogTitle>
          </DialogHeader>
          {managingClientsFor && (
            <ClientAssignmentPanel
              partner={managingClientsFor}
              clients={data.clients}
              onAssign={handleAssignClient}
              isPending={isPending}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ── Partner Form ──

function PartnerForm({
  onSubmit,
  isPending,
  defaultValues,
  showStatus,
}: {
  onSubmit: (formData: FormData) => void
  isPending: boolean
  defaultValues?: PartnerData
  showStatus?: boolean
}) {
  return (
    <form action={onSubmit} className="space-y-4">
      <Field>
        <FieldLabel htmlFor="name">Name *</FieldLabel>
        <Input
          id="name"
          name="name"
          required
          defaultValue={defaultValues?.name}
          data-testid="partner-name-input"
        />
      </Field>

      <div className="grid grid-cols-2 gap-4">
        <Field>
          <FieldLabel htmlFor="contactName">Contact Name</FieldLabel>
          <Input
            id="contactName"
            name="contactName"
            defaultValue={defaultValues?.contactName ?? ''}
            data-testid="partner-contact-name-input"
          />
        </Field>
        <Field>
          <FieldLabel htmlFor="contactEmail">Contact Email</FieldLabel>
          <Input
            id="contactEmail"
            name="contactEmail"
            type="email"
            defaultValue={defaultValues?.contactEmail ?? ''}
            data-testid="partner-contact-email-input"
          />
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Field>
          <FieldLabel htmlFor="contactPhone">Contact Phone</FieldLabel>
          <Input
            id="contactPhone"
            name="contactPhone"
            defaultValue={defaultValues?.contactPhone ?? ''}
            data-testid="partner-contact-phone-input"
          />
        </Field>
        <Field>
          <FieldLabel htmlFor="company">Company</FieldLabel>
          <Input
            id="company"
            name="company"
            defaultValue={defaultValues?.company ?? ''}
            data-testid="partner-company-input"
          />
        </Field>
      </div>

      <div className={showStatus ? 'grid grid-cols-2 gap-4' : ''}>
        <Field>
          <FieldLabel htmlFor="type">Type</FieldLabel>
          <Select name="type" defaultValue={defaultValues?.type ?? 'referral'}>
            <SelectTrigger data-testid="partner-type-select">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="referral">Referral</SelectItem>
              <SelectItem value="platform">Platform</SelectItem>
              <SelectItem value="investor">Investor</SelectItem>
              <SelectItem value="affiliate">Affiliate</SelectItem>
            </SelectContent>
          </Select>
        </Field>

        {showStatus && (
          <Field>
            <FieldLabel htmlFor="status">Status</FieldLabel>
            <Select
              name="status"
              defaultValue={defaultValues?.status ?? 'active'}
            >
              <SelectTrigger data-testid="partner-status-select">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
                <SelectItem value="suspended">Suspended</SelectItem>
              </SelectContent>
            </Select>
          </Field>
        )}
      </div>

      <Field>
        <FieldLabel htmlFor="notes">Notes</FieldLabel>
        <Textarea
          id="notes"
          name="notes"
          rows={3}
          defaultValue={defaultValues?.notes ?? ''}
          data-testid="partner-notes-input"
        />
      </Field>

      <Button type="submit" disabled={isPending} data-testid="partner-submit-btn">
        {defaultValues ? 'Update Partner' : 'Create Partner'}
      </Button>
    </form>
  )
}

// ── Client Assignment Panel ──

function ClientAssignmentPanel({
  partner,
  clients,
  onAssign,
  isPending,
}: {
  partner: PartnerData
  clients: ClientOption[]
  onAssign: (clientId: string, partnerId: string | null) => void
  isPending: boolean
}) {
  const assignedClients = clients.filter((c) => c.partnerId === partner.id)
  const unassignedClients = clients.filter((c) => !c.partnerId)
  const [selectedClient, setSelectedClient] = useState('')

  return (
    <div className="space-y-4">
      {/* Assigned clients */}
      <div>
        <h4 className="text-sm font-medium mb-2">
          Assigned Clients ({assignedClients.length})
        </h4>
        {assignedClients.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            No clients assigned to this partner.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Client</TableHead>
                <TableHead className="w-[100px]">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {assignedClients.map((client) => (
                <TableRow key={client.id}>
                  <TableCell>
                    {client.firstName} {client.lastName}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-xs text-destructive hover:text-destructive"
                      disabled={isPending}
                      data-testid={`unassign-client-${client.id}`}
                      onClick={() => onAssign(client.id, null)}
                    >
                      <UserMinus className="mr-1 h-3 w-3" /> Remove
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Assign new client */}
      <div className="border-t pt-4">
        <h4 className="text-sm font-medium mb-2">Assign Client</h4>
        <div className="flex gap-2">
          <Select
            value={selectedClient}
            onValueChange={setSelectedClient}
          >
            <SelectTrigger
              className="flex-1"
              data-testid="assign-client-select"
            >
              <SelectValue placeholder="Select an unassigned client..." />
            </SelectTrigger>
            <SelectContent>
              {unassignedClients.map((client) => (
                <SelectItem key={client.id} value={client.id}>
                  {client.firstName} {client.lastName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            size="sm"
            disabled={!selectedClient || isPending}
            data-testid="assign-client-btn"
            onClick={() => {
              if (selectedClient) {
                onAssign(selectedClient, partner.id)
                setSelectedClient('')
              }
            }}
          >
            Assign
          </Button>
        </div>
      </div>
    </div>
  )
}
