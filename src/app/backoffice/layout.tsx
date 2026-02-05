import { BackofficeNav } from '@/components/backoffice/backoffice-nav'
import { requireAdmin } from './_require-admin'

export default async function BackofficeLayout({ children }: { children: React.ReactNode }) {
  const user = await requireAdmin()

  return (
    <div className="flex h-screen bg-slate-950">
      <BackofficeNav user={user} />
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  )
}
