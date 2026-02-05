import { ClientForm } from './_components/client-form'
import { FileText } from 'lucide-react'

export default function NewClientPage() {
  return (
    <div className="min-h-screen p-6 lg:p-8">
      {/* Header */}
      <div className="mb-8 animate-fade-in-up">
        <div className="flex items-center gap-3 mb-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-linear-to-br from-primary/20 to-chart-3/20 ring-1 ring-primary/20">
            <FileText className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="font-display text-2xl font-semibold tracking-tight text-foreground">
              Start Your Application
            </h1>
            <p className="text-sm text-muted-foreground">
              Application Kickstart — Internal Pre-Screen & Review
            </p>
          </div>
        </div>
      </div>

      <ClientForm />
    </div>
  )
}
