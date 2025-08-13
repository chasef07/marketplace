'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import ProfileView from './profile-view'
import { apiClient } from '@/src/lib/api-client-new'

interface ProfilePageWrapperProps {
  username: string
}

export default function ProfilePageWrapper({ username }: ProfilePageWrapperProps) {
  const router = useRouter()
  const [currentUser, setCurrentUser] = useState<any>(null)
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
    console.log('🔄 Sell button clicked - navigating to home page')
    router.push('/')
  }

  const handleNavigateMarketplace = () => {
    console.log('🛒 Browse button clicked - navigating to marketplace')
    router.push('/marketplace')
  }

  const handleSignOut = async () => {
    console.log('🚪 Sign Out button clicked - starting sign out process')
    try {
      await apiClient.signOut()
      console.log('✅ Sign out successful - redirecting to home')
      router.push('/')
    } catch (error) {
      console.error('❌ Error signing out:', error)
      // Still redirect even if error occurs
      router.push('/')
    }
  }

  const handleNavigateHome = () => {
    router.push('/')
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
      isOwnProfile={isOwnProfile}
      onNavigateHome={handleNavigateHome}
      onNavigateMarketplace={handleNavigateMarketplace}
      onCreateListing={handleCreateListing}
      onSignOut={handleSignOut}
    />
  )
}