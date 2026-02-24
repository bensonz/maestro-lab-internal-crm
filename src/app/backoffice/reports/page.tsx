import {
  MOCK_PARTNER_REPORT,
  MOCK_AGENT_REPORT,
  MOCK_LTV_REPORT,
} from '@/lib/mock-data'
import { ReportsView } from './_components/reports-view'

export default function ReportsPage() {
  return (
    <ReportsView
      partnerReport={MOCK_PARTNER_REPORT}
      agentReport={MOCK_AGENT_REPORT}
      ltvReport={MOCK_LTV_REPORT}
    />
  )
}
