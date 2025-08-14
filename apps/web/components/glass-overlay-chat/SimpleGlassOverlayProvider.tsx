'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'
import { SimpleGlassOverlay } from './SimpleGlassOverlay'
import { apiClient } from '@/lib/api-client-new'

interface SimpleGlassOverlayContextType {
  addNotification: () => void
}

const SimpleGlassOverlayContext = createContext<SimpleGlassOverlayContextType | null>(null)

interface SimpleGlassOverlayProviderProps {
  children: React.ReactNode
}

export function SimpleGlassOverlayProvider({ children }: SimpleGlassOverlayProviderProps) {
  const [user, setUser] = useState<{id: string, username: string, email: string} | null>(null)

  // Check authentication and user permissions
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const currentUser = await apiClient.getCurrentUser()
        console.log('Glass overlay - user authenticated:', !!currentUser)
        setUser(currentUser)
      } catch (error) {
        console.log('Glass overlay - user not authenticated:', error)
        setUser(null)
      }
    }

    checkAuth()

    // Listen for auth state changes
    const { data: { subscription } } = apiClient.supabase.auth.onAuthStateChange(
      (event) => {
        if (event === 'SIGNED_IN') {
          checkAuth()
        } else if (event === 'SIGNED_OUT') {
          setUser(null)
        }
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  const contextValue: SimpleGlassOverlayContextType = {
    addNotification: () => {
      // This will be handled by the overlay component internally
    }
  }

  // Only show overlay for authenticated users
  if (!user) {
    return <>{children}</>
  }

  return (
    <SimpleGlassOverlayContext.Provider value={contextValue}>
      {children}
      <SimpleGlassOverlay />
    </SimpleGlassOverlayContext.Provider>
  )
}

// Hook to use the simple glass overlay context
export function useSimpleGlassOverlayContext() {
  const context = useContext(SimpleGlassOverlayContext)
  if (!context) {
    throw new Error('useSimpleGlassOverlayContext must be used within a SimpleGlassOverlayProvider')
  }
  return context
}

export default SimpleGlassOverlayProvider