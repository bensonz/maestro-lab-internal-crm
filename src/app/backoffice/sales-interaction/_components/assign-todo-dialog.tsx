'use client'

import { useState, useMemo, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Field, FieldLabel } from '@/components/ui/field'
import { Loader2, Info } from 'lucide-react'
import { assignTodo } from '@/app/actions/todos'
import { toast } from 'sonner'
import type { IntakeClient } from '@/types/backend-types'

const ISSUE_CATEGORIES = [
  'Re-Open Bank Account / Schedule with Client',
  'Contact Bank',
  'Contact PayPal',
  'Platforms Verification',
] as const

interface AssignTodoDialogProps {
  open: boolean
  onClose: () => void
  clients: IntakeClient[]
}

function getDefaultDueDate(): string {
  const d = new Date()
  d.setDate(d.getDate() + 3)
  return d.toISOString().split('T')[0]
}

export function AssignTodoDialog({
  open,
  onClose,
  clients,
}: AssignTodoDialogProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [selectedDraftId, setSelectedDraftId] = useState('')
  const [issueCategory, setIssueCategory] = useState('')
  const [dueDate, setDueDate] = useState(getDefaultDueDate)
  const [search, setSearch] = useState('')

  // Only show real DB drafts (those with IDs starting with 'c' from cuid, not mock 'mock-' IDs)
  const filteredClients = useMemo(() => {
    const q = search.toLowerCase()
    return clients.filter(
      (c) =>
        !c.id.startsWith('mock-') &&
        (c.name.toLowerCase().includes(q) || c.agentName.toLowerCase().includes(q)),
    )
  }, [clients, search])

  const selectedClient = useMemo(
    () => clients.find((c) => c.id === selectedDraftId),
    [clients, selectedDraftId],
  )

  const handleClose = () => {
    setSelectedDraftId('')
    setIssueCategory('')
    setDueDate(getDefaultDueDate())
    setSearch('')
    onClose()
  }

  const handleSubmit = () => {
    if (!selectedDraftId || !issueCategory || !dueDate) return

    startTransition(async () => {
      const result = await assignTodo(selectedDraftId, issueCategory, dueDate)

      if (result.success) {
        toast.success(`To-do assigned to ${selectedClient?.agentName ?? 'agent'}`)
        handleClose()
        router.refresh()
      } else {
        toast.error(result.error || 'Failed to assign to-do')
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="sm:max-w-md" data-testid="assign-todo-dialog">
        <DialogHeader>
          <DialogTitle>Assign To-Do</DialogTitle>
          <p className="text-sm text-muted-foreground">
            Create a task for an agent tied to a specific client
          </p>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Client picker */}
          <Field>
            <FieldLabel htmlFor="todo-client">Client *</FieldLabel>
            <Select value={selectedDraftId} onValueChange={setSelectedDraftId}>
              <SelectTrigger id="todo-client" data-testid="todo-client-select">
                <SelectValue placeholder="Select client..." />
              </SelectTrigger>
              <SelectContent>
                <div className="px-2 pb-2">
                  <Input
                    placeholder="Search clients..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="h-8 text-xs"
                    data-testid="todo-client-search"
                  />
                </div>
                {filteredClients.length === 0 ? (
                  <div className="px-3 py-2 text-xs text-muted-foreground">
                    No clients found
                  </div>
                ) : (
                  filteredClients.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name} — {c.agentName}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </Field>

          {/* Issue category */}
          <Field>
            <FieldLabel htmlFor="todo-issue">Issue Category *</FieldLabel>
            <Select value={issueCategory} onValueChange={setIssueCategory}>
              <SelectTrigger id="todo-issue" data-testid="todo-issue-select">
                <SelectValue placeholder="Select issue..." />
              </SelectTrigger>
              <SelectContent>
                {ISSUE_CATEGORIES.map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    {cat}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          {/* Due date */}
          <Field>
            <FieldLabel htmlFor="todo-due-date">Due Date *</FieldLabel>
            <Input
              id="todo-due-date"
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              data-testid="todo-due-date-input"
            />
          </Field>

          {/* Info box showing selected agent + step + device details */}
          {selectedClient && (
            <div className="flex items-start gap-2 rounded-md border border-border bg-muted/30 px-3 py-2">
              <Info className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
              <div className="text-xs text-muted-foreground">
                <p>
                  Agent: <span className="font-medium text-foreground">{selectedClient.agentName}</span>
                </p>
                <p>
                  Current step: <span className="font-medium text-foreground">{selectedClient.subStage.replace('step-', 'Step ')}</span>
                </p>
                {selectedClient.assignedPhone && (
                  <p>
                    Phone: <span className="font-medium font-mono text-foreground">{selectedClient.assignedPhone}</span>
                    {selectedClient.assignedCarrier && (
                      <span className="ml-1 text-muted-foreground">({selectedClient.assignedCarrier})</span>
                    )}
                  </p>
                )}
                {selectedClient.status && (
                  <p>
                    Device: <span className="font-medium text-foreground">{selectedClient.status}</span>
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isPending}>
            Cancel
          </Button>
          <Button
            variant="terminal"
            onClick={handleSubmit}
            disabled={isPending || !selectedDraftId || !issueCategory || !dueDate}
            data-testid="assign-todo-submit-btn"
          >
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Assign To-Do
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
