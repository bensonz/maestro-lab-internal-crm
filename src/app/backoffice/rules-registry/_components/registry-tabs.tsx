'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { RulesRegistryView } from './rules-registry-view'
import { SystemConfigView } from './system-config-view'
import { Settings, BookOpen } from 'lucide-react'
import type { StatusOption } from '@/lib/account-status-config'
import type { PlatformDetailConfig } from '@/lib/status-config-keys'

interface RegistryTabsProps {
  isAdmin: boolean
  configValues: Record<string, string>
  statusConfigs: Record<string, StatusOption[]>
  detailConfigs: Record<string, PlatformDetailConfig>
}

export function RegistryTabs({ isAdmin, configValues, statusConfigs, detailConfigs }: RegistryTabsProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const tab = searchParams.get('tab') ?? 'rules'

  return (
    <div className="space-y-6 p-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-semibold">Rules & Configuration</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          System rules, notification triggers, and configurable settings.
        </p>
      </div>

      <Tabs
        value={tab}
        onValueChange={(v) => {
          const params = new URLSearchParams(searchParams.toString())
          if (v === 'rules') params.delete('tab')
          else params.set('tab', v)
          router.push(`?${params.toString()}`)
        }}
      >
        <TabsList>
          <TabsTrigger value="rules" data-testid="tab-rules">
            <BookOpen className="h-4 w-4" />
            Rules
          </TabsTrigger>
          {isAdmin && (
            <TabsTrigger value="config" data-testid="tab-config">
              <Settings className="h-4 w-4" />
              System Config
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="rules">
          <RulesRegistryView embedded />
        </TabsContent>

        {isAdmin && (
          <TabsContent value="config">
            <SystemConfigView
              initialValues={configValues}
              statusConfigs={statusConfigs}
              detailConfigs={detailConfigs}
            />
          </TabsContent>
        )}
      </Tabs>
    </div>
  )
}
