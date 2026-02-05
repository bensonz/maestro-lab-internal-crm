'use client'

import { useState } from 'react'
import { StatsHeader } from './stats-header'
import { TeamDirectoryPanel } from './team-directory-panel'
import { ClientIntakeList } from './client-intake-list'
import { VerificationTasksTable } from './verification-tasks-table'
import type { IntakeClient, VerificationTask } from '@/backend/data/operations'

interface AgentInHierarchy {
  id: string
  name: string
  level: string
  stars: number
  clientCount: number
}

interface HierarchyGroup {
  level: string
  agents: AgentInHierarchy[]
}

interface SalesInteractionViewProps {
  stats: {
    clientCount: number
    agentCount: number
    activeApps: number
    pendingCount: number
  }
  agentHierarchy: HierarchyGroup[]
  clientIntake: IntakeClient[]
  verificationTasks: VerificationTask[]
}

export function SalesInteractionView({
  stats,
  agentHierarchy,
  clientIntake,
  verificationTasks,
}: SalesInteractionViewProps) {
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')

  // Filter data by selected agent
  const filteredIntake = selectedAgentId
    ? clientIntake.filter((c) => c.agentId === selectedAgentId)
    : clientIntake

  const filteredTasks = selectedAgentId
    ? verificationTasks.filter((t) => t.agentId === selectedAgentId)
    : verificationTasks

  // Apply search filter
  const searchedIntake = searchQuery
    ? filteredIntake.filter(
        (c) =>
          c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          c.agentName.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : filteredIntake

  const searchedTasks = searchQuery
    ? filteredTasks.filter(
        (t) =>
          t.clientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
          t.agentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
          t.platformLabel.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : filteredTasks

  const handleSelectAgent = (agentId: string | null) => {
    // Toggle if clicking the same agent
    setSelectedAgentId((prev) => (prev === agentId ? null : agentId))
  }

  return (
    <div className="flex h-full min-h-screen">
      {/* Left Panel - Team Directory */}
      <TeamDirectoryPanel
        hierarchy={agentHierarchy}
        selectedAgentId={selectedAgentId}
        onSelectAgent={handleSelectAgent}
      />

      {/* Right Panel - Main Content */}
      <div className="flex-1 p-6 space-y-6 overflow-auto">
        <StatsHeader
          stats={stats}
          searchQuery={searchQuery}
          onSearch={setSearchQuery}
        />

        <ClientIntakeList
          clients={searchedIntake}
          selectedAgentId={selectedAgentId}
        />

        <VerificationTasksTable
          tasks={searchedTasks}
          selectedAgentId={selectedAgentId}
        />
      </div>
    </div>
  )
}
