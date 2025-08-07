'use client'

import { useState } from 'react'
import { HeroSection } from './HeroSection'
import { ListingPreview } from './ListingPreview'
import { Marketplace } from '../marketplace/marketplace'
import { EnhancedAuth } from '../auth/enhanced-auth'
import { SellerDashboard } from '../seller/seller-dashboard'
import { ItemDetail } from '../marketplace/item-detail'
import { type AIAnalysisResult, apiClient } from "@/lib/api-client-new"

interface User {
  id: number
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
  const [currentView, setCurrentView] = useState<'home' | 'marketplace' | 'auth' | 'dashboard' | 'item-detail' | 'listing-preview'>('home')
  const [selectedItemId, setSelectedItemId] = useState<number | null>(null)
  const [previewData, setPreviewData] = useState<{analysisData: AIAnalysisResult, uploadedImage: string} | null>(null)
  const [marketplaceKey, setMarketplaceKey] = useState(0) // Force marketplace re-render

  const createListingAndNavigate = async (analysisData: AIAnalysisResult) => {
    try {
      const getConditionFromScore = (score: number): 'excellent' | 'good' | 'fair' | 'poor' => {
        if (score >= 8) return 'excellent'
        if (score >= 6) return 'good'
        if (score >= 4) return 'fair'
        return 'poor'
      }

      const listingData = {
        name: analysisData.listing.title,
        description: analysisData.listing.description,
        furniture_type: analysisData.listing.furniture_type,
        starting_price: parseFloat(analysisData.pricing.suggested_starting_price.toString()),
        condition: getConditionFromScore(analysisData.analysis.condition_score),
        image_filename: analysisData.image_filename
      }

      await apiClient.createListing(listingData)
      
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
          
          // Create the listing in the background
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

  const handleSignOut = () => {
    setUser(null)
    setCurrentView('home')
  }

  const handleGetStarted = () => {
    if (user) {
      setCurrentView('marketplace')
    } else {
      setCurrentView('auth')
    }
  }

  const handleCreateListing = () => {
    if (user) {
      setCurrentView('home')
    } else {
      setCurrentView('auth')
    }
  }

  const handleItemClick = (itemId: number) => {
    setSelectedItemId(itemId)
    setCurrentView('item-detail')
  }

  const handleBackToHome = () => {
    setCurrentView('home')
    setPreviewData(null)
  }

  const handleBackToMarketplace = () => {
    setCurrentView('marketplace')
  }

  const handleShowListingPreview = (analysisData: AIAnalysisResult, uploadedImage: string) => {
    setPreviewData({ analysisData, uploadedImage })
    setCurrentView('listing-preview')
  }

  const handleListingPreviewSignUp = (editedData: AIAnalysisResult) => {
    // Store the edited data and image URL for after authentication
    if (typeof window !== 'undefined') {
      const pendingData = {
        analysisData: editedData,
        imageUrl: previewData?.uploadedImage || ''
      }
      window.localStorage.setItem('pendingListing', JSON.stringify(pendingData))
    }
    setCurrentView('auth')
  }

  if (currentView === 'marketplace') {
    return (
      <Marketplace
        key={marketplaceKey} // Force re-render when key changes
        user={user}
        onCreateListing={handleCreateListing}
        onLogout={handleSignOut}
        onItemClick={handleItemClick}
        onSignInClick={() => setCurrentView('auth')}
        onSellerDashboard={() => setCurrentView('dashboard')}
      />
    )
  }

  if (currentView === 'auth') {
    return (
      <EnhancedAuth
        isOpen={true}
        onClose={handleBackToHome}
        onAuthSuccess={handleAuthSuccess}
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

  if (currentView === 'item-detail' && selectedItemId) {
    return (
      <ItemDetail
        itemId={selectedItemId}
        user={user}
        onBack={handleBackToMarketplace}
      />
    )
  }

  if (currentView === 'listing-preview' && previewData) {
    return (
      <ListingPreview
        analysisData={previewData.analysisData}
        uploadedImage={previewData.uploadedImage}
        onBack={handleBackToHome}
        onSignUp={handleListingPreviewSignUp}
      />
    )
  }

  return (
    <div className="homepage-container">
      <HeroSection
        user={user}
        onGetStarted={handleGetStarted}
        onSignIn={() => setCurrentView('auth')}
        onSignOut={handleSignOut}
        onCreateListing={handleCreateListing}
        onBrowseItems={() => setCurrentView('marketplace')}
        onSellerDashboard={() => setCurrentView('dashboard')}
        onShowListingPreview={handleShowListingPreview}
      />
    </div>
  )
}