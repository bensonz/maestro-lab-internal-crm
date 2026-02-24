'use client'

import { useState, useMemo, useCallback, useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { ClientSidebar } from './client-sidebar'
import { ClientList } from './client-list'
import { ClientDetail } from './client-detail'
import type {
  Client,
  ClientStatus,
  ServerClientData,
  ServerClientStats,
  ViewPlatformStatus,
} from './types'
import { mapServerClientToClient } from './map-client'

// ============================================================================
// Component
// ============================================================================

interface ClientManagementPageProps {
  serverClients: ServerClientData[]
  stats: ServerClientStats
}

export function ClientManagementPage({
  serverClients,
  stats,
}: ClientManagementPageProps) {
  // Map server data to view model once
  const clients = useMemo(
    () => serverClients.map(mapServerClientToClient),
    [serverClients],
  )

  // URL-based client selection
  const searchParams = useSearchParams()
  const router = useRouter()
  const clientIdParam = searchParams.get('client')

  // State
  const [selectedClient, setSelectedClient] = useState<Client | null>(() => {
    if (clientIdParam) {
      const mapped = serverClients.map(mapServerClientToClient)
      return mapped.find((c) => c.id === clientIdParam) ?? null
    }
    return null
  })
  // Sync selectedClient when server data refreshes (e.g. after approve/reject)
  useEffect(() => {
    if (selectedClient) {
      const updated = clients.find((c) => c.id === selectedClient.id)
      if (updated && updated !== selectedClient) {
        setSelectedClient(updated)
      }
    }
  }, [clients, selectedClient])

  const [searchQuery, setSearchQuery] = useState('')
  const [clientStatusFilter, setClientStatusFilter] = useState<
    ClientStatus | 'all'
  >('all')
  const [platformFilter, setPlatformFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState<
    ViewPlatformStatus | 'all'
  >('all')
  const [sortByFunds, setSortByFunds] = useState<'desc' | 'asc' | 'none'>(
    'none',
  )

  // Filtered clients
  const filteredClients = useMemo(() => {
    return clients
      .filter((client) => {
        const matchesSearch =
          client.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          client.companyPhone.includes(searchQuery) ||
          client.companyEmail
            .toLowerCase()
            .includes(searchQuery.toLowerCase()) ||
          (client.agent &&
            client.agent.toLowerCase().includes(searchQuery.toLowerCase()))

        if (!matchesSearch) return false

        // Client-level status filter (from summary cards)
        if (
          clientStatusFilter !== 'all' &&
          client.status !== clientStatusFilter
        )
          return false

        // Platform and status filter
        if (platformFilter !== 'all' && statusFilter !== 'all') {
          const platform = client.bettingPlatforms.find(
            (p) => p.id === platformFilter,
          )
          if (!platform || platform.status !== statusFilter) return false
        } else if (platformFilter !== 'all') {
          const platform = client.bettingPlatforms.find(
            (p) => p.id === platformFilter,
          )
          if (!platform) return false
        } else if (statusFilter !== 'all') {
          const hasStatus = client.bettingPlatforms.some(
            (p) => p.status === statusFilter,
          )
          if (!hasStatus) return false
        }

        return true
      })
      .sort((a, b) => {
        if (sortByFunds === 'desc') return b.totalFunds - a.totalFunds
        if (sortByFunds === 'asc') return a.totalFunds - b.totalFunds
        return 0
      })
  }, [clients, searchQuery, clientStatusFilter, platformFilter, statusFilter, sortByFunds])

  // Select a client and sync URL
  const selectClient = useCallback(
    (client: Client | null) => {
      setSelectedClient(client)
      if (client) {
        router.replace(`?client=${client.id}`, { scroll: false })
      } else {
        router.replace('?', { scroll: false })
      }
    },
    [router],
  )

  // Navigate to another client from relationships
  const handleNavigateToClient = useCallback(
    (clientId: string) => {
      const target = clients.find((c) => c.id === clientId)
      if (target) {
        selectClient(target)
      }
    },
    [clients, selectClient],
  )

  // Detail view
  if (selectedClient) {
    return (
      <ClientDetail
        client={selectedClient}
        allClients={clients}
        onBack={() => selectClient(null)}
        onNavigateToClient={handleNavigateToClient}
      />
    )
  }

  // List view
  return (
    <div className="flex h-full animate-fade-in">
      <ClientSidebar
        stats={stats}
        clientStatusFilter={clientStatusFilter}
        onClientStatusFilterChange={setClientStatusFilter}
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
        onSelectClient={selectClient}
      />
    </div>
  )
}
