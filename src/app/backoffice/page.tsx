import { getCockpitData } from '@/backend/data/cockpit'
import { requireAdmin } from './_require-admin'
import { FundWarRoom } from './_components/fund-war-room'
import { AgentActivity } from './_components/agent-activity'
import { OnboardingBottleneck } from './_components/onboarding-bottleneck'

export default async function BackofficeCockpitPage() {
  await requireAdmin()
  const data = await getCockpitData()

  return (
    <div className="space-y-4 p-6 animate-fade-in" data-testid="cockpit-page">
      <FundWarRoom data={data.fundWarRoom} />
      <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-2">
        <OnboardingBottleneck data={data.bottleneck} />
        <AgentActivity data={data.agentActivity} />
      </div>
    </div>
  )
}
