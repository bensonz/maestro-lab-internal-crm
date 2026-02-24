import {
  MOCK_SERVER_CLIENTS,
  MOCK_CLIENT_MANAGEMENT_STATS,
} from '@/lib/mock-data'
import { ClientManagementPage } from './_components/client-management-page'

export default function ClientManagementServerPage() {
  return (
    <ClientManagementPage
      serverClients={MOCK_SERVER_CLIENTS}
      stats={MOCK_CLIENT_MANAGEMENT_STATS}
    />
  )
}
