import { getLifecycleClients, getLifecycleStats } from '@/backend/data/backoffice'
import { ClientLifecyclePage } from './_components/client-lifecycle-page'

export default async function LifecycleServerPage() {
  const [clients, stats] = await Promise.all([
    getLifecycleClients(),
    getLifecycleStats(),
  ])
  return <ClientLifecyclePage serverClients={clients} stats={stats} />
}
