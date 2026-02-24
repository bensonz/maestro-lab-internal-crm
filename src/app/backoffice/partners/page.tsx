import { MOCK_PARTNERS_DATA } from '@/lib/mock-data'
import { PartnersView } from './_components/partners-view'

export default function PartnersPage() {
  return (
    <div
      className="space-y-6 p-6 animate-fade-in"
      data-testid="partners-page"
    >
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Partners</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage partners, client assignments, and profit sharing relationships
        </p>
      </div>

      <PartnersView data={MOCK_PARTNERS_DATA} />
    </div>
  )
}
