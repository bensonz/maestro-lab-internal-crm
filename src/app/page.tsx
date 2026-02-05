import { redirect } from 'next/navigation'

// Root redirects to agent dashboard
export default function Home() {
  redirect('/')
}
