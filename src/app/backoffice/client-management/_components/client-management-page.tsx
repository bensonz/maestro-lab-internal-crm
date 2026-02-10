'use client'

import { useState, useMemo, useCallback, useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
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
    case 'PARTNERSHIP_ENDED':
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

// Map event type enum values to timeline display types
function mapEventTypeToTimelineType(
  eventType: string,
): 'application' | 'verification' | 'status' | 'deposit' | 'withdrawal' | 'todo' | 'update' {
  const lower = eventType.toLowerCase()
  if (lower.includes('application') || lower.includes('submitted'))
    return 'application'
  if (
    lower.includes('verification') ||
    lower.includes('approval') ||
    lower.includes('rejection')
  )
    return 'verification'
  if (lower.includes('status')) return 'status'
  if (lower.includes('deposit') || lower.includes('fund')) return 'deposit'
  if (lower.includes('withdrawal')) return 'withdrawal'
  if (lower.includes('todo') || lower.includes('task')) return 'todo'
  return 'update'
}

// Map a single server client to our view model
function mapServerClientToClient(serverClient: ServerClientData): Client {
  // Parse questionnaire JSON for profile fields
  let questionnaire: Record<string, unknown> = {}
  try {
    if (serverClient.questionnaire) {
      questionnaire = JSON.parse(serverClient.questionnaire)
    }
  } catch {
    /* ignore parse errors */
  }

  return {
    id: serverClient.id,
    name: serverClient.name,
    companyPhone: serverClient.phone || '\u2014',
    carrier: '\u2014',
    companyEmail: serverClient.email || '\u2014',
    personalPhone: '\u2014',
    startDate: serverClient.start,
    status: mapIntakeStatusToClientStatus(serverClient.intakeStatus),
    intakeStatus: serverClient.intakeStatus,
    totalFunds: parseFloat(serverClient.funds.replace(/[$,]/g, '')) || 0,
    financePlatforms: [
      {
        name: 'PayPal',
        type: 'paypal' as const,
        status: 'active' as const,
        balance: 0, // No per-finance-platform balances in fund movement model yet
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
      zellePhone: (questionnaire.zellePhone as string) || '\u2014',
      edgeboostDebit: '\u2014',
      bankDebit: '\u2014',
      state: serverClient.state || '\u2014',
    },
    profile: {
      fullName: serverClient.name,
      dob: (questionnaire.dateOfBirth as string) || '\u2014',
      gender:
        ((questionnaire.gender as string) as 'Male' | 'Female') || 'Male',
      idExpiryDate: (questionnaire.idExpiry as string) || '\u2014',
      ssn: '\u2022\u2022\u2022\u2022', // Never expose real SSN client-side
      citizenship: (questionnaire.citizenship as string) || '\u2014',
      personalEmail: serverClient.email || '\u2014',
      primaryAddress: serverClient.address
        ? `${serverClient.address}, ${serverClient.city}, ${serverClient.state} ${serverClient.zipCode}`
        : '\u2014',
    },
    platformAddresses: {
      paypal: '\u2014',
      bank: '\u2014',
      edgeboost: '\u2014',
    },
    alertFlags: {},
    transactions: serverClient.transactions.map((t) => ({
      id: t.id,
      type:
        t.type === 'DEPOSIT'
          ? ('deposit' as const)
          : t.type === 'WITHDRAWAL'
            ? ('withdrawal' as const)
            : ('deposit' as const),
      amount: t.amount,
      date: new Date(t.date).toLocaleDateString(),
      platform: t.platformType || '\u2014',
    })),
    timeline: serverClient.eventLogs.map((e) => ({
      id: e.id,
      event: e.description,
      date: new Date(e.createdAt).toLocaleDateString(),
      type: mapEventTypeToTimelineType(e.eventType),
    })),
    zelle: (questionnaire.zellePhone as string) || '\u2014',
    relationships: [],
    questionnaire: Object.keys(questionnaire).length > 0 ? questionnaire : null,
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
