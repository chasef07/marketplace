'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'
import { GlassOverlay } from './GlassOverlay'
import { apiClient } from '@/lib/api-client-new'

interface GlassOverlayContextType {
  showOverlay: () => void
  hideOverlay: () => void
  toggleOverlay: () => void
  addNotification: () => void
  isVisible: boolean
}

const GlassOverlayContext = createContext<GlassOverlayContextType | null>(null)

interface GlassOverlayProviderProps {
  children: React.ReactNode
  autoShow?: boolean
}

export function GlassOverlayProvider({ children, autoShow = false }: GlassOverlayProviderProps) {
  const [isVisible, setIsVisible] = useState(autoShow)
  const [user, setUser] = useState<{id: string, username: string, email: string} | null>(null)

  // Check authentication and user permissions
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const currentUser = await apiClient.getCurrentUser()
        setUser(currentUser)
      } catch (error) {
        console.debug('User not authenticated for glass overlay')
        setUser(null)
      }
    }

    checkAuth()

    // Listen for auth state changes
    const { data: { subscription } } = apiClient.supabase.auth.onAuthStateChange(
      (event, session) => {
        if (event === 'SIGNED_IN') {
          checkAuth()
        } else if (event === 'SIGNED_OUT') {
          setUser(null)
          setIsVisible(false)
        }
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  const contextValue: GlassOverlayContextType = {
    showOverlay: () => setIsVisible(true),
    hideOverlay: () => setIsVisible(false),
    toggleOverlay: () => setIsVisible(!isVisible),
    addNotification: () => {
      // This will be handled by the overlay's internal state
    },
    isVisible
  }

  // Only show overlay for authenticated users
  if (!user) {
    return <>{children}</>
  }

  return (
    <GlassOverlayContext.Provider value={contextValue}>
      {children}
      {/* Render overlay as a portal-like component */}
      <GlassOverlay />
    </GlassOverlayContext.Provider>
  )
}

// Hook to use the glass overlay context
export function useGlassOverlayContext() {
  const context = useContext(GlassOverlayContext)
  if (!context) {
    throw new Error('useGlassOverlayContext must be used within a GlassOverlayProvider')
  }
  return context
}

export default GlassOverlayProvider