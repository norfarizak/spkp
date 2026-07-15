'use client'
import { useEffect, useRef, useState } from 'react'
import { useAppStore } from '@/lib/store'

export function useSession() {
  const [loading, setLoading] = useState(true)
  // Subscribe to store user so we re-render when login/logout updates it
  const user = useAppStore((s) => s.user)
  const setUser = useAppStore((s) => s.setUser)
  const initialized = useRef(false)

  useEffect(() => {
    if (initialized.current) return
    initialized.current = true

    // If store already has a user (e.g. right after login), no need to fetch
    if (useAppStore.getState().user) {
      Promise.resolve().then(() => setLoading(false))
      return
    }
    let mounted = true
    fetch('/api/auth/me', { credentials: 'include' })
      .then((r) => r.json())
      .then((d) => {
        if (!mounted) return
        if (d.user) setUser(d.user)
      })
      .catch(() => {})
      .finally(() => {
        if (mounted) Promise.resolve().then(() => setLoading(false))
      })
    return () => {
      mounted = false
    }
  }, [setUser])

  return { user, loading }
}
