'use client'

import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { ClientProfile } from './client-profile'
import { ApplicationProgress } from './application-progress'
import { ClientTodoList } from './client-todo-list'
import { EventTimeline } from './event-timeline'
import { PlatformType, PlatformStatus, ToDoType, ToDoStatus, EventType, IntakeStatus } from '@/types'

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
    <div className="min-h-screen p-6 lg:p-8">
      {/* Back Button */}
      <div className="animate-fade-in-up mb-6">
        <Link href="/agent/clients">
          <Button
            variant="ghost"
            size="sm"
            className="h-9 rounded-lg text-muted-foreground hover:bg-muted/50 hover:text-foreground"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Clients
          </Button>
        </Link>

        {/* Page Title */}
        <div className="mt-4 flex items-center gap-3">
          <span className="text-sm text-muted-foreground">Client ID: {client.id.slice(0, 8)}</span>
          <span className="text-muted-foreground/50">•</span>
          <span className="text-sm text-primary">Client Lifecycle Control Panel</span>
        </div>
      </div>

      {/* 4-Quadrant Grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Top-Left: Client Static Profile */}
        <div className="animate-fade-in-up" style={{ animationDelay: '0.05s' }}>
          <ClientProfile client={client} />
        </div>

        {/* Top-Right: Application Progress */}
        <div className="animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
          <ApplicationProgress client={client} />
        </div>

        {/* Bottom-Left: Auto-Generated To-Dos */}
        <div className="animate-fade-in-up" style={{ animationDelay: '0.15s' }}>
          <ClientTodoList toDos={client.toDos} />
        </div>

        {/* Bottom-Right: Event Timeline */}
        <div className="animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
          <EventTimeline events={client.eventLogs} />
        </div>
      </div>
    </div>
  )
}
