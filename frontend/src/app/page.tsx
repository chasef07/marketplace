'use client'

import { AIShowcase } from "@/components/landing/ai-showcase"
import { Marketplace } from "@/components/marketplace/marketplace"
import { ItemDetail } from "@/components/marketplace/item-detail"
import { AuthPage } from "@/components/auth/auth-page"
import { useState, useEffect } from "react"
import { apiClient } from "@/lib/api-client"

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
  const [currentView, setCurrentView] = useState<'upload' | 'marketplace' | 'item-detail' | 'auth'>('upload')
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [marketplaceKey, setMarketplaceKey] = useState(0)
  const [selectedItemId, setSelectedItemId] = useState<number | null>(null)

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

  const handleAccountCreated = (newUser: User) => {
    setUser(newUser)
    setCurrentView('marketplace')
    setMarketplaceKey(prev => prev + 1) // Force refresh
  }

  const handleCreateListing = () => {
    setCurrentView('upload')
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
      await apiClient.post(`/negotiations/items/${itemId}/offers`, {
        price: offer,
        message: message
      })
      alert('Offer submitted successfully!')
    } catch (error) {
      throw error
    }
  }

  const handleSignInClick = () => {
    setCurrentView('auth')
  }

  const handleAuthSuccess = (newUser: User) => {
    console.log('handleAuthSuccess called with user:', newUser)
    setUser(newUser)
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
          onAccountCreated={handleAccountCreated}
          onSignInClick={handleSignInClick}
          onBrowseClick={() => setCurrentView('marketplace')}
        />
      ) : currentView === 'marketplace' ? (
        <Marketplace 
          key={marketplaceKey}
          user={user}
          onCreateListing={handleCreateListing}
          onLogout={handleLogout}
          onItemClick={handleItemClick}
          onSignInClick={handleSignInClick}
        />
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
    </main>
  );
}
