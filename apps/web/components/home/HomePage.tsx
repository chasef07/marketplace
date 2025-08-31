'use client'

import React, { useState, useCallback, useEffect } from 'react'
import dynamic from 'next/dynamic'
import { useRouter } from 'next/navigation'
import { HeroSection } from './HeroSection'
import { ListingPreview } from './ListingPreview'
import { EnhancedAuth } from '../auth/enhanced-auth'
import { ThemedLoading } from '../ui/themed-loading'
import { useAuth } from '@/lib/hooks/useAuth'
import { type AIAnalysisResult, apiClient } from "@/lib/api-client-new"
import { User } from "@/lib/types/user"

// Lazy load heavy components

const ItemDetail = dynamic(() => import('../marketplace/item-detail').then(mod => ({ default: mod.ItemDetail })), {
  loading: () => <div className="min-h-screen bg-gray-100 animate-pulse" />
})



const ProfileView = dynamic(() => import('../profile/profile-view'), {
  loading: () => <div className="min-h-screen bg-gray-100 animate-pulse" />
})




export const HomePage = React.memo(function HomePage() {
  const router = useRouter()
  const { user, loading: isLoading } = useAuth({
    onSignOut: () => setCurrentView('home')
  })
  const [currentView, setCurrentView] = useState<'home' | 'auth' | 'item-detail' | 'listing-preview' | 'profile-view'>('home')
  const [selectedItemId, setSelectedItemId] = useState<number | null>(null)
  const [selectedUsername, setSelectedUsername] = useState<string | null>(null)
  const [previewData, setPreviewData] = useState<{analysisData: AIAnalysisResult, uploadedImages: string[]} | null>(null)
  const [authMode, setAuthMode] = useState<'signin' | 'register' | 'reset'>('signin') // Track auth mode

  // Listen for navigation events from QuickActions overlay
  useEffect(() => {
    const handleNavigateToMarketplace = () => router.push('/browse')
    const handleNavigateToCreateListing = () => {
      if (user) {
        setCurrentView('home') // Home page has the create listing form
      } else {
        setAuthMode('signin')
        setCurrentView('auth')
      }
    }

    window.addEventListener('navigate-to-marketplace', handleNavigateToMarketplace)
    window.addEventListener('navigate-to-create-listing', handleNavigateToCreateListing)

    return () => {
      window.removeEventListener('navigate-to-marketplace', handleNavigateToMarketplace)
      window.removeEventListener('navigate-to-create-listing', handleNavigateToCreateListing)
    }
  }, [user, router])


  const createListingAndNavigate = useCallback(async (analysisData: AIAnalysisResult, agentEnabled = false) => {
    try {
      const listingData = {
        name: analysisData.listing.title,
        description: analysisData.listing.description,
        furniture_type: analysisData.listing.furniture_type,
        starting_price: parseFloat(analysisData.pricing.suggested_starting_price.toString()),
        condition: 'good', // Default condition
        image_filename: analysisData.image_filename, // Backward compatibility
        images: analysisData.images, // New multiple images support
        agent_enabled: agentEnabled, // Add agent enablement
        // AI analysis details (removed due to type incompatibility)
        // TODO: Update AIAnalysisResult interface if these properties are needed
        dimensions: analysisData.analysis.estimated_dimensions
      }

      await apiClient.createListing(listingData)
      
      // Small delay to ensure database transaction is committed
      await new Promise(resolve => setTimeout(resolve, 500))
      
      // Force marketplace refresh and navigate
      router.push('/browse')
      
    } catch (error) {
      console.error('Failed to create listing:', error)
      // Still navigate to browse on error
      router.push('/browse')
    }
  }, [router])

  const handleAuthSuccess = async (_userData: User) => {
    // Check if there's a pending listing from photo upload
    if (typeof window !== 'undefined') {
      const pendingListing = window.localStorage.getItem('pendingListing')
      if (pendingListing) {
        // Parse the pending data and create the listing immediately
        try {
          const parsedData = JSON.parse(pendingListing)
          
          // Clear the pending data
          window.localStorage.removeItem('pendingListing')
          
          // Navigate to browse immediately to prevent home page flash
          router.push('/browse')
          
          // Wait a bit longer to ensure auth session is fully established
          await new Promise(resolve => setTimeout(resolve, 1000))
          
          // Create the listing in the background with the new user
          await createListingAndNavigate(parsedData.analysisData)
          return
        } catch (error) {
          console.error('Failed to parse pending listing:', error)
          window.localStorage.removeItem('pendingListing')
        }
      }
    }
    
    // If no pending listing, go to browse to see all listings
    router.push('/browse')
  }

  const handleSignOut = useCallback(async () => {
    try {
      await apiClient.signOut()
      
      // Clear local state (auth hook handles user state via onSignOut callback)
      setCurrentView('home')
      
      // Clear any cached data
      setSelectedItemId(null)
      setSelectedUsername(null)
      setPreviewData(null)
    } catch (error) {
      // Always clear view state even if sign out fails
      setCurrentView('home')
    }
  }, [])




  const handleBackToHome = () => {
    setCurrentView('home')
    setPreviewData(null)
  }

  const handleBackToMarketplace = () => {
    router.push('/browse')
  }

  const handleShowListingPreview = (analysisData: AIAnalysisResult, uploadedImages: string[]) => {
    setPreviewData({ analysisData, uploadedImages })
    setCurrentView('listing-preview')
  }

  const handleViewProfile = (username?: string) => {
    if (username && typeof username === 'string') {
      setSelectedUsername(username)
    } else if (user && user.username && typeof user.username === 'string') {
      setSelectedUsername(user.username)
    } else {
      console.warn('Unable to load profile - no valid username')
      return
    }
    setCurrentView('profile-view')
  }



  const handleListingPreviewSignUp = (editedData: AIAnalysisResult) => {
    // Store the edited data and image URLs for after authentication
    if (typeof window !== 'undefined') {
      const pendingData = {
        analysisData: editedData,
        imageUrls: previewData?.uploadedImages || []
      }
      window.localStorage.setItem('pendingListing', JSON.stringify(pendingData))
    }
    setAuthMode('register') // Set to register mode for account creation
    setCurrentView('auth')
  }

  // Show themed loading screen while initializing auth
  if (isLoading) {
    return <ThemedLoading message="Preparing your marketplace experience..." />
  }


  if (currentView === 'auth') {
    return (
      <EnhancedAuth
        isOpen={true}
        onClose={handleBackToHome}
        onAuthSuccess={handleAuthSuccess}
        initialMode={authMode}
      />
    )
  }




  if (currentView === 'item-detail' && selectedItemId) {
    return (
      <ItemDetail
        itemId={selectedItemId}
        user={user}
        onBack={handleBackToMarketplace}
        onSignInClick={() => { setAuthMode('signin'); setCurrentView('auth'); }}
        onViewProfile={handleViewProfile}
      />
    )
  }

  if (currentView === 'listing-preview' && previewData) {
    return (
      <ListingPreview
        analysisData={previewData.analysisData}
        uploadedImages={previewData.uploadedImages}
        user={user}
        onBack={handleBackToHome}
        onSignUp={handleListingPreviewSignUp}
        onCreateListing={createListingAndNavigate}
      />
    )
  }


  if (currentView === 'profile-view' && selectedUsername) {
    return (
      <ProfileView
        username={selectedUsername}
      />
    )
  }



  return (
    <div className="homepage-container">
      <HeroSection
        user={user}
        onSignIn={() => { setAuthMode('signin'); setCurrentView('auth'); }}
        onSignOut={handleSignOut}
        onBrowseItems={() => router.push('/browse')}
        onViewProfile={handleViewProfile}
        onShowListingPreview={handleShowListingPreview}
      />
    </div>
  )
})