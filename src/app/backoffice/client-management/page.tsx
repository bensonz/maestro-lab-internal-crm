import { ClientManagementPage } from './_components/client-management-page'
import { getAllClients } from '@/backend/data/clients'
import type { ServerClientData, ServerClientStats } from './_components/types'

export default async function ClientManagementServerPage() {
  let serverClients: ServerClientData[] = []
  let stats: ServerClientStats = { total: 0, active: 0, ended: 0, verificationNeeded: 0 }

  try {
    const dbClients = await getAllClients()

    serverClients = dbClients.map((c) => ({
      id: c.id,
      name: `${c.firstName} ${c.lastName}`,
      phone: c.phone ?? '',
      email: c.email ?? null,
      start: c.createdAt.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }),
      funds: c.bonusPool ? `$${c.bonusPool.totalAmount}` : '$0',
      totalPaid: c.bonusPool?.totalAmount ?? 0,
      platforms: [],
      activePlatforms: [],
      intakeStatus: c.status,
      agent: c.closer?.name ?? null,
      address: null,
      city: null,
      state: null,
      zipCode: null,
      country: null,
      idDocument: null,
      questionnaire: null,
      platformDetails: [],
      transactions: [],
      eventLogs: [],
    }))

    const activeCount = dbClients.filter((c) => c.status === 'APPROVED').length
    const endedCount = dbClients.filter((c) => c.status === 'CLOSED' || c.status === 'REJECTED').length
    const verificationCount = dbClients.filter((c) => c.status === 'PENDING').length

    stats = {
      total: dbClients.length,
      active: activeCount,
      ended: endedCount,
      verificationNeeded: verificationCount,
    }
  } catch (e) {
    console.error('[client-management] DB fetch error:', e)
  }

  return (
    <ClientManagementPage
      serverClients={serverClients}
      stats={stats}
    />
  )
}
