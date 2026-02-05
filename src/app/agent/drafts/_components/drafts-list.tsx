'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { formatDistanceToNow } from 'date-fns'
import Link from 'next/link'
import { Trash2, Edit, FileText } from 'lucide-react'
import { deleteDraft } from '@/app/actions/drafts'
import { useRouter } from 'next/navigation'
import { useTransition } from 'react'

interface Draft {
  id: string
  formData: unknown
  updatedAt: Date
}

export function DraftsList({ drafts }: { drafts: Draft[] }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const handleDelete = async (draftId: string) => {
    startTransition(async () => {
      await deleteDraft(draftId)
      router.refresh()
    })
  }

  if (drafts.length === 0) {
    return (
      <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
        <CardContent className="py-12 text-center">
          <div className="flex justify-center mb-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-muted/50">
              <FileText className="h-6 w-6 text-muted-foreground" />
            </div>
          </div>
          <p className="text-muted-foreground mb-4">No saved drafts yet.</p>
          <Link href="/agent/new-client">
            <Button variant="outline">Start New Application</Button>
          </Link>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {drafts.map((draft) => {
        const data = draft.formData as Record<string, string>
        const name =
          [data?.firstName, data?.lastName].filter(Boolean).join(' ') ||
          'Unnamed Client'

        return (
          <Card
            key={draft.id}
            className="border-border/50 bg-card/80 backdrop-blur-sm animate-fade-in-up"
          >
            <CardContent className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted/50">
                  <FileText className="h-5 w-5 text-muted-foreground" />
                </div>
                <div>
                  <p className="font-medium text-foreground">{name}</p>
                  <p className="text-sm text-muted-foreground">
                    Updated{' '}
                    {formatDistanceToNow(new Date(draft.updatedAt), {
                      addSuffix: true,
                    })}
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <Link href={`/agent/new-client?draft=${draft.id}`}>
                  <Button variant="outline" size="sm">
                    <Edit className="w-4 h-4 mr-1" />
                    Continue
                  </Button>
                </Link>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-destructive hover:text-destructive hover:bg-destructive/10"
                  onClick={() => handleDelete(draft.id)}
                  disabled={isPending}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
