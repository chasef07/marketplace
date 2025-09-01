'use client'

import { useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { BrowsePage } from "@/components/browse/browse-page"
import { EnhancedAuth } from "@/components/auth/enhanced-auth"
import { useAuth } from "@/lib/hooks/useAuth"
import { apiClient } from "@/lib/api-client-new"
import { createSellHandler } from "@/lib/utils/navigation"

export default function Browse() {
  const router = useRouter()
  const { user, loading } = useAuth()
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [authMode, setAuthMode] = useState<'signin' | 'register' | 'reset'>('signin')

  // Use unified sell handler for consistent navigation behavior
  const handleCreateListing = createSellHandler(user, router)

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

  const handleSignIn = useCallback(() => {
    setAuthMode('signin')
    setShowAuthModal(true)
  }, [])

  const handleAuthSuccess = useCallback(async () => {
    setShowAuthModal(false)
    // The useAuth hook will automatically update the user state
  }, [])

  const handleViewProfile = (username?: string) => {
    const targetUsername = username || user?.username
    if (targetUsername) {
      router.push(`/profile/${targetUsername}`)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-hero-gradient">
        <div className="animate-pulse text-slate-600">Loading marketplace...</div>
      </div>
    )
  }

  return (
    <>
      <BrowsePage 
        user={user}
        onCreateListing={handleCreateListing}
        onLogout={handleLogout}
        onItemClick={handleItemClick}
        onSignInClick={handleSignIn}
        onViewProfile={handleViewProfile}
      />
      
      <EnhancedAuth
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        onAuthSuccess={handleAuthSuccess}
        initialMode={authMode}
      />
    </>
  )
}