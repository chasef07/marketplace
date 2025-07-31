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
      <main className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-500">Loading...</div>
      </main>
    )
  }

  return (
    <main className="min-h-screen">
      {currentView === 'upload' ? (
        <AIShowcase onAccountCreated={handleAccountCreated} />
      ) : (
        <Marketplace 
          user={user}
          onCreateListing={handleCreateListing}
          onLogout={handleLogout}
        />
      )}
    </main>
  );
}
