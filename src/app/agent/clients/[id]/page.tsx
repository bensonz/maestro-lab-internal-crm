import { auth } from '@/backend/auth'
import { redirect, notFound } from 'next/navigation'
import { getClientDetail } from '@/backend/data/agent'
import { ClientDetailView } from './_components/client-detail-view'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function ClientDetailPage({ params }: PageProps) {
  const session = await auth()
  if (!session?.user) redirect('/login')

  const { id } = await params
  const client = await getClientDetail(id, session.user.id)

  if (!client) {
    notFound()
  }

  return <ClientDetailView client={client} />
}
