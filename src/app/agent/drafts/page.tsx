import { auth } from '@/backend/auth'
import prisma from '@/backend/prisma/client'
import { redirect } from 'next/navigation'
import { FileEdit } from 'lucide-react'
import { DraftsList } from './_components/drafts-list'

export default async function DraftsPage() {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')

  const drafts = await prisma.applicationDraft.findMany({
    where: { agentId: session.user.id },
    orderBy: { updatedAt: 'desc' },
  })

  return (
    <div className="min-h-screen p-6 lg:p-8">
      {/* Header */}
      <div className="mb-8 animate-fade-in-up">
        <div className="flex items-center gap-3 mb-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-linear-to-br from-primary/20 to-chart-3/20 ring-1 ring-primary/20">
            <FileEdit className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="font-display text-2xl font-semibold tracking-tight text-foreground">
              Saved Drafts
            </h1>
            <p className="text-sm text-muted-foreground">
              Continue working on incomplete applications
            </p>
          </div>
        </div>
      </div>

      <DraftsList drafts={drafts} />
    </div>
  )
}
