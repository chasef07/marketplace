'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Skeleton } from '@/components/ui/skeleton'
import { MainNavigation } from '../navigation/MainNavigation'
import ProfileHeader from './ProfileHeader'
import ProfileTabs from './ProfileTabs'
import OfferConfirmationPopup from '../buyer/OfferConfirmationPopup'
import { AgentStatusCard } from '../ai-agent/AgentStatusCard'
import { useProfile, useCurrentUser } from '@/lib/hooks/useProfile'
import { ProfileData } from '@/lib/types/profile'
import { apiClient } from '@/lib/api-client-new'
import { createSellHandler } from '@/lib/utils/navigation'

interface ProfileViewProps {
  username: string
}

export default function ProfileView({ username }: ProfileViewProps) {
  const router = useRouter()
  const { profile, loading: profileLoading, error } = useProfile(username)
  const { user: currentUser, loading: userLoading } = useCurrentUser()
  
  const [showOfferConfirmation, setShowOfferConfirmation] = useState(false)
  const [lastOfferDetails, setLastOfferDetails] = useState<any>(null)
  const [initialOfferItemId, setInitialOfferItemId] = useState<number | null>(null)

  const isOwnProfile = currentUser && currentUser.username === username
  const loading = profileLoading || userLoading

  // Check for URL parameter to open offer form
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search)
      const makeOfferParam = urlParams.get('makeOffer')
      if (makeOfferParam) {
        const itemId = parseInt(makeOfferParam)
        if (!isNaN(itemId)) {
          setInitialOfferItemId(itemId)
          const newUrl = window.location.pathname
          window.history.replaceState({}, '', newUrl)
        }
      }
    }
  }, [])

  const handleOfferConfirmed = () => {
    setShowOfferConfirmation(true)
  }

  const handleBrowseItems = () => {
    router.push('/browse')
  }

  // Use unified sell handler for consistent navigation behavior
  const handleCreateListing = createSellHandler(currentUser, router)

  const handleSignOut = async () => {
    try {
      await apiClient.signOut()
      router.push('/')
    } catch (error) {
      console.error('Error signing out:', error)
      router.push('/')
    }
  }

  const handleSignIn = () => {
    router.push('/')
  }

  const handleViewProfile = () => {
    // Already on profile page, no action needed
  }

  if (loading) {
    return (
      <div className="min-h-screen pt-20 bg-aurora-dreams bg-aurora-animated">
        <MainNavigation
          user={currentUser || null}
          onBrowseItems={handleBrowseItems}
          onCreateListing={handleCreateListing}
          onViewProfile={handleViewProfile}
          onSignIn={handleSignIn}
          onSignOut={handleSignOut}
        />
        
        <div className="pt-4 pb-8">
          <div className="max-w-4xl mx-auto p-6 space-y-6">
            {/* Profile Header Skeleton */}
            <div className="bg-white rounded-xl shadow-md border border-slate-200/60 p-6">
              <div className="flex items-center space-x-6">
                <Skeleton className="h-20 w-20 rounded-full" />
                <div className="space-y-3 flex-1">
                  <Skeleton className="h-6 w-48" />
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-4 w-64" />
                </div>
              </div>
            </div>
            
            {/* Tabs Skeleton */}
            <div className="bg-white rounded-xl shadow-md border border-slate-200/60 p-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[1, 2, 3].map(i => (
                  <Skeleton key={i} className="h-48 rounded-lg" />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen pt-20 bg-aurora-dreams bg-aurora-animated">
        <MainNavigation
          user={currentUser || null}
          onBrowseItems={handleBrowseItems}
          onCreateListing={handleCreateListing}
          onViewProfile={handleViewProfile}
          onSignIn={handleSignIn}
          onSignOut={handleSignOut}
        />
        
        <div className="pt-4 pb-8">
          <div className="max-w-4xl mx-auto p-6">
            <div className="bg-white rounded-xl shadow-md border border-slate-200/60 p-8 text-center">
              <h3 className="text-lg font-medium text-slate-900 mb-2">Profile not found</h3>
              <p className="text-slate-500">{error}</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!profile) return null

  return (
    <div className="min-h-screen pt-20 bg-aurora-dreams bg-aurora-animated">
      {/* Navigation Header */}
      <MainNavigation
        user={currentUser || null}
        onBrowseItems={handleBrowseItems}
        onCreateListing={handleCreateListing}
        onViewProfile={handleViewProfile}
        onSignIn={handleSignIn}
        onSignOut={handleSignOut}
      />

      <div className="pt-4 pb-8">
        <div className="max-w-4xl mx-auto p-6 space-y-6">
          {/* Profile Header */}
          <ProfileHeader 
            profile={profile} 
            isOwnProfile={isOwnProfile || false}
          />

          {/* AI Agent Status Card - Only show on own profile */}
          {isOwnProfile && (
            <AgentStatusCard userId={profile.id} />
          )}

          {/* Profile Tabs */}
          <ProfileTabs
            profile={profile}
            isOwnProfile={isOwnProfile || false}
            userId={profile.id}
            onOfferConfirmed={handleOfferConfirmed}
            initialOfferItemId={initialOfferItemId || undefined}
          />
        </div>
      </div>

      {/* Offer Confirmation Popup */}
      <OfferConfirmationPopup
        isVisible={showOfferConfirmation}
        onClose={() => setShowOfferConfirmation(false)}
        offerDetails={lastOfferDetails}
      />
    </div>
  )
}