import { redirect } from 'next/navigation'
import { auth } from '@/backend/auth'
import { getAllConfigValues } from '@/backend/data/config'
import { loadAllStatusConfigs, loadAllDetailConfigs } from '@/backend/data/status-config'
import { RegistryTabs } from './_components/registry-tabs'
import type { StatusOption } from '@/lib/account-status-config'
import type { PlatformDetailConfig } from '@/lib/status-config-keys'

export default async function RulesRegistryPage() {
  const session = await auth()
  if (!session?.user) redirect('/login')

  const isAdmin = session.user.role === 'ADMIN'

  let configValues: Record<string, string> = {}
  let statusConfigs: Record<string, StatusOption[]> = {}
  let detailConfigs: Record<string, PlatformDetailConfig> = {}

  if (isAdmin) {
    ;[configValues, statusConfigs, detailConfigs] = await Promise.all([
      getAllConfigValues(),
      loadAllStatusConfigs(),
      loadAllDetailConfigs(),
    ])
  }

  return (
    <RegistryTabs
      isAdmin={isAdmin}
      configValues={configValues}
      statusConfigs={statusConfigs}
      detailConfigs={detailConfigs}
    />
  )
}
