'use client'

import { Star, Users } from 'lucide-react'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'

interface TeamMember {
  name: string
  stars: number
  status?: 'active' | 'inactive'
}

interface TeamDirectoryData {
  myPosition: {
    stars: number
  }
  upline?: {
    name: string
    stars: number
  }
  directTeam: TeamMember[]
  extendedTeam: {
    level2: number
    level3: number
  }
}

// TODO: fetch from agent hierarchy
const mockTeamDirectory: TeamDirectoryData = {
  myPosition: {
    stars: 2,
  },
  upline: {
    name: 'Alex Chen',
    stars: 4,
  },
  directTeam: [
    { name: 'Sarah L.', stars: 2, status: 'active' },
    { name: 'Mike W.', stars: 1, status: 'active' },
    { name: 'Emma T.', stars: 3, status: 'active' },
    { name: 'David R.', stars: 1, status: 'inactive' },
    { name: 'Lisa M.', stars: 2, status: 'active' },
  ],
  extendedTeam: {
    level2: 6,
    level3: 3,
  },
}

function StarDisplay({
  count,
  size = 'sm',
}: {
  count: number
  size?: 'sm' | 'md'
}) {
  const starSize = size === 'sm' ? 'h-3 w-3' : 'h-3.5 w-3.5'
  return (
    <div className="flex items-center gap-0.5">
      {Array(count)
        .fill(0)
        .map((_, i) => (
          <Star
            key={i}
            className={cn(starSize, 'fill-warning text-warning')}
          />
        ))}
    </div>
  )
}

export function TeamDirectoryPanel() {
  const data = mockTeamDirectory

  return (
    <div className="flex h-full w-56 min-w-56 flex-col border-r border-sidebar-border bg-sidebar">
      <div className="border-b border-sidebar-border p-4">
        <h3 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          <Users className="h-3.5 w-3.5" />
          Team Directory
        </h3>
      </div>

      <ScrollArea className="flex-1">
        <div className="space-y-4 p-3">
          {/* My Position */}
          <div className="space-y-2">
            <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
              My Position
            </p>
            <div className="flex items-center gap-2">
              <StarDisplay count={data.myPosition.stars} size="md" />
              <span className="text-sm font-medium text-foreground">
                {data.myPosition.stars}-Star
              </span>
            </div>
          </div>

          <Separator className="bg-border/50" />

          {/* Upline */}
          {data.upline && (
            <>
              <div className="space-y-2">
                <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                  Upline
                </p>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-foreground">
                    {data.upline.name}
                  </span>
                  <StarDisplay count={data.upline.stars} />
                </div>
              </div>

              <Separator className="bg-border/50" />
            </>
          )}

          {/* Direct Team */}
          <div className="space-y-2">
            <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
              Direct Team ({data.directTeam.length})
            </p>
            <div className="space-y-1.5">
              {data.directTeam.map((member, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between rounded bg-muted/20 px-2 py-1"
                  data-testid={`team-member-${idx}`}
                >
                  <div className="flex items-center gap-2">
                    <span
                      className={cn(
                        'h-1.5 w-1.5 rounded-full',
                        member.status === 'active'
                          ? 'bg-success'
                          : 'bg-muted-foreground/40',
                      )}
                    />
                    <span
                      className={cn(
                        'text-sm',
                        member.status === 'active'
                          ? 'text-foreground'
                          : 'text-muted-foreground',
                      )}
                    >
                      {member.name}
                    </span>
                  </div>
                  <StarDisplay count={member.stars} />
                </div>
              ))}
            </div>
          </div>

          <Separator className="bg-border/50" />

          {/* Extended Team */}
          <div className="space-y-2">
            <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
              Extended Team
            </p>
            <div className="space-y-1.5 text-sm">
              <div className="flex items-center justify-between rounded bg-muted/10 px-2 py-1">
                <span className="text-muted-foreground">Level 2</span>
                <span className="font-mono text-foreground">
                  {data.extendedTeam.level2} members
                </span>
              </div>
              <div className="flex items-center justify-between rounded bg-muted/10 px-2 py-1">
                <span className="text-muted-foreground">Level 3</span>
                <span className="font-mono text-foreground">
                  {data.extendedTeam.level3} members
                </span>
              </div>
            </div>
          </div>
        </div>
      </ScrollArea>
    </div>
  )
}
