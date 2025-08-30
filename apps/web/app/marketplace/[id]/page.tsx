'use client'

import { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import { ItemDetail } from "@/components/marketplace/item-detail"
import { User } from "@/lib/types/user"
import { apiClient } from "@/lib/api-client-new"

export default function MarketplaceItemPage() {
  const router = useRouter()
  const params = useParams()
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadUser = async () => {
      try {
        const userData = await apiClient.getCurrentUser()
        setUser(userData)
      } catch (error) {
        console.error('Failed to load current user:', error)
        setUser(null)
      } finally {
        setLoading(false)
      }
    }

    loadUser()

    // Set up auth state listener
    const { data: { subscription } } = apiClient.onAuthStateChange((session) => {
      if (session?.user) {
        apiClient.getCurrentUser().then(setUser).catch(() => setUser(null))
      } else {
        setUser(null)
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  const handleBack = () => {
    router.push('/browse')
  }

  const handleSignIn = () => {
    router.push('/')
  }

  const handleViewProfile = (username: string) => {
    router.push(`/profile/${username}`)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-hero-gradient">
        <div className="animate-pulse text-slate-600">Loading item details...</div>
      </div>
    )
  }

  const itemId = parseInt(params.id as string)

  if (isNaN(itemId)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-hero-gradient">
        <div className="text-red-600">Invalid item ID</div>
      </div>
    )
  }

  return (
    <ItemDetail
      itemId={itemId}
      user={user}
      onBack={handleBack}
      onSignInClick={handleSignIn}
      onViewProfile={handleViewProfile}
    />
  )
}