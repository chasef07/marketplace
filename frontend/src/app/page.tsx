'use client'

import { AIShowcase } from "@/components/landing/ai-showcase"
import { Marketplace } from "@/components/marketplace/marketplace"
import { useState, useEffect } from "react"
import { apiClient } from "@/lib/api-client"

interface User {
  id: number
  username: string
  email: string
  full_name: string
}

export default function Home() {
  const [currentView, setCurrentView] = useState<'upload' | 'marketplace'>('upload')
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [marketplaceKey, setMarketplaceKey] = useState(0)

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
        <AIShowcase onAccountCreated={handleAccountCreated} />
      ) : (
        <Marketplace 
          key={marketplaceKey}
          user={user}
          onCreateListing={handleCreateListing}
          onLogout={handleLogout}
        />
      )}
    </main>
  );
}
