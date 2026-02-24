import { requireAdmin } from '../_require-admin'
import { getAllUsers } from '@/backend/data/users'
import { LoginManagementView } from './_components/login-management-view'

export default async function LoginManagementPage() {
  const session = await requireAdmin()

  let users: Awaited<ReturnType<typeof getAllUsers>> = []

  try {
    users = await getAllUsers()
  } catch {
    // Database not available — continue with empty data
  }

  return (
    <LoginManagementView
      users={JSON.parse(JSON.stringify(users))}
      currentUserRole={session.role}
      currentUserId={session.id}
    />
  )
}
