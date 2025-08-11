'use client'

import { useState, useEffect } from 'react'
import dynamic from 'next/dynamic'
import { HeroSection } from './HeroSection'
import { ListingPreview } from './ListingPreview'
import { Marketplace } from '../marketplace/marketplace'
import { EnhancedAuth } from '../auth/enhanced-auth'
import { type AIAnalysisResult, apiClient } from "@/lib/api-client-new"

// Lazy load heavy components
const SellerDashboard = dynamic(() => import('../seller/seller-dashboard').then(mod => ({ default: mod.SellerDashboard })), {
  loading: () => <div className="min-h-screen bg-gray-100 animate-pulse" />
})

const ItemDetail = dynamic(() => import('../marketplace/item-detail').then(mod => ({ default: mod.ItemDetail })), {
  loading: () => <div className="min-h-screen bg-gray-100 animate-pulse" />
})

const SellerChat = dynamic(() => import('../chat/seller-chat').then(mod => ({ default: mod.SellerChat })), {
  loading: () => <div className="h-96 bg-gray-100 animate-pulse rounded-lg" />
})

const ProfileView = dynamic(() => import('../profile/profile-view'), {
  loading: () => <div className="min-h-screen bg-gray-100 animate-pulse" />
})

const ProfileEdit = dynamic(() => import('../profile/profile-edit'), {
  loading: () => <div className="min-h-screen bg-gray-100 animate-pulse" />
})

interface User {
  id: string
  username: string
  email: string
  seller_personality: string
  buyer_personality: string
  is_active: boolean
  created_at: string
  last_login?: string
}

export function HomePage() {
  const [user, setUser] = useState<User | null>(null)
  const [currentView, setCurrentView] = useState<'home' | 'marketplace' | 'auth' | 'dashboard' | 'item-detail' | 'listing-preview' | 'seller-chat' | 'profile-view' | 'profile-edit'>('home')
  const [selectedItemId, setSelectedItemId] = useState<number | null>(null)
  const [selectedUsername, setSelectedUsername] = useState<string | null>(null)
  const [previewData, setPreviewData] = useState<{analysisData: AIAnalysisResult, uploadedImages: string[]} | null>(null)
  const [marketplaceKey, setMarketplaceKey] = useState(0) // Force marketplace re-render
  const [isLoading, setIsLoading] = useState(true) // Add loading state
  const [error, setError] = useState<string | null>(null)
  const [authMode, setAuthMode] = useState<'signin' | 'register' | 'reset'>('signin') // Track auth mode

  // Initialize auth state and listen for changes
  useEffect(() => {
    let mounted = true
    let lastAuthCheck = 0 // Throttle auth checks to prevent infinite loops
    const AUTH_CHECK_THROTTLE = 2000 // Only allow auth checks every 2 seconds

    // Check current session
    const initializeAuth = async () => {
      try {
        const session = await apiClient.getSession()
        if (mounted && session?.user) {
          const userData = await apiClient.getCurrentUser()
          if (mounted && userData) {
            setUser(userData)
          }
        }
      } catch (error) {
        // Don't retry on auth errors during initialization
        if (mounted) {
          setUser(null)
        }
      } finally {
        if (mounted) {
          setIsLoading(false)
        }
      }
    }

    // Use periodic session check instead of reactive auth state listener
    // This prevents infinite loops while still maintaining auth state sync
    const sessionCheckInterval = setInterval(async () => {
      if (!mounted) return
      
      try {
        const session = await apiClient.getSession()
        
        // If there's a session but no user, try to get user data
        if (session?.user && !user) {
          const now = Date.now()
          if (now - lastAuthCheck > AUTH_CHECK_THROTTLE) {
            lastAuthCheck = now
            const userData = await apiClient.getCurrentUser()
            if (mounted && userData) {
              setUser(userData)
            }
          }
        }
        // If there's no session but we have a user, clear it
        else if (!session?.user && user) {
          setUser(null)
          setCurrentView('home')
        }
      } catch (error) {
        // Ignore errors from periodic check to prevent logging noise
      }
    }, 2000) // Check every 2 seconds for responsive auth state updates

    initializeAuth()

    return () => {
      mounted = false
      if (sessionCheckInterval) {
        clearInterval(sessionCheckInterval)
      }
    }
  }, [])

  const createListingAndNavigate = async (analysisData: AIAnalysisResult) => {
    try {

      const listingData = {
        name: analysisData.listing.title,
        description: analysisData.listing.description,
        furniture_type: analysisData.listing.furniture_type,
        starting_price: parseFloat(analysisData.pricing.suggested_starting_price.toString()),
        image_filename: analysisData.image_filename, // Backward compatibility
        images: analysisData.images, // New multiple images support
        // Include AI analysis details
        style: analysisData.analysis.style,
        material: analysisData.analysis.material,
        brand: analysisData.analysis.brand,
        color: analysisData.analysis.color,
        dimensions: analysisData.analysis.estimated_dimensions
      }

      await apiClient.createListing(listingData)
      
      // Small delay to ensure database transaction is committed
      await new Promise(resolve => setTimeout(resolve, 500))
      
      // Force marketplace refresh and navigate
      setMarketplaceKey(prev => prev + 1)
      setCurrentView('marketplace')
      
    } catch (error) {
      console.error('Failed to create listing:', error)
      // Still navigate to marketplace on error
      setCurrentView('marketplace')
    }
  }

  const handleAuthSuccess = async (userData: User) => {
    setUser(userData)
    
    // Check if there's a pending listing from photo upload
    if (typeof window !== 'undefined') {
      const pendingListing = window.localStorage.getItem('pendingListing')
      if (pendingListing) {
        // Parse the pending data and create the listing immediately
        try {
          const parsedData = JSON.parse(pendingListing)
          
          // Clear the pending data
          window.localStorage.removeItem('pendingListing')
          
          // Set view to marketplace immediately to prevent home page flash
          setCurrentView('marketplace')
          
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
    
    // If no pending listing, go to marketplace to see all listings
    setCurrentView('marketplace')
  }

  const handleSignOut = async () => {
    try {
      await apiClient.signOut()
      
      // Clear local state immediately (periodic check will also handle this)
      setUser(null)
      setCurrentView('home')
      
      // Clear any cached data
      setMarketplaceKey(prev => prev + 1)
      setSelectedItemId(null)
      setSelectedUsername(null)
      setPreviewData(null)
      setError(null)
    } catch (error) {
      // Always clear user state even if sign out fails
      setUser(null)
      setCurrentView('home')
    }
  }

  const handleGetStarted = () => {
    if (user) {
      setCurrentView('marketplace')
    } else {
      setAuthMode('signin')
      setCurrentView('auth')
    }
  }

  const handleCreateListing = () => {
    // Always go to home page for listing creation
    // User will be prompted to sign in when they submit the listing
    setCurrentView('home')
  }

  const handleItemClick = (itemId: number) => {
    setSelectedItemId(itemId)
    setCurrentView('item-detail')
  }

  const handleMakeOffer = async (itemId: number, price: number, message?: string) => {
    try {
      await apiClient.createOffer(itemId, price, message || '')
      
      // Force marketplace refresh to update item data
      setMarketplaceKey(prev => prev + 1)
      
      return { success: true }
    } catch (error) {
      console.error('Failed to create offer:', error)
      throw error
    }
  }

  const handleBackToHome = () => {
    setCurrentView('home')
    setPreviewData(null)
    // Force marketplace refresh for when user navigates to marketplace later
    setMarketplaceKey(prev => prev + 1)
  }

  const handleBackToMarketplace = () => {
    setCurrentView('marketplace')
    // Force marketplace refresh to show updated item list
    setMarketplaceKey(prev => prev + 1)
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
      setError('Unable to load profile - no valid username')
      return
    }
    setCurrentView('profile-view')
  }

  // Note: Profile navigation handlers available but not used in current flow
  // const handleEditProfile = () => {
  //   setCurrentView('profile-edit')
  // }

  // const handleBackFromProfile = () => {
  //   setCurrentView('home')
  //   setSelectedUsername(null)
  // }

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

  // Show loading spinner while initializing auth
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-600 mx-auto mb-4"></div>
          <p className="text-amber-700 font-medium">Loading...</p>
        </div>
      </div>
    )
  }

  if (currentView === 'marketplace') {
    return (
      <Marketplace
        key={marketplaceKey} // Force re-render when key changes
        user={user}
        onCreateListing={handleCreateListing}
        onLogout={handleSignOut}
        onItemClick={handleItemClick}
        onSignInClick={() => { setAuthMode('signin'); setCurrentView('auth'); }}
        onSellerDashboard={() => setCurrentView('dashboard')}
        onSellerChat={() => setCurrentView('seller-chat')}
        onViewProfile={handleViewProfile}
      />
    )
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


  if (currentView === 'dashboard' && user) {
    return (
      <SellerDashboard
        user={user}
        onItemClick={handleItemClick}
        onBackToMarketplace={handleBackToMarketplace}
      />
    )
  }

  if (currentView === 'seller-chat' && user) {
    return (
      <SellerChat
        user={user}
        onBack={handleBackToMarketplace}
      />
    )
  }

  if (currentView === 'item-detail' && selectedItemId) {
    return (
      <ItemDetail
        itemId={selectedItemId}
        user={user}
        onBack={handleBackToMarketplace}
        onMakeOffer={handleMakeOffer}
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
        isOwnProfile={user?.username === selectedUsername}
        onNavigateHome={() => setCurrentView('home')}
        onNavigateMarketplace={() => setCurrentView('marketplace')}
      />
    )
  }

  if (currentView === 'profile-edit' && user) {
    return (
      <ProfileEdit />
    )
  }

  return (
    <div className="homepage-container">
      <HeroSection
        user={user}
        onGetStarted={handleGetStarted}
        onSignIn={() => { setAuthMode('signin'); setCurrentView('auth'); }}
        onSignOut={handleSignOut}
        onCreateListing={handleCreateListing}
        onBrowseItems={() => setCurrentView('marketplace')}
        onSellerDashboard={() => setCurrentView('dashboard')}
        onViewProfile={handleViewProfile}
        onShowListingPreview={handleShowListingPreview}
      />
    </div>
  )
}