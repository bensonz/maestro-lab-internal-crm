import { BackofficeNav } from '@/components/backoffice/backoffice-nav'

export default function BackofficeLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen bg-slate-950">
      <BackofficeNav />
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  )
}
