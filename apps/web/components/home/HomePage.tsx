'use client'

import React, { useState, useCallback, useEffect, useRef } from 'react'
import dynamic from 'next/dynamic'
import { useRouter } from 'next/navigation'
import { HeroSection } from './HeroSection'
import { ListingPreview } from './ListingPreview'
import { EnhancedAuth } from '../auth/enhanced-auth'
import { ThemedLoading } from '../ui/themed-loading'
import { useAuth } from '@/lib/hooks/useAuth'
import { type AIAnalysisResult, apiClient } from "@/lib/api-client-new"
import { handlePendingAction, clearPendingActions } from '@/lib/utils/navigation'

// Lazy load heavy components

const ItemDetail = dynamic(() => import('../marketplace/item-detail').then(mod => ({ default: mod.ItemDetail })), {
  loading: () => <div className="min-h-screen bg-gray-100 animate-pulse" />
})




export const HomePage = React.memo(function HomePage() {
  const router = useRouter()
  const [currentView, setCurrentView] = useState<'home' | 'auth' | 'item-detail' | 'listing-preview'>('home')


  // Enhanced state change tracking
  const setCurrentViewWithLogging = useCallback((newView: 'home' | 'auth' | 'item-detail' | 'listing-preview') => {
    // Prevent view changes during critical flows
    if (preventViewChangeRef.current && newView !== 'listing-preview' && currentView === 'listing-preview') {
      return
    }
    
    setCurrentView(newView)
  }, [currentView])

  // Create stable onSignOut callback
  const handleAuthSignOut = useCallback(() => {
    // Only change view if we're not already on the auth modal
    if (currentView !== 'auth') {
      setCurrentViewWithLogging('home')
    }
  }, [currentView, setCurrentViewWithLogging])
  
  // Create a stable reference to prevent auth hook re-initialization
  const authCallbacks = useRef({ onSignOut: handleAuthSignOut })
  authCallbacks.current.onSignOut = handleAuthSignOut
  
  const { user, loading: isLoading } = useAuth({
    onSignOut: authCallbacks.current.onSignOut
  })

  const [selectedItemId, setSelectedItemId] = useState<number | null>(null)
  const [previewData, setPreviewData] = useState<{analysisData: AIAnalysisResult, uploadedImages: string[]} | null>(null)
  const [authMode, setAuthMode] = useState<'signin' | 'register' | 'reset'>('signin') // Track auth mode
  
  // Prevent view changes while in certain critical flows
  const preventViewChangeRef = useRef(false)
  
  // Auth state timeout management
  const authStateTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Enhanced auth modal stability management
  const openAuthModal = useCallback((mode: 'signin' | 'register' | 'reset' = 'signin') => {
    setAuthMode(mode)
    setCurrentViewWithLogging('auth')
  }, [currentView, setCurrentViewWithLogging])

  const closeAuthModal = useCallback(() => {
    setCurrentViewWithLogging('home')
  }, [currentView, setCurrentViewWithLogging])

  // Listen for navigation events from QuickActions overlay
  useEffect(() => {
    const handleNavigateToMarketplace = () => router.push('/browse')
    const handleNavigateToCreateListing = () => {
      if (user) {
        setCurrentViewWithLogging('home') // Home page has the create listing form
      } else {
        openAuthModal('signin')
      }
    }

    window.addEventListener('navigate-to-marketplace', handleNavigateToMarketplace)
    window.addEventListener('navigate-to-create-listing', handleNavigateToCreateListing)

    return () => {
      window.removeEventListener('navigate-to-marketplace', handleNavigateToMarketplace)
      window.removeEventListener('navigate-to-create-listing', handleNavigateToCreateListing)
    }
  }, [user, router, openAuthModal])

  // Cleanup timeout on unmount to prevent memory leaks
  useEffect(() => {
    return () => {
      if (authStateTimeoutRef.current) {
        clearTimeout(authStateTimeoutRef.current)
      }
    }
  }, [])

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

  const handleAuthSuccess = useCallback(async () => {
    // Check if there's a pending listing from photo upload
    if (typeof window !== 'undefined') {
      const pendingListing = window.localStorage.getItem('pendingListing')
      
      if (pendingListing) {
        // Parse the pending data and return to listing preview for AI agent setup
        try {
          const parsedData = JSON.parse(pendingListing)
          
          // Clear the pending data
          window.localStorage.removeItem('pendingListing')
          clearPendingActions()
          
          // Wait a bit to ensure auth session is fully established
          await new Promise(resolve => setTimeout(resolve, 500))
          
          // Return to listing preview with the analysis data and images
          // This will allow the AI agent setup flow to trigger for new users
          setPreviewData({
            analysisData: parsedData.analysisData,
            uploadedImages: parsedData.imageUrls
          })
          setCurrentView('listing-preview')
          return
        } catch (error) {
          console.error('Failed to parse pending listing:', error)
          window.localStorage.removeItem('pendingListing')
          clearPendingActions()
        }
      }
      
      // Handle other pending actions using the utility function
      const pendingAction = window.localStorage.getItem('pendingAction')
      const pendingTimestamp = window.localStorage.getItem('pendingActionTimestamp')
      const actionResult = handlePendingAction(pendingAction, pendingTimestamp)
      
      if (actionResult.isValid) {
        clearPendingActions()
        
        if (actionResult.shouldStayOnHome) {
          // Stay on home page for creating a new listing
          setCurrentViewWithLogging('home')
          return
        }
      }
    }
    
    // Close auth modal and navigate to browse
    setCurrentViewWithLogging('home')
    router.push('/browse')
  }, [router, createListingAndNavigate, setCurrentViewWithLogging])

  const handleSignOut = useCallback(async () => {
    try {
      await apiClient.signOut()
      
      // Clear local state (auth hook handles user state via onSignOut callback)
      setCurrentViewWithLogging('home')
      
      // Clear any cached data
      setSelectedItemId(null)
      setPreviewData(null)
    } catch {
      // Always clear view state even if sign out fails
      setCurrentViewWithLogging('home')
    }
  }, [])




  const handleBackToHome = () => {
    // Disable protection to allow intentional navigation
    preventViewChangeRef.current = false
    setCurrentViewWithLogging('home')
    setPreviewData(null)
  }

  const handleBackToMarketplace = () => {
    router.push('/browse')
  }

  const handleShowListingPreview = useCallback((analysisData: AIAnalysisResult, uploadedImages: string[]) => {
    // Enable critical flow protection to prevent accidental view changes
    preventViewChangeRef.current = true
    
    setPreviewData({ analysisData, uploadedImages })
    setCurrentViewWithLogging('listing-preview')
    
    // Remove protection after a short delay to allow user navigation
    setTimeout(() => {
      preventViewChangeRef.current = false
    }, 1000)
  }, [currentView, setCurrentViewWithLogging])

  const handleViewProfile = (username?: string) => {
    const targetUsername = username || user?.username
    if (targetUsername) {
      router.push(`/profile/${targetUsername}`)
    } else {
      console.warn('Unable to navigate to profile - no valid username')
    }
  }



  const handleListingPreviewSignUp = useCallback((editedData: AIAnalysisResult) => {
    // Store the edited data and image URLs for after authentication
    if (typeof window !== 'undefined') {
      const pendingData = {
        analysisData: editedData,
        imageUrls: previewData?.uploadedImages || []
      }
      window.localStorage.setItem('pendingListing', JSON.stringify(pendingData))
    }
    openAuthModal('register') // Set to register mode for account creation
  }, [previewData?.uploadedImages, openAuthModal])

  // Show themed loading screen while initializing auth
  if (isLoading) {
    return <ThemedLoading message="Preparing your marketplace experience..." />
  }


  if (currentView === 'auth') {
    return (
      <EnhancedAuth
        isOpen={true}
        onClose={closeAuthModal}
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
        onSignInClick={() => openAuthModal('signin')}
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





  return (
    <div className="homepage-container">
      <HeroSection
        user={user}
        onSignIn={() => openAuthModal('signin')}
        onSignOut={handleSignOut}
        onBrowseItems={() => router.push('/browse')}
        onViewProfile={handleViewProfile}
        onShowListingPreview={handleShowListingPreview}
      />
    </div>
  )
})