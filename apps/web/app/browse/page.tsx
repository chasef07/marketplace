'use client'

import { useState } from "react"
import { useRouter } from "next/navigation"
import { BrowsePage } from "@/components/browse/browse-page"
import { useAuth } from "@/lib/hooks/useAuth"
import { apiClient } from "@/lib/api-client-new"
import ProfileView from "@/components/profile/profile-view"

export default function Browse() {
  const router = useRouter()
  const { user, loading } = useAuth()
  const [currentView, setCurrentView] = useState<'browse' | 'profile-view'>('browse')
  const [selectedUsername, setSelectedUsername] = useState<string | null>(null)

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
      <div className="min-h-screen flex items-center justify-center bg-hero-gradient">
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