'use client'

import { useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'

interface LiveRefreshWrapperProps {
  /** Whether to enable polling (disable when no active drafts) */
  enabled: boolean
  /** Refresh interval in milliseconds (default: 15000 = 15s) */
  interval?: number
  children: React.ReactNode
}

/**
 * Wraps children with a background polling loop that calls `router.refresh()`
 * every N seconds to re-fetch server data (SSR page re-render).
 *
 * Stops polling when `enabled` is false or the tab is hidden.
 */
export function LiveRefreshWrapper({
  enabled,
  interval = 15000,
  children,
}: LiveRefreshWrapperProps) {
  const router = useRouter()
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    if (!enabled) return

    function startPolling() {
      if (timerRef.current) clearInterval(timerRef.current)
      timerRef.current = setInterval(() => {
        // Only refresh when tab is visible
        if (!document.hidden) {
          router.refresh()
        }
      }, interval)
    }

    function handleVisibilityChange() {
      if (document.hidden) {
        // Pause polling when tab is hidden
        if (timerRef.current) {
          clearInterval(timerRef.current)
          timerRef.current = null
        }
      } else {
        // Resume polling and immediately refresh when tab becomes visible
        router.refresh()
        startPolling()
      }
    }

    startPolling()
    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [enabled, interval, router])

  return <>{children}</>
}
