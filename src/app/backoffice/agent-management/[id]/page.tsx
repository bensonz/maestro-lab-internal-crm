import { getAgentIdList } from '@/backend/data/users'
import { AgentDetailView } from './_components/agent-detail-view'
import { requireAdmin } from '../../_require-admin'
import prisma from '@/backend/prisma/client'
import { getAgentEarnings } from '@/backend/data/bonus-pools'
import { countApprovedClients, getClientsByCloser } from '@/backend/data/clients'
import { getDraftsByCloser } from '@/backend/data/client-drafts'
import { STAR_THRESHOLDS } from '@/lib/commission-constants'
import { getAgentTimeline } from '@/backend/data/event-logs'
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

  // Fetch earnings, client counts, drafts, and timeline in parallel
  const [earningsData, approvedClients, allClients, drafts, timeline] = await Promise.all([
    getAgentEarnings(id).catch(() => null),
    countApprovedClients(id).catch(() => 0),
    getClientsByCloser(id).catch(() => []),
    getDraftsByCloser(id).catch(() => []),
    getAgentTimeline(id).catch(() => []),
  ])

  const starLabel = STAR_THRESHOLDS[user.starLevel]?.label ?? 'Unknown'

  // Calculate age from dateOfBirth
  const age = user.dateOfBirth
    ? Math.floor((Date.now() - new Date(user.dateOfBirth).getTime()) / (365.25 * 24 * 60 * 60 * 1000))
    : 0

  // Compute real performance metrics from available data
  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

  const thisMonthEarned = earningsData
    ? earningsData.allocations
        .filter((a) => new Date(a.createdAt) >= startOfMonth)
        .reduce((sum, a) => sum + a.amount, 0)
    : 0

  const approvedThisMonth = allClients.filter(
    (c) => c.status === 'APPROVED' && c.createdAt >= startOfMonth
  )
  const newClientsThisMonth = approvedThisMonth.length

  const clientsInProgress = drafts.length

  const totalClients = allClients.length
  const approvedCount = allClients.filter((c) => c.status === 'APPROVED').length
  const successRate = totalClients > 0 ? Math.round((approvedCount / totalClients) * 100) : 0

  // Monthly clients chart (last 6 months)
  const monthlyClients: { month: string; count: number }[] = []
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const end = new Date(d.getFullYear(), d.getMonth() + 1, 1)
    const count = allClients.filter(
      (c) => c.status === 'APPROVED' && c.createdAt >= d && c.createdAt < end
    ).length
    monthlyClients.push({
      month: d.toLocaleDateString('en-US', { month: 'short' }),
      count,
    })
  }

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
    companyPhone: user.companyPhone || '',
    carrier: user.carrier || '',
    companyEmail: user.email,
    personalEmail: user.personalEmail || '',
    personalPhone: user.personalPhone || '',
    zelle: user.zelle || '',
    address: user.address || '',
    loginAccount: user.loginAccount || '',
    loginEmail: user.email,
    totalClients: approvedClients,
    totalEarned: earningsData?.totalEarned ?? 0,
    thisMonthEarned,
    newClientsThisMonth,
    newClientsGrowth: 0,
    avgDaysToInitiate: 0,
    avgDaysToConvert: 0,
    successRate,
    referralRate: 0,
    extensionRate: 0,
    resubmissionRate: 0,
    avgAccountsPerClient: 0,
    clientsInProgress,
    avgDailyTodos: 0,
    delayRate: 0,
    monthlyClients,
    supervisor: user.supervisor ? { id: user.supervisor.id, name: user.supervisor.name } : null,
    directReports: user.subordinates.map((s) => ({ id: s.id, name: s.name })),
    timeline,
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
