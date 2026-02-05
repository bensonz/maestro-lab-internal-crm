import { auth } from '@/backend/auth'

export default async function AgentDashboard() {
  const session = await auth()

  return (
    <div className="p-6 text-white">
      <h1 className="text-2xl font-bold">Dashboard</h1>
      <p className="text-slate-400">Welcome back, {session?.user?.name || 'Guest'}</p>
      <pre className="mt-4 text-xs text-slate-500">
        {JSON.stringify(session, null, 2)}
      </pre>
    </div>
  )
}
