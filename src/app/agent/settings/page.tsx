import { MOCK_SESSION } from '@/lib/mock-data'
import { SettingsView } from './_components/settings-view'

export default function SettingsPage() {
  return (
    <SettingsView
      user={{
        id: MOCK_SESSION.user.id,
        name: MOCK_SESSION.user.name ?? '',
        email: MOCK_SESSION.user.email ?? '',
        role: MOCK_SESSION.user.role,
      }}
    />
  )
}
