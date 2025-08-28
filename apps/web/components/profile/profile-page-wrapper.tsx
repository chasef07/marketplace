'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import ProfileView from './profile-view'
import { apiClient } from '@/lib/api-client-new'
import { createClient } from '@/lib/supabase'

interface ProfilePageWrapperProps {
  username: string
}

export default function ProfilePageWrapper({ username }: ProfilePageWrapperProps) {
  const router = useRouter()
  const [currentUser, setCurrentUser] = useState<{
    id: string
    username: string
    email: string
    seller_personality: string
    buyer_personality: string
    is_active: boolean
    created_at: string
    last_login?: string
  } | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadCurrentUser = async () => {
      try {
        // Use Supabase directly like other working pages
        const supabase = createClient()
        const { data: { session } } = await supabase.auth.getSession()
        
        if (session?.user) {
          // Get profile data
          const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .single()
          
          if (profile) {
            setCurrentUser({
              id: profile.id,
              username: profile.username,
              email: session.user.email || '',
              seller_personality: profile.seller_personality,
              buyer_personality: profile.buyer_personality,
              is_active: profile.is_active,
              created_at: profile.created_at,
              last_login: profile.last_login
            })
          }
        }
      } catch (error) {
        console.error('Error loading user:', error)
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

  const handleNavigateAgentDashboard = () => {
    router.push('/admin/agent')
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
      onNavigateAgentDashboard={handleNavigateAgentDashboard}
    />
  )
}