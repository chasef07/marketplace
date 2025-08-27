'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import ProfileView from './profile-view'
import { apiClient } from '@/lib/api-client-new'

interface ProfilePageWrapperProps {
  username: string
}

export default function ProfilePageWrapper({ username }: ProfilePageWrapperProps) {
  const router = useRouter()
  const [currentUser, setCurrentUser] = useState<{id: string, username: string} | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadCurrentUser = async () => {
      try {
        const user = await apiClient.getCurrentUser()
        setCurrentUser(user)
      } catch (error) {
        console.error('Error loading user:', error)
        setCurrentUser(null)
      } finally {
        setLoading(false)
      }
    }

    loadCurrentUser()
  }, [])

  const handleCreateListing = () => {
    router.push('/')
  }

  const handleNavigateMarketplace = () => {
    router.push('/browse')
  }

  const handleSignOut = async () => {
    try {
      await apiClient.signOut()
      router.push('/')
    } catch (error) {
      console.error('Error signing out:', error)
      router.push('/')
    }
  }

  const handleNavigateHome = () => {
    router.push('/')
  }

  const handleSignIn = () => {
    router.push('/')
  }

  const handleViewProfile = () => {
    // Already on profile page, no action needed
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse">Loading...</div>
      </div>
    )
  }

  const isOwnProfile = currentUser && currentUser.username === username

  return (
    <ProfileView
      username={username}
      isOwnProfile={isOwnProfile || false}
      currentUser={currentUser}
      onNavigateHome={handleNavigateHome}
      onNavigateMarketplace={handleNavigateMarketplace}
      onCreateListing={handleCreateListing}
      onSignOut={handleSignOut}
      onSignIn={handleSignIn}
      onViewProfile={handleViewProfile}
    />
  )
}