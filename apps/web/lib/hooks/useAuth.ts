import { useState, useEffect, useRef, useCallback } from 'react'
import { apiClient } from '@/lib/api-client-new'
import { User } from '@/lib/types/user'

interface UseAuthOptions {
  onSignOut?: () => void
}

export function useAuth(options: UseAuthOptions = {}) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const authStateTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const stableUserRef = useRef<User | null>(null)

  // Stabilize the onSignOut callback to prevent unnecessary effect re-runs
  const stableOnSignOut = useCallback(options.onSignOut || (() => {}), [options.onSignOut])

  useEffect(() => {
    let mounted = true

    // Enhanced debounced auth state handler to prevent race conditions
    const debouncedAuthStateChange = (session: unknown) => {
      if (authStateTimeoutRef.current) {
        clearTimeout(authStateTimeoutRef.current)
      }
      
      authStateTimeoutRef.current = setTimeout(async () => {
        if (!mounted) return
        
        if ((session as { user?: unknown })?.user) {
          // User signed in - get their profile data
          try {
            const userData = await apiClient.getCurrentUser()
            if (mounted && userData) {
              // Only update user if it's actually different to prevent unnecessary re-renders
              if (!stableUserRef.current || stableUserRef.current.id !== userData.id) {
                stableUserRef.current = userData
                setUser(userData)
              }
            }
          } catch (error) {
            // Profile might not exist yet for new users, or auth error
            console.warn('Auth state change error:', error)
            if (mounted) {
              stableUserRef.current = null
              setUser(null)
            }
          }
        } else {
          // User signed out - only call onSignOut if we actually had a user before
          if (mounted && stableUserRef.current) {
            stableUserRef.current = null
            setUser(null)
            stableOnSignOut()
          }
        }
      }, 200) // Reduced debounce to 200ms for better responsiveness
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
      if (authStateTimeoutRef.current) {
        clearTimeout(authStateTimeoutRef.current)
      }
      if (subscription) {
        subscription.unsubscribe()
      }
    }
  }, [stableOnSignOut])

  return { user, loading, setUser, stableUser: stableUserRef.current }
}