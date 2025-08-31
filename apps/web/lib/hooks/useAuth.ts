import { useState, useEffect } from 'react'
import { apiClient } from '@/lib/api-client-new'
import { User } from '@/lib/types/user'

interface UseAuthOptions {
  onSignOut?: () => void
}

export function useAuth(options: UseAuthOptions = {}) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true
    let authStateTimeout: NodeJS.Timeout | null = null

    // Debounced auth state handler to prevent race conditions
    const debouncedAuthStateChange = (session: unknown) => {
      if (authStateTimeout) {
        clearTimeout(authStateTimeout)
      }
      
      authStateTimeout = setTimeout(async () => {
        if (!mounted) return
        
        if ((session as { user?: unknown })?.user) {
          // User signed in - get their profile data
          try {
            const userData = await apiClient.getCurrentUser()
            if (mounted && userData) {
              setUser(userData)
            }
          } catch (error) {
            // Profile might not exist yet for new users, or auth error
            console.warn('Auth state change error:', error)
            if (mounted) setUser(null)
          }
        } else {
          // User signed out
          if (mounted) {
            setUser(null)
            options.onSignOut?.()
          }
        }
      }, 200) // 200ms debounce
    }

    // Initialize auth state immediately (non-blocking)
    const initializeAuth = async () => {
      try {
        const session = await apiClient.getSession()
        if (mounted) {
          if (session?.user) {
            // Try to get user data, but don't block the UI
            apiClient.getCurrentUser().then(userData => {
              if (mounted && userData) {
                setUser(userData)
              }
            }).catch((error) => {
              // Auth errors during init, clear state
              console.warn('Init auth error:', error)
              if (mounted) setUser(null)
            })
          } else {
            setUser(null)
          }
          setLoading(false) // Always stop loading after initial check
        }
      } catch (error) {
        console.warn('Initialize auth error:', error)
        if (mounted) {
          setUser(null)
          setLoading(false)
        }
      }
    }

    // Set up Supabase auth state listener for real-time updates
    const { data: { subscription } } = apiClient.onAuthStateChange(debouncedAuthStateChange)

    initializeAuth()

    return () => {
      mounted = false
      if (authStateTimeout) {
        clearTimeout(authStateTimeout)
      }
      if (subscription) {
        subscription.unsubscribe()
      }
    }
  }, [options])

  return { user, loading, setUser }
}