'use client'

import { useState, useMemo, useCallback } from 'react'
import { ClientSidebar } from './client-sidebar'
import { ClientList } from './client-list'
import { ClientDetail } from './client-detail'
import type {
  Client,
  ServerClientData,
  ServerClientStats,
  ViewPlatformStatus,
} from './types'

// ============================================================================
// Server-to-view-model mapping
// ============================================================================

// Map intake status to our view status
function mapIntakeStatusToClientStatus(
  intakeStatus: string,
): Client['status'] {
  switch (intakeStatus) {
    case 'APPROVED':
    case 'PHONE_ISSUED':
    case 'IN_EXECUTION':
      return 'active'
    case 'REJECTED':
    case 'INACTIVE':
      return 'closed'
    case 'NEEDS_MORE_INFO':
    case 'PENDING_EXTERNAL':
    case 'READY_FOR_APPROVAL':
    case 'EXECUTION_DELAYED':
      return 'further_verification'
    default:
      return 'further_verification'
  }
}

// Map platform abbreviations to betting platform entries
function mapPlatformsToBetting(
  platforms: string[],
  activePlatforms: string[],
): Client['bettingPlatforms'] {
  const PLATFORM_META: Record<string, { id: string; name: string }> = {
    DK: { id: 'draftkings', name: 'DraftKings' },
    FD: { id: 'fanduel', name: 'FanDuel' },
    MGM: { id: 'betmgm', name: 'BetMGM' },
    CZR: { id: 'caesars', name: 'Caesars' },
    FAN: { id: 'fanatics', name: 'Fanatics' },
    BB: { id: 'ballybet', name: 'BallyBet' },
    BR: { id: 'betrivers', name: 'BetRivers' },
    '365': { id: 'bet365', name: 'Bet365' },
  }

  // Only include sportsbook platform abbreviations
  const sportAbbrs = ['DK', 'FD', 'MGM', 'CZR', 'FAN', 'BB', 'BR', '365']
  const sportPlatforms = platforms.filter((p) => sportAbbrs.includes(p))

  return sportPlatforms.map((abbr) => {
    const meta = PLATFORM_META[abbr] || { id: abbr.toLowerCase(), name: abbr }
    const isActive = activePlatforms.includes(abbr)
    return {
      id: meta.id,
      name: meta.name,
      abbr,
      status: isActive ? ('active' as const) : ('pipeline' as const),
      balance: 0, // TODO: Wire to real balance data
      // TODO: Wire deposits, withdrawals, credentials, etc.
    }
  })
}

// Map a single server client to our view model
function mapServerClientToClient(serverClient: ServerClientData): Client {
  return {
    id: serverClient.id,
    name: serverClient.name,
    companyPhone: serverClient.phone || '\u2014',
    carrier: '\u2014', // TODO: Wire from client model when available
    companyEmail: serverClient.email || '\u2014',
    personalPhone: '\u2014', // TODO: Wire from client model
    startDate: serverClient.start,
    status: mapIntakeStatusToClientStatus(serverClient.intakeStatus),
    totalFunds: 0, // TODO: Wire to real fund data
    financePlatforms: [
      // TODO: Wire from real platform data
      {
        name: 'PayPal',
        type: 'paypal' as const,
        status: 'active' as const,
        balance: 0,
        isUsed: false,
        credentials: {
          username: '\u2014',
          password: '\u2014',
        },
      },
      {
        name: 'Bank',
        type: 'bank' as const,
        status: 'active' as const,
        balance: 0,
        bankType: 'Chase' as const,
        credentials: {
          username: '\u2014',
          password: '\u2014',
          pin: '\u2014',
        },
        debitCard: {
          cardNumber: '\u2014',
          cvv: '\u2014',
          expiration: '\u2014',
        },
        bankInfo: {
          routingNumber: '\u2014',
          accountNumber: '\u2014',
        },
      },
      {
        name: 'Edgeboost',
        type: 'edgeboost' as const,
        status: 'active' as const,
        balance: 0,
        credentials: {
          username: '\u2014',
          password: '\u2014',
        },
        debitCard: {
          cardNumber: '\u2014',
          cvv: '\u2014',
          expiration: '\u2014',
        },
      },
    ],
    bettingPlatforms: mapPlatformsToBetting(
      serverClient.platforms,
      serverClient.activePlatforms,
    ),
    quickInfo: {
      zellePhone: '\u2014', // TODO: Wire from client model
      edgeboostDebit: '\u2014',
      bankDebit: '\u2014',
      state: '\u2014',
    },
    profile: {
      fullName: serverClient.name,
      dob: '\u2014', // TODO: Wire from client model
      gender: 'Male', // TODO: Wire from client model
      idExpiryDate: '\u2014',
      ssn: '\u2014',
      citizenship: 'US Citizen',
      personalEmail: serverClient.email || '\u2014',
      primaryAddress: '\u2014', // TODO: Wire from client model
    },
    platformAddresses: {
      paypal: '\u2014',
      bank: '\u2014',
      edgeboost: '\u2014',
    },
    alertFlags: {},
    transactions: [], // TODO: Wire from real transaction data
    timeline: [], // TODO: Wire from event log
    zelle: '\u2014',
    relationships: [],
  }
}

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

  // State
  const [selectedClient, setSelectedClient] = useState<Client | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
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
            .includes(searchQuery.toLowerCase())

        if (!matchesSearch) return false

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
    <div className="flex h-full animate-fade-in">
      <ClientSidebar
        stats={stats}
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
