import { getAllClients, getClientStats } from '@/backend/data/backoffice'
import { ClientManagementPage } from './_components/client-management-page'

export default async function ClientManagementServerPage() {
  const [clients, stats] = await Promise.all([
    getAllClients(),
    getClientStats(),
  ])

  return <ClientManagementPage serverClients={clients} stats={stats} />
}
