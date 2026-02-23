import { getAgentIdList } from '@/backend/data/users'
import { AgentDetailView } from './_components/agent-detail-view'
import { requireAdmin } from '../../_require-admin'
import prisma from '@/backend/prisma/client'
import { getAgentEarnings } from '@/backend/data/bonus-pools'
import { countApprovedClients } from '@/backend/data/clients'
import { STAR_THRESHOLDS } from '@/lib/commission-constants'
import type { AgentDetailData } from '@/types/backend-types'

export default async function AgentDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ view?: string }>
}) {
  await requireAdmin()
  const { id } = await params
  const { view } = await searchParams
  const viewMode = view === 'tree' ? 'tree' : 'table'
  const agentIds = await getAgentIdList(viewMode)
  const currentIndex = agentIds.indexOf(id)
  const prevAgentId = currentIndex > 0 ? agentIds[currentIndex - 1] : null
  const nextAgentId = currentIndex < agentIds.length - 1 ? agentIds[currentIndex + 1] : null

  // Fetch real agent data
  const user = await prisma.user.findUnique({
    where: { id },
    include: {
      supervisor: { select: { id: true, name: true } },
      subordinates: { select: { id: true, name: true } },
    },
  })

  if (!user) {
    return (
      <div className="flex h-full items-center justify-center p-6">
        <p className="text-muted-foreground">Agent not found</p>
      </div>
    )
  }

  // Fetch earnings and client counts in parallel
  const [earningsData, approvedClients] = await Promise.all([
    getAgentEarnings(id).catch(() => null),
    countApprovedClients(id).catch(() => 0),
  ])

  const starLabel = STAR_THRESHOLDS[user.starLevel]?.label ?? 'Unknown'

  // Calculate age from dateOfBirth
  const age = user.dateOfBirth
    ? Math.floor((Date.now() - new Date(user.dateOfBirth).getTime()) / (365.25 * 24 * 60 * 60 * 1000))
    : 0

  const agentDetail: AgentDetailData = {
    id: user.id,
    name: user.name,
    gender: user.gender || 'Not specified',
    age,
    idNumber: user.idNumber || '',
    idExpiry: user.idExpiry ? new Date(user.idExpiry).toLocaleDateString() : '',
    ssn: '',
    citizenship: user.citizenship || '',
    startDate: new Date(user.createdAt).toLocaleDateString(),
    tier: starLabel,
    stars: user.starLevel,
    companyPhone: user.phone || '',
    carrier: '',
    companyEmail: user.email,
    personalEmail: user.personalEmail || '',
    personalPhone: user.personalPhone || '',
    zelle: user.zelle || '',
    address: user.address || '',
    loginAccount: user.loginAccount || '',
    loginEmail: user.email,
    totalClients: approvedClients,
    totalEarned: earningsData?.totalEarned ?? 0,
    thisMonthEarned: 0,
    newClientsThisMonth: 0,
    newClientsGrowth: 0,
    avgDaysToInitiate: 0,
    avgDaysToConvert: 0,
    successRate: 0,
    referralRate: 0,
    extensionRate: 0,
    resubmissionRate: 0,
    avgAccountsPerClient: 0,
    clientsInProgress: 0,
    avgDailyTodos: 0,
    delayRate: 0,
    monthlyClients: [],
    supervisor: user.supervisor ? { id: user.supervisor.id, name: user.supervisor.name } : null,
    directReports: user.subordinates.map((s) => ({ id: s.id, name: s.name })),
    timeline: [],
    idDocumentUrl: undefined,
  }

  return (
    <AgentDetailView
      agent={agentDetail}
      prevAgentId={prevAgentId}
      nextAgentId={nextAgentId}
      viewMode={viewMode}
    />
  )
}
