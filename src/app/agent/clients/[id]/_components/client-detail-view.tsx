'use client'

import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { ClientProfile } from './client-profile'
import { ApplicationProgress } from './application-progress'
import { ClientTodoList } from './client-todo-list'
import { EventTimeline } from './event-timeline'
import {
  PlatformType,
  PlatformStatus,
  ToDoType,
  ToDoStatus,
  EventType,
  IntakeStatus,
} from '@/types'

interface ClientDetailViewProps {
  client: {
    id: string
    firstName: string
    lastName: string
    middleName: string | null
    name: string
    email: string | null
    phone: string | null
    address: string | null
    city: string | null
    state: string | null
    zipCode: string | null
    country: string | null
    secondaryAddress: {
      address?: string
      city?: string
      state?: string
      zip?: string
    } | null
    dateOfBirth: string | null
    status: string
    statusColor: string
    intakeStatus: IntakeStatus
    deadline: Date | null
    deadlineExtensions: number
    applicationNotes: string | null
    complianceReview: string | null
    complianceStatus: string | null
    questionnaire: Record<string, unknown>
    agent: {
      id: string
      name: string
      email: string | null
    }
    platforms: {
      id: string
      platformType: PlatformType
      status: PlatformStatus
      statusLabel: string
      statusColor: string
      username: string | null
      accountId: string | null
      screenshots: string[]
      reviewNotes: string | null
      updatedAt: Date
    }[]
    toDos: {
      id: string
      title: string
      description: string | null
      type: ToDoType
      status: ToDoStatus
      priority: number
      dueDate: Date | null
      platformType: PlatformType | null
      stepNumber: number | null
      extensionsUsed: number
      maxExtensions: number
      screenshots: string[]
      metadata: unknown
      createdAt: Date
    }[]
    eventLogs: {
      id: string
      eventType: EventType
      description: string
      metadata: unknown
      oldValue: string | null
      newValue: string | null
      userName: string
      createdAt: Date
    }[]
    phoneAssignment: {
      phoneNumber: string
      deviceId: string | null
      issuedAt: Date | null
      signedOutAt: Date | null
      returnedAt: Date | null
    } | null
    pendingExtensionRequest: {
      id: string
      status: string
      reason: string
      requestedDays: number
      createdAt: Date
    } | null
    extensionRequestCount: number
    createdAt: Date
    updatedAt: Date
    statusChangedAt: Date
  }
}

export function ClientDetailView({ client }: ClientDetailViewProps) {
  return (
    <div className="space-y-4 p-6 animate-fade-in">
      {/* Header: Back + Name + Status badge */}
      <div className="flex items-center gap-4">
        <Link href="/agent/clients">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-xl font-semibold text-foreground">
            {client.name}
          </h1>
          <p className="text-xs text-muted-foreground">
            Client Lifecycle Panel — Agent View
          </p>
        </div>
        <Badge
          className={`text-xs ${
            client.intakeStatus === IntakeStatus.IN_EXECUTION ||
            client.intakeStatus === IntakeStatus.PHONE_ISSUED
              ? 'bg-primary/20 text-primary'
              : client.intakeStatus === IntakeStatus.APPROVED
                ? 'bg-success/20 text-success'
                : client.intakeStatus === IntakeStatus.REJECTED
                  ? 'bg-destructive/20 text-destructive'
                  : 'bg-muted text-muted-foreground'
          }`}
          data-testid="client-status-badge"
        >
          {client.status}
        </Badge>
      </div>

      {/* Profile Summary — full width */}
      <ClientProfile client={client} />

      {/* Application Progress (left 2/6) + To-Dos (right 4/6) */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-6">
        <div className="lg:col-span-2">
          <ApplicationProgress client={client} />
        </div>
        <div className="lg:col-span-4">
          <ClientTodoList toDos={client.toDos} />
        </div>
      </div>

      {/* Event Timeline — full width */}
      <EventTimeline events={client.eventLogs} />
    </div>
  )
}
