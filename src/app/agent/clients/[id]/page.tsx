import { MOCK_CLIENT_DETAIL } from '@/lib/mock-data'
import { ClientDetailView } from './_components/client-detail-view'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function ClientDetailPage({ params }: PageProps) {
  // Consume the params promise (required by Next.js) but use mock data
  await params

  return <ClientDetailView client={MOCK_CLIENT_DETAIL} />
}
