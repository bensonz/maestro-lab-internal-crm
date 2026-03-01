import { redirect } from 'next/navigation'
import { auth } from '@/backend/auth'
import { GmailSettingsView } from './_components/gmail-settings-view'

export default async function GmailSettingsPage() {
  const session = await auth()
  if (!session?.user) redirect('/login')

  if (session.user.role !== 'ADMIN') {
    redirect('/backoffice/todo-list')
  }

  return <GmailSettingsView />
}
