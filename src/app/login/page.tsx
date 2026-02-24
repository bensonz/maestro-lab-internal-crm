'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { signIn } from 'next-auth/react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Sparkles, ArrowRight, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { ApplicationForm } from './_components/application-form'

type Tab = 'signin' | 'apply'

export default function LoginPage() {
  const router = useRouter()
  const [tab, setTab] = useState<Tab>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
      })

      if (result?.error) {
        setError('Invalid email or password')
        setLoading(false)
        return
      }

      // Redirect based on role — fetch session to determine
      const res = await fetch('/api/auth/session')
      const session = await res.json()

      if (
        session?.user?.role === 'ADMIN' ||
        session?.user?.role === 'BACKOFFICE'
      ) {
        router.push('/backoffice')
      } else {
        router.push('/agent')
      }
    } catch {
      setError('Something went wrong. Please try again.')
      setLoading(false)
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background">
      {/* Aurora background effect */}
      <div className="aurora-bg absolute inset-0" />

      {/* Mesh gradient overlay */}
      <div className="absolute inset-0 mesh-bg opacity-60" />

      {/* Animated orbs */}
      <div className="absolute top-1/4 left-1/4 h-[500px] w-[500px] rounded-full bg-primary/10 blur-[120px] animate-float" />
      <div
        className="absolute bottom-1/4 right-1/4 h-[400px] w-[400px] rounded-full bg-chart-3/10 blur-[100px] animate-float"
        style={{ animationDelay: '-3s' }}
      />
      <div
        className="absolute top-1/2 right-1/3 h-[300px] w-[300px] rounded-full bg-accent/8 blur-[80px] animate-float"
        style={{ animationDelay: '-5s' }}
      />

      {/* Subtle grid pattern */}
      <div className="absolute inset-0 grid-pattern opacity-30" />

      {/* Content */}
      <div className="relative z-10 w-full max-w-[420px] px-6">
        {/* Logo & Header */}
        <div className="mb-10 text-center animate-fade-in-up">
          <div className="mb-6 inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/20 to-chart-3/20 ring-1 ring-primary/30 shadow-lg shadow-primary/20">
            <Sparkles className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-4xl font-semibold tracking-tight text-foreground">
            {tab === 'signin' ? 'Welcome back' : 'Join the team'}
          </h1>
          <p className="mt-3 text-base text-muted-foreground">
            {tab === 'signin'
              ? 'Sign in to continue to Maestro L.A.B'
              : 'Apply to become a Maestro L.A.B agent'}
          </p>
        </div>

        {/* Tab Toggle */}
        <div
          className="mb-6 flex rounded-xl bg-muted/50 p-1 ring-1 ring-border/40 animate-fade-in-up"
          style={{ animationDelay: '0.05s' }}
        >
          <button
            onClick={() => setTab('signin')}
            className={cn(
              'flex-1 rounded-lg py-2 text-sm font-medium transition-all',
              tab === 'signin'
                ? 'bg-card text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground',
            )}
            data-testid="tab-signin"
          >
            Sign In
          </button>
          <button
            onClick={() => setTab('apply')}
            className={cn(
              'flex-1 rounded-lg py-2 text-sm font-medium transition-all',
              tab === 'apply'
                ? 'bg-card text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground',
            )}
            data-testid="tab-apply"
          >
            Apply as Agent
          </button>
        </div>

        {/* Card */}
        <div
          className="animate-fade-in-up rounded-2xl border border-border/60 bg-card/90 p-8 shadow-2xl shadow-black/30 backdrop-blur-xl"
          style={{ animationDelay: '0.1s' }}
        >
          {tab === 'signin' ? (
            <form
              onSubmit={handleSubmit}
              className="space-y-6"
              data-testid="login-form"
            >
              {error && (
                <div className="rounded-xl bg-destructive/10 px-4 py-3 text-sm font-medium text-destructive ring-1 ring-destructive/20">
                  {error}
                </div>
              )}

              <div className="space-y-2">
                <Label
                  htmlFor="email"
                  className="text-sm font-medium text-foreground"
                >
                  Email address
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-12 rounded-xl border-border/50 bg-input px-4 text-foreground placeholder:text-muted-foreground transition-all focus:border-primary focus:ring-2 focus:ring-primary/20 focus:bg-input/80"
                  placeholder="you@example.com"
                  required
                  data-testid="login-email"
                />
              </div>

              <div className="space-y-2">
                <Label
                  htmlFor="password"
                  className="text-sm font-medium text-foreground"
                >
                  Password
                </Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-12 rounded-xl border-border/50 bg-input px-4 text-foreground placeholder:text-muted-foreground transition-all focus:border-primary focus:ring-2 focus:ring-primary/20 focus:bg-input/80"
                  placeholder="Enter your password"
                  required
                  data-testid="login-password"
                />
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="btn-glow group h-12 w-full rounded-xl bg-primary text-primary-foreground font-semibold shadow-lg shadow-primary/30 transition-all duration-300 hover:bg-primary/90 hover:shadow-xl hover:shadow-primary/40 disabled:opacity-50"
                data-testid="login-submit"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  <>
                    Sign in
                    <ArrowRight className="ml-2 h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
                  </>
                )}
              </Button>
            </form>
          ) : (
            <ApplicationForm />
          )}
        </div>

        {/* Demo Accounts — only show for Sign In */}
        {tab === 'signin' && (
          <div
            className="mt-8 animate-fade-in-up"
            style={{ animationDelay: '0.2s' }}
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="h-px flex-1 bg-gradient-to-r from-transparent via-border to-transparent" />
              <span className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
                Demo accounts
              </span>
              <div className="h-px flex-1 bg-gradient-to-r from-transparent via-border to-transparent" />
            </div>

            <div className="grid gap-2">
              <div className="flex items-center justify-between rounded-xl bg-card/60 px-4 py-3 ring-1 ring-border/40 backdrop-blur-sm">
                <div className="flex items-center gap-3">
                  <div className="h-2 w-2 rounded-full bg-primary status-dot" />
                  <span className="text-sm text-muted-foreground">Agent</span>
                </div>
                <code className="font-mono text-xs text-foreground">
                  agent@test.com
                </code>
              </div>
              <div className="flex items-center justify-between rounded-xl bg-card/60 px-4 py-3 ring-1 ring-border/40 backdrop-blur-sm">
                <div className="flex items-center gap-3">
                  <div className="h-2 w-2 rounded-full bg-accent status-dot" />
                  <span className="text-sm text-muted-foreground">Admin</span>
                </div>
                <code className="font-mono text-xs text-foreground">
                  admin@test.com
                </code>
              </div>
            </div>
            <p className="mt-3 text-center text-xs text-muted-foreground">
              Password:{' '}
              <code className="font-mono text-foreground/80">password123</code>
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
