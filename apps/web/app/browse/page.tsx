'use client'

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { BrowsePage } from "@/components/browse/browse-page"
import { User } from "@/lib/types/user"
import { apiClient } from "@/lib/api-client-new"
import ProfileView from "@/components/profile/profile-view"

export default function Browse() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [currentView, setCurrentView] = useState<'browse' | 'profile-view'>('browse')
  const [selectedUsername, setSelectedUsername] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true
    let authStateTimeout: NodeJS.Timeout | null = null

    // Debounced auth state handler (prevents race conditions)
    const debouncedAuthStateChange = (session: unknown) => {
      if (authStateTimeout) {
        clearTimeout(authStateTimeout)
      }
      
      authStateTimeout = setTimeout(async () => {
        if (!mounted) return
        
        if ((session as { user?: unknown })?.user) {
          try {
            const userData = await apiClient.getCurrentUser()
            if (mounted && userData) {
              setUser(userData)
            }
          } catch (error) {
            console.warn('Browse page auth error:', error)
            if (mounted) setUser(null)
          }
        } else {
          if (mounted) {
            setUser(null)
          }
        }
      }, 200) // 200ms debounce (matches homepage)
    }

    // Initialize auth state
    const initializeAuth = async () => {
      try {
        const session = await apiClient.getSession()
        if (mounted) {
          if (session?.user) {
            apiClient.getCurrentUser().then(userData => {
              if (mounted && userData) {
                setUser(userData)
              }
            }).catch((error) => {
              console.warn('Browse page init auth error:', error)
              if (mounted) setUser(null)
            })
          } else {
            setUser(null)
          }
          setLoading(false)
        }
      } catch (error) {
        console.warn('Browse page initialize auth error:', error)
        if (mounted) {
          setUser(null)
          setLoading(false)
        }
      }
    }

    // Set up auth listener
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
  }, [])

  const handleCreateListing = () => {
    router.push('/')
  }

  const handleLogout = async () => {
    try {
      await apiClient.signOut()
      router.push('/')
    } catch (error) {
      console.error('Error signing out:', error)
      router.push('/')
    }
  }

  const handleItemClick = (itemId: number) => {
    router.push(`/marketplace/${itemId}`)
  }

  const handleSignIn = () => {
    router.push('/')
  }

  const handleViewProfile = (username?: string) => {
    if (username && typeof username === 'string') {
      setSelectedUsername(username)
    } else if (user && user.username && typeof user.username === 'string') {
      setSelectedUsername(user.username)
    } else {
      return
    }
    setCurrentView('profile-view')
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-blue-50">
        <div className="animate-pulse text-slate-600">Loading marketplace...</div>
      </div>
    )
  }

  // Render profile view if that's the current view
  if (currentView === 'profile-view' && selectedUsername) {
    return (
      <ProfileView
        username={selectedUsername}
      />
    )
  }

  return (
    <BrowsePage 
      user={user}
      onCreateListing={handleCreateListing}
      onLogout={handleLogout}
      onItemClick={handleItemClick}
      onSignInClick={handleSignIn}
      onViewProfile={handleViewProfile}
    />
  )
}