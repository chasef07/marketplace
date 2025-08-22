'use client'

import React, { useState, useEffect, useCallback } from 'react'
import dynamic from 'next/dynamic'
import { HeroSection } from './HeroSection'
import { ListingPreview } from './ListingPreview'
import { Marketplace } from '../marketplace/marketplace'
import { EnhancedAuth } from '../auth/enhanced-auth'
import { ThemedLoading } from '../ui/themed-loading'
import { type AIAnalysisResult, apiClient } from "@/lib/api-client-new"

// Lazy load heavy components

const ItemDetail = dynamic(() => import('../marketplace/item-detail').then(mod => ({ default: mod.ItemDetail })), {
  loading: () => <div className="min-h-screen bg-gray-100 animate-pulse" />
})



const ProfileView = dynamic(() => import('../profile/profile-view'), {
  loading: () => <div className="min-h-screen bg-gray-100 animate-pulse" />
})

const SellerAgentDashboard = dynamic(() => import('../seller/SellerAgentDashboard').then(mod => ({ default: mod.SellerAgentDashboard })), {
  loading: () => <div className="min-h-screen bg-gray-100 animate-pulse" />
})

const AgentSettings = dynamic(() => import('../seller/AgentSettings').then(mod => ({ default: mod.AgentSettings })), {
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

export const HomePage = React.memo(function HomePage() {
  const [user, setUser] = useState<User | null>(null)
  const [currentView, setCurrentView] = useState<'home' | 'marketplace' | 'auth' | 'item-detail' | 'listing-preview' | 'profile-view' | 'profile-edit' | 'seller-agent-dashboard' | 'agent-settings'>('home')
  const [selectedItemId, setSelectedItemId] = useState<number | null>(null)
  const [selectedUsername, setSelectedUsername] = useState<string | null>(null)
  const [previewData, setPreviewData] = useState<{analysisData: AIAnalysisResult, uploadedImages: string[]} | null>(null)
  const [marketplaceKey, setMarketplaceKey] = useState(0) // Force marketplace re-render
  const [isLoading, setIsLoading] = useState(true) // Add loading state
  const [error, setError] = useState<string | null>(null)
  const [authMode, setAuthMode] = useState<'signin' | 'register' | 'reset'>('signin') // Track auth mode

  // Listen for navigation events from QuickActions overlay
  useEffect(() => {
    const handleNavigateToMarketplace = () => setCurrentView('marketplace')
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
  }, [user])

  // Initialize auth state with proper Supabase listener
  useEffect(() => {
    let mounted = true
    let authStateTimeout: NodeJS.Timeout | null = null

    // Debounced auth state handler to prevent race conditions
    const debouncedAuthStateChange = (session: unknown) => {
      if (authStateTimeout) {
        clearTimeout(authStateTimeout)
      }
      
      authStateTimeout = setTimeout(async () => {
        if (!mounted) return
        
        if ((session as { user?: unknown })?.user) {
          // User signed in - get their profile data
          try {
            const userData = await apiClient.getCurrentUser()
            if (mounted && userData) {
              setUser(userData)
            }
          } catch (error) {
            // Profile might not exist yet for new users, or auth error
            console.warn('Auth state change error:', error)
            if (mounted) setUser(null)
          }
        } else {
          // User signed out
          if (mounted) {
            setUser(null)
            setCurrentView('home')
          }
        }
      }, 200) // 200ms debounce
    }

    // Initialize auth state immediately (non-blocking)
    const initializeAuth = async () => {
      try {
        const session = await apiClient.getSession()
        if (mounted) {
          if (session?.user) {
            // Try to get user data, but don't block the UI
            apiClient.getCurrentUser().then(userData => {
              if (mounted && userData) {
                setUser(userData)
              }
            }).catch((error) => {
              // Auth errors during init, clear state
              console.warn('Init auth error:', error)
              if (mounted) setUser(null)
            })
          } else {
            setUser(null)
          }
          setIsLoading(false) // Always stop loading after initial check
        }
      } catch (error) {
        console.warn('Initialize auth error:', error)
        if (mounted) {
          setUser(null)
          setIsLoading(false)
        }
      }
    }

    // Set up Supabase auth state listener for real-time updates
    const { data: { subscription } } = apiClient.onAuthStateChange(debouncedAuthStateChange)

    initializeAuth()

    return () => {
      mounted = false
      if (authStateTimeout) {
        clearTimeout(authStateTimeout)
      }
      if (subscription) {
        subscription.unsubscribe()
      }
    }
  }, []) // Empty dependency array - only run once on mount

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
  }, [])

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

  const handleSignOut = useCallback(async () => {
    try {
      await apiClient.signOut()
      
      // Clear local state immediately (auth listener will also handle this)
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
  }, [])

  const handleGetStarted = useCallback(() => {
    if (user) {
      setCurrentView('marketplace')
    } else {
      setAuthMode('signin')
      setCurrentView('auth')
    }
  }, [user])

  const handleCreateListing = useCallback(() => {
    // Always go to home page for listing creation
    // User will be prompted to sign in when they submit the listing
    setCurrentView('home')
  }, [])

  const handleItemClick = useCallback((itemId: number) => {
    console.log('🔍 Clicking item:', itemId)
    setSelectedItemId(itemId)
    setCurrentView('item-detail')
  }, [])


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

  const handleViewAgentDashboard = () => {
    setCurrentView('seller-agent-dashboard')
  }

  const handleViewAgentSettings = () => {
    setCurrentView('agent-settings')
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

  // Show themed loading screen while initializing auth
  if (isLoading) {
    return <ThemedLoading message="Preparing your marketplace experience..." />
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
        isOwnProfile={user?.username === selectedUsername}
        onNavigateHome={() => setCurrentView('home')}
        onNavigateMarketplace={() => setCurrentView('marketplace')}
        onNavigateAgentDashboard={handleViewAgentDashboard}
      />
    )
  }

  if (currentView === 'profile-edit' && user) {
    return (
      <ProfileEdit />
    )
  }

  if (currentView === 'seller-agent-dashboard' && user) {
    return (
      <SellerAgentDashboard
        user={user}
        onBack={() => setCurrentView('profile-view')}
        onNavigateAgentSettings={handleViewAgentSettings}
      />
    )
  }

  if (currentView === 'agent-settings' && user) {
    return (
      <AgentSettings
        user={user}
        onClose={() => setCurrentView('seller-agent-dashboard')}
      />
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
        onViewProfile={handleViewProfile}
        onShowListingPreview={handleShowListingPreview}
      />
    </div>
  )
})