'use client'

import { AIShowcase } from "@/components/landing/ai-showcase"
import { Marketplace } from "@/components/marketplace/marketplace"
import { ItemDetail } from "@/components/marketplace/item-detail"
import { AuthPage } from "@/components/auth/auth-page"
import { AuthModal } from "@/components/auth/auth-modal"
import { SellerDashboard } from "@/components/seller/seller-dashboard"
import { useState, useEffect } from "react"
import { apiClient, type AIAnalysisResult, type CreateListingData } from "@/lib/api-client"

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

export default function Home() {
  const [currentView, setCurrentView] = useState<'upload' | 'marketplace' | 'item-detail' | 'auth' | 'seller-dashboard'>('upload')
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [marketplaceKey, setMarketplaceKey] = useState(0)
  const [selectedItemId, setSelectedItemId] = useState<number | null>(null)
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [pendingListingData, setPendingListingData] = useState<AIAnalysisResult | null>(null)
  const [dashboardTab, setDashboardTab] = useState<'items' | 'seller-offers' | 'buyer-offers'>('items')

  useEffect(() => {
    checkAuthStatus()
  }, [])

  const checkAuthStatus = async () => {
    try {
      const currentUser = await apiClient.getCurrentUser()
      if (currentUser) {
        setUser(currentUser)
        setCurrentView('marketplace')
      }
    } catch (err) {
      // User not logged in, stay on upload page
    } finally {
      setLoading(false)
    }
  }


  const handleCreateListing = () => {
    if (user) {
      setCurrentView('upload')
    } else {
      setShowAuthModal(true)
    }
  }

  const handleLogout = async () => {
    await apiClient.logout()
    setUser(null)
    setCurrentView('upload')
  }

  const handleItemClick = (itemId: number) => {
    setSelectedItemId(itemId)
    setCurrentView('item-detail')
  }

  const handleBackToMarketplace = () => {
    setSelectedItemId(null)
    setCurrentView('marketplace')
  }

  const handleMakeOffer = async (itemId: number, offer: number, message: string) => {
    try {
      await apiClient.createOffer(itemId, offer, message)
      // Redirect to dashboard to view the offer in buyer offers tab
      setDashboardTab('buyer-offers')
      setCurrentView('seller-dashboard')
    } catch (error) {
      console.error('Failed to submit offer:', error)
      throw error
    }
  }

  const handleSignInClick = () => {
    setShowAuthModal(true)
  }

  const handlePendingListing = (analysisData: AIAnalysisResult) => {
    setPendingListingData(analysisData)
  }

  const handleSellerDashboard = () => {
    setDashboardTab('items')
    setCurrentView('seller-dashboard')
  }

  const handleAuthSuccess = async (newUser: User) => {
    console.log('handleAuthSuccess called with user:', newUser)
    setUser(newUser)
    setShowAuthModal(false)
    
    // If there's pending listing data, create the listing
    if (pendingListingData) {
      try {
        const getConditionFromScore = (score: number): 'excellent' | 'good' | 'fair' | 'poor' => {
          if (score >= 8) return 'excellent'
          if (score >= 6) return 'good'
          if (score >= 4) return 'fair'
          return 'poor'
        }

        const listingData: CreateListingData = {
          name: pendingListingData.listing.title,
          description: pendingListingData.listing.description,
          furniture_type: pendingListingData.listing.furniture_type,
          starting_price: parseFloat(pendingListingData.pricing.suggested_starting_price.toString()),
          condition: getConditionFromScore(pendingListingData.analysis.condition_score),
          image_filename: pendingListingData.image_filename
        }

        await apiClient.createListing(listingData)
        setPendingListingData(null) // Clear pending data
        console.log('Listing created successfully')
      } catch (error) {
        console.error('Failed to create listing:', error)
        // Still proceed to marketplace, user can try again
      }
    }
    
    console.log('Setting currentView to marketplace')
    setCurrentView('marketplace')
    setMarketplaceKey(prev => prev + 1)
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-gray-400">Loading...</div>
      </main>
    )
  }

  return (
    <main className="min-h-screen">
      {currentView === 'upload' ? (
        <AIShowcase 
          onSignInClick={handleSignInClick}
          onBrowseClick={() => setCurrentView('marketplace')}
          onPendingListing={handlePendingListing}
        />
      ) : currentView === 'marketplace' ? (
        <Marketplace 
          key={marketplaceKey}
          user={user}
          onCreateListing={handleCreateListing}
          onLogout={handleLogout}
          onItemClick={handleItemClick}
          onSignInClick={handleSignInClick}
          onSellerDashboard={handleSellerDashboard}
        />
      ) : currentView === 'seller-dashboard' ? (
        user && (
          <SellerDashboard
            user={user}
            onItemClick={handleItemClick}
            onBackToMarketplace={() => setCurrentView('marketplace')}
            defaultTab={dashboardTab}
          />
        )
      ) : currentView === 'auth' ? (
        <AuthPage
          onAuthSuccess={handleAuthSuccess}
        />
      ) : (
        selectedItemId && (
          <ItemDetail
            itemId={selectedItemId}
            user={user}
            onBack={handleBackToMarketplace}
            onMakeOffer={handleMakeOffer}
          />
        )
      )}

      {/* Auth Modal */}
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        onAuthSuccess={handleAuthSuccess}
      />
    </main>
  );
}
