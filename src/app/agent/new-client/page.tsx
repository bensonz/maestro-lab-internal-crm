import { ClientForm } from './_components/client-form'

export default function NewClientPage() {
  return (
    <div className="p-6 text-white">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Start Your Application</h1>
        <p className="text-slate-400">
          Application Kickstart — Internal Pre-Screen & Review
        </p>
      </div>

      <ClientForm />
    </div>
  )
}
