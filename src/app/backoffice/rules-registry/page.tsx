import { redirect } from 'next/navigation'
import { auth } from '@/backend/auth'
import { getAllConfigValues } from '@/backend/data/config'
import { RegistryTabs } from './_components/registry-tabs'

export default async function RulesRegistryPage() {
  const session = await auth()
  if (!session?.user) redirect('/login')

  const isAdmin = session.user.role === 'ADMIN'

  // Only fetch config values if admin (they're the only ones who see the tab)
  const configValues = isAdmin ? await getAllConfigValues() : {}

  return <RegistryTabs isAdmin={isAdmin} configValues={configValues} />
}
