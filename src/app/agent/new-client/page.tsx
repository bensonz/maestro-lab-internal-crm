import { ClientForm } from './_components/client-form'
import { UserPlus } from 'lucide-react'

export default function NewClientPage() {
  return (
    <div className="min-h-screen p-8">
      {/* Header */}
      <div className="mb-8 animate-fade-in-up">
        <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
          <UserPlus className="h-6 w-6 text-primary" />
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">
          New Client Application
        </h1>
        <p className="mt-1 text-muted-foreground">
          Start the onboarding process for a new client
        </p>
      </div>

      <ClientForm />
    </div>
  )
}
