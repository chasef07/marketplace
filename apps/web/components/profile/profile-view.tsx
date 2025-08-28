'use client'

import { useState, useEffect } from 'react'
import { Skeleton } from '@/components/ui/skeleton'
import { MainNavigation } from '../navigation/MainNavigation'
import ProfileHeader, { ProfileData as BaseProfileData } from './ProfileHeader'
import ProfileTabs from './ProfileTabs'
import OfferConfirmationPopup from '../buyer/OfferConfirmationPopup'

// Extended ProfileData with active_items for the full profile view
interface ProfileData extends BaseProfileData {
  active_items: Array<{
    id: number
    name: string
    description?: string
    furniture_type: string
    starting_price: number
    condition?: string
    image_filename?: string
    images?: Array<{ filename: string; order: number; is_primary: boolean }>
    views_count: number
    created_at: string
    highest_buyer_offer?: number
  }>
}

interface ProfileViewProps {
  username: string
  isOwnProfile?: boolean
  currentUser?: { 
    id: string
    username: string
    email: string
    seller_personality: string
    buyer_personality: string
    is_active: boolean
    created_at: string
    last_login?: string 
  } | null
  onNavigateHome?: () => void
  onNavigateMarketplace?: () => void
  onCreateListing?: () => void
  onSignOut?: () => void
  onSignIn?: () => void
  onViewProfile?: () => void
  onNavigateAgentDashboard?: () => void
}

export default function ProfileView({ 
  username, 
  isOwnProfile = false, 
  currentUser, 
  onNavigateHome,
  onNavigateMarketplace, 
  onCreateListing, 
  onSignOut, 
  onSignIn, 
  onViewProfile, 
  onNavigateAgentDashboard 
}: ProfileViewProps) {
  const [profile, setProfile] = useState<ProfileData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showOfferConfirmation, setShowOfferConfirmation] = useState(false)
  const [lastOfferDetails, setLastOfferDetails] = useState<any>(null)
  const [initialOfferItemId, setInitialOfferItemId] = useState<number | null>(null)

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const response = await fetch(`/api/profiles/${username}`)
        
        if (!response.ok) {
          throw new Error(response.status === 404 ? 'Profile not found' : 'Failed to load profile')
        }

        const profileData = await response.json()
        setProfile(profileData)
      } catch (err) {
        console.error('Error fetching profile:', err)
        setError(err instanceof Error ? err.message : 'Something went wrong')
      } finally {
        setLoading(false)
      }
    }

    fetchProfile()
  }, [username])

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

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50">
        <MainNavigation
          user={currentUser || null}
          onNavigateHome={onNavigateHome}
          onBrowseItems={onNavigateMarketplace}
          onCreateListing={onCreateListing}
          onViewProfile={onViewProfile}
          onSignIn={onSignIn}
          onSignOut={onSignOut}
          currentPage="profile"
        />
        
        <div className="pt-24 pb-8">
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
      <div className="min-h-screen bg-slate-50">
        <MainNavigation
          user={currentUser || null}
          onNavigateHome={onNavigateHome}
          onBrowseItems={onNavigateMarketplace}
          onCreateListing={onCreateListing}
          onViewProfile={onViewProfile}
          onSignIn={onSignIn}
          onSignOut={onSignOut}
          currentPage="profile"
        />
        
        <div className="pt-24 pb-8">
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
    <div className="min-h-screen bg-slate-50">
      {/* Navigation Header */}
      <MainNavigation
        user={currentUser || null}
        onNavigateHome={onNavigateHome}
        onBrowseItems={onNavigateMarketplace}
        onCreateListing={onCreateListing}
        onViewProfile={onViewProfile}
        onSignIn={onSignIn}
        onSignOut={onSignOut}
        currentPage="profile"
      />

      <div className="pt-24 pb-8">
        <div className="max-w-4xl mx-auto p-6 space-y-6">
          {/* Profile Header */}
          <ProfileHeader 
            profile={profile} 
            isOwnProfile={isOwnProfile}
            onNavigateAgentDashboard={onNavigateAgentDashboard}
          />

          {/* Profile Tabs */}
          <ProfileTabs
            profile={profile}
            isOwnProfile={isOwnProfile}
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