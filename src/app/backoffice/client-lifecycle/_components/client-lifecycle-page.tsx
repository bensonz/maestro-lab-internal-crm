'use client'

import { useState, useMemo, useCallback, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { ClientSidebar } from '../../client-management/_components/client-sidebar'
import { ClientList } from '../../client-management/_components/client-list'
import { ClientDetail } from '../../client-management/_components/client-detail'
import type {
  Client,
  ServerClientData,
  ViewPlatformStatus,
} from '../../client-management/_components/types'
import { mapServerClientToClient } from '../../client-management/_components/map-client'
import type { LifecycleStats } from '@/backend/data/backoffice'

interface ClientLifecyclePageProps {
  serverClients: ServerClientData[]
  stats: LifecycleStats
}

export function ClientLifecyclePage({
  serverClients,
  stats,
}: ClientLifecyclePageProps) {
  // Map server data to view model once
  const clients = useMemo(
    () => serverClients.map(mapServerClientToClient),
    [serverClients],
  )

  // URL-based client selection
  const searchParams = useSearchParams()
  const clientIdParam = searchParams.get('client')

  // State
  const [selectedClient, setSelectedClient] = useState<Client | null>(() => {
    if (clientIdParam) {
      const mapped = serverClients.map(mapServerClientToClient)
      return mapped.find((c) => c.id === clientIdParam) ?? null
    }
    return null
  })

  // Sync selectedClient when server data refreshes
  useEffect(() => {
    if (selectedClient) {
      const updated = clients.find((c) => c.id === selectedClient.id)
      if (updated && updated !== selectedClient) {
        setSelectedClient(updated)
      }
    }
  }, [clients, selectedClient])

  const [searchQuery, setSearchQuery] = useState('')
  const [platformFilter, setPlatformFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState<ViewPlatformStatus | 'all'>('all')
  const [sortByFunds, setSortByFunds] = useState<'desc' | 'asc' | 'none'>('none')

  // Filtered clients
  const filteredClients = useMemo(() => {
    return clients
      .filter((client) => {
        const matchesSearch =
          client.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          client.companyPhone.includes(searchQuery) ||
          client.companyEmail.toLowerCase().includes(searchQuery.toLowerCase())

        if (!matchesSearch) return false

        if (platformFilter !== 'all' && statusFilter !== 'all') {
          const platform = client.bettingPlatforms.find((p) => p.id === platformFilter)
          if (!platform || platform.status !== statusFilter) return false
        } else if (platformFilter !== 'all') {
          const platform = client.bettingPlatforms.find((p) => p.id === platformFilter)
          if (!platform) return false
        } else if (statusFilter !== 'all') {
          const hasStatus = client.bettingPlatforms.some((p) => p.status === statusFilter)
          if (!hasStatus) return false
        }

        return true
      })
      .sort((a, b) => {
        if (sortByFunds === 'desc') return b.totalFunds - a.totalFunds
        if (sortByFunds === 'asc') return a.totalFunds - b.totalFunds
        return 0
      })
  }, [clients, searchQuery, platformFilter, statusFilter, sortByFunds])

  // Navigate to another client from relationships
  const handleNavigateToClient = useCallback(
    (clientId: string) => {
      const target = clients.find((c) => c.id === clientId)
      if (target) {
        setSelectedClient(target)
      }
    },
    [clients],
  )

  // Map lifecycle stats to the format ClientSidebar expects
  const sidebarStats = useMemo(() => ({
    total: stats.total,
    active: stats.inProgress,
    closed: 0, // Lifecycle panel has no closed clients by definition
    furtherVerification: stats.pendingReview + stats.verification,
  }), [stats])

  // Detail view
  if (selectedClient) {
    return (
      <ClientDetail
        client={selectedClient}
        allClients={clients}
        onBack={() => setSelectedClient(null)}
        onNavigateToClient={handleNavigateToClient}
      />
    )
  }

  // List view
  return (
    <div className="flex h-full animate-fade-in" data-testid="client-lifecycle-page">
      <ClientSidebar
        stats={sidebarStats}
        platformFilter={platformFilter}
        onPlatformFilterChange={setPlatformFilter}
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
        sortByFunds={sortByFunds}
        onSortByFundsChange={setSortByFunds}
      />
      <ClientList
        clients={filteredClients}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onSelectClient={setSelectedClient}
      />
    </div>
  )
}
