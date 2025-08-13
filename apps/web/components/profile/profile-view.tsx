'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { User, MapPin, Calendar, Star, Package, ShoppingBag, Edit, ArrowLeft, Home, Store, Bell, Clock, CheckCircle, XCircle, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { createClient } from '@/lib/supabase'
import { colors, gradients, shadows } from '../home/design-system/colors'
import { animations } from '../home/design-system/animations'
import { FloatingSellerChat } from '../chat/FloatingSellerChat'
import useSWR from 'swr'
import { apiClient } from '@/src/lib/api-client-new'
import { getRotatingGreeting } from '@/lib/greetings'

interface ProfileData {
  id: string
  username: string
  display_name: string
  bio?: string
  profile_picture_filename?: string
  location: {
    city?: string
    state?: string
    zip_code?: string
  }
  is_verified: boolean
  stats: {
    total_sales: number
    total_purchases: number
    rating_average: number
    rating_count: number
  }
  member_since: string
  last_active?: string
  active_items: Array<{
    id: number
    name: string
    description?: string
    furniture_type: string
    starting_price: number
    condition?: string
    image_filename?: string
    images?: Array<{ filename: string; order: number; is_primary: boolean }>
    views_count: number
    created_at: string
  }>
}

interface ProfileViewProps {
  username: string
  isOwnProfile?: boolean
  onNavigateHome?: () => void
  onNavigateMarketplace?: () => void
  onCreateListing?: () => void
  onSignOut?: () => void
}

export default function ProfileView({ username, isOwnProfile = false, onNavigateHome, onNavigateMarketplace, onCreateListing, onSignOut }: ProfileViewProps) {
  const [profile, setProfile] = useState<ProfileData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchProfile = async () => {
      console.log('ProfileView: Fetching profile for username:', username)
      try {
        const response = await fetch(`/api/profiles/${username}`)
        console.log('ProfileView: API response status:', response.status)
        
        if (!response.ok) {
          throw new Error(response.status === 404 ? 'Profile not found' : 'Failed to load profile')
        }

        const profileData = await response.json()
        console.log('ProfileView: Profile data received:', profileData)
        setProfile(profileData)
      } catch (err) {
        console.error('ProfileView: Error fetching profile:', err)
        setError(err instanceof Error ? err.message : 'Something went wrong')
      } finally {
        setLoading(false)
      }
    }

    fetchProfile()
  }, [username])

  const getProfileImageUrl = (filename?: string) => {
    if (!filename) return null
    const supabase = createClient() // Using singleton pattern
    const { data } = supabase.storage.from('furniture-images').getPublicUrl(filename)
    return data.publicUrl
  }

  const getItemImageUrl = (item: ProfileData['active_items'][0]) => {
    // Use the first image from the images array, or fall back to image_filename
    const primaryImage = item.images?.find(img => img.is_primary) || item.images?.[0]
    const filename = primaryImage?.filename || item.image_filename
    
    if (!filename) return null
    
    const supabase = createClient() // Using singleton pattern
    const { data } = supabase.storage.from('furniture-images').getPublicUrl(filename)
    return data.publicUrl
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long'
    })
  }

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(price)
  }

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="animate-pulse">
          <div className="flex items-center space-x-6 mb-8">
            <div className="w-24 h-24 bg-gray-200 rounded-full"></div>
            <div className="space-y-3">
              <div className="h-6 bg-gray-200 rounded w-48"></div>
              <div className="h-4 bg-gray-200 rounded w-32"></div>
              <div className="h-4 bg-gray-200 rounded w-64"></div>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="bg-gray-200 h-64 rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <Card className="p-8 text-center">
          <User className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Profile not found</h3>
          <p className="text-gray-500">{error}</p>
        </Card>
      </div>
    )
  }

  if (!profile) return null

  return (
    <div className="min-h-screen" style={{ background: 'linear-gradient(135deg, #F7F3E9 0%, #E8DDD4 50%, #DDD1C7 100%)' }}>
      {/* Header */}
      <header className="profile-header">
        <div className="header-content">
          <div className="header-inner">
            <div className="logo">
              <span className="logo-text">SnapNest</span>
            </div>
            
            <div className="nav-buttons">
              {isOwnProfile && profile && (
                <span className="welcome-text">{getRotatingGreeting(profile.id)}, {profile.display_name || profile.username}!</span>
              )}
              <Button 
                variant="ghost"
                onClick={onNavigateMarketplace}
                className="nav-button nav-button-ghost"
              >
                Browse
              </Button>
              <Button 
                variant="ghost"
                onClick={() => {
                  console.log('👆 Sell button onClick triggered', { onCreateListing })
                  console.log('🔄 Attempting to navigate to home page for Sell')
                  if (onCreateListing) {
                    onCreateListing()
                  } else {
                    console.error('❌ onCreateListing is undefined!')
                    // Fallback navigation
                    window.location.href = '/'
                  }
                }}
                className="nav-button nav-button-ghost"
                style={{ zIndex: 999, position: 'relative' }}
              >
                Sell
              </Button>
              <Button 
                variant="ghost"
                onClick={() => {
                  console.log('👆 Sign Out button onClick triggered', { onSignOut })
                  console.log('🚪 Attempting to sign out')
                  if (onSignOut) {
                    onSignOut()
                  } else {
                    console.error('❌ onSignOut is undefined!')
                    // Fallback navigation
                    window.location.href = '/'
                  }
                }}
                className="nav-button nav-button-ghost"
                style={{ zIndex: 999, position: 'relative' }}
              >
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto p-6" style={{ paddingTop: '6rem' }}>
      {/* Profile Header */}
      <div className="bg-white rounded-lg shadow-sm border p-8 mb-8">
        <div className="flex flex-col md:flex-row items-start md:items-center space-y-6 md:space-y-0 md:space-x-8">
          {/* Profile Picture */}
          <div className="relative">
            {profile.profile_picture_filename ? (
              <Image
                src={getProfileImageUrl(profile.profile_picture_filename)!}
                alt={`${profile.display_name}'s profile`}
                width={96}
                height={96}
                className="rounded-full object-cover"
              />
            ) : (
              <div className="w-24 h-24 bg-gray-200 rounded-full flex items-center justify-center">
                <User className="h-8 w-8 text-gray-400" />
              </div>
            )}
            {profile.is_verified && (
              <div className="absolute -bottom-1 -right-1 bg-blue-500 text-white rounded-full p-1">
                <Star className="h-3 w-3 fill-current" />
              </div>
            )}
          </div>

          {/* Profile Info */}
          <div className="flex-1">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900 mb-2">
                  {profile.display_name}
                  {profile.is_verified && (
                    <Star className="inline h-5 w-5 text-blue-500 ml-2 fill-current" />
                  )}
                </h1>
                <p className="text-gray-600 mb-2">@{profile.username}</p>
                
                {/* Location & Member Info */}
                <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500 mb-4">
                  {(profile.location.city || profile.location.state) && (
                    <div className="flex items-center">
                      <MapPin className="h-4 w-4 mr-1" />
                      <span>
                        {[profile.location.city, profile.location.state].filter(Boolean).join(', ')}
                      </span>
                    </div>
                  )}
                  <div className="flex items-center">
                    <Calendar className="h-4 w-4 mr-1" />
                    <span>Member since {formatDate(profile.member_since)}</span>
                  </div>
                </div>

                {/* Bio */}
                {profile.bio && (
                  <p className="text-gray-700 mb-4">{profile.bio}</p>
                )}

                {/* Stats */}
                <div className="flex flex-wrap gap-6 text-sm">
                  <div className="flex items-center">
                    <Package className="h-4 w-4 mr-1 text-green-600" />
                    <span className="font-medium">{profile.stats.total_sales}</span>
                    <span className="text-gray-500 ml-1">sales</span>
                  </div>
                  <div className="flex items-center">
                    <ShoppingBag className="h-4 w-4 mr-1 text-blue-600" />
                    <span className="font-medium">{profile.stats.total_purchases}</span>
                    <span className="text-gray-500 ml-1">purchases</span>
                  </div>
                  {profile.stats.rating_count > 0 && (
                    <div className="flex items-center">
                      <Star className="h-4 w-4 mr-1 text-yellow-500 fill-current" />
                      <span className="font-medium">{profile.stats.rating_average.toFixed(1)}</span>
                      <span className="text-gray-500 ml-1">
                        ({profile.stats.rating_count} review{profile.stats.rating_count !== 1 ? 's' : ''})
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 mt-4 md:mt-0">
                {isOwnProfile ? (
                  <Link href="/profile/edit">
                    <Button variant="outline" size="sm">
                      <Edit className="h-4 w-4 mr-2" />
                      Edit Profile
                    </Button>
                  </Link>
                ) : (
                  <Button size="sm">
                    Message
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Active Items */}
      <div className="bg-white rounded-lg shadow-sm border p-8">
        <h2 className="text-xl font-semibold text-gray-900 mb-6">
          Active Listings ({profile.active_items.length})
        </h2>

        {profile.active_items.length === 0 ? (
          <div className="text-center py-12">
            <Package className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No active listings</h3>
            <p className="text-gray-500">
              {isOwnProfile 
                ? "You haven't listed any items yet." 
                : `${profile.display_name} doesn't have any active listings.`}
            </p>
            {isOwnProfile && (
              <Link href="/sell" className="inline-block mt-4">
                <Button>List Your First Item</Button>
              </Link>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {profile.active_items.map((item) => (
              <Link
                key={item.id}
                href={`/marketplace/${item.id}`}
                className="block group"
              >
                <Card className="overflow-hidden hover:shadow-md transition-shadow">
                  <div className="aspect-square relative bg-gray-100">
                    {getItemImageUrl(item) ? (
                      <Image
                        src={getItemImageUrl(item)!}
                        alt={item.name}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Package className="h-12 w-12 text-gray-400" />
                      </div>
                    )}
                  </div>
                  <div className="p-4">
                    <h3 className="font-medium text-gray-900 mb-2 line-clamp-1">
                      {item.name}
                    </h3>
                    <p className="text-lg font-semibold text-gray-900 mb-2">
                      {formatPrice(item.starting_price)}
                    </p>
                    <div className="flex items-center justify-between text-sm text-gray-500">
                      <span className="capitalize">{item.furniture_type.replace('_', ' ')}</span>
                      <span>{item.views_count} views</span>
                    </div>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Buyer Notifications Section - Only for own profile */}
      {isOwnProfile && (
        <BuyerNotificationsSection userId={profile.id} />
      )}
      
      </div>

      {/* Styles */}
      <style jsx>{`
        .profile-header {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          z-index: 50;
          backdrop-filter: blur(10px);
          background: ${colors.glass.background};
          border-bottom: 1px solid ${colors.glass.border};
          box-shadow: ${shadows.sm};
        }

        .header-content {
          padding: 1rem 2rem;
        }

        .header-inner {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .logo {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .logo-text {
          font-size: 1.5rem;
          font-weight: 800;
          color: ${colors.neutralDark};
          letter-spacing: -0.025em;
          font-family: 'Inter', -apple-system, sans-serif;
        }

        .nav-buttons {
          display: flex;
          align-items: center;
          gap: 1rem;
        }
        
        .welcome-text {
          color: ${colors.primary};
          font-size: 0.9rem;
          font-weight: 500;
        }

        .nav-button {
          font-weight: 600;
          transition: all 300ms ${animations.easing.smooth};
          border-radius: 8px;
          font-size: 0.9rem;
        }

        .nav-button-ghost {
          color: ${colors.neutralDark};
          background: transparent;
          border: none;
        }

        .nav-button-ghost:hover {
          background: ${colors.primary}10;
          color: ${colors.primary};
          transform: translateY(-1px);
        }

        @media (max-width: 768px) {
          .header-content {
            padding: 1rem;
          }

          .nav-buttons {
            gap: 0.5rem;
          }

          .logo-text {
            font-size: 1.25rem;
          }
          
          .welcome-text {
            display: none;
          }
        }
      `}</style>
      
      {/* Floating Chat - Only for own profile */}
      {isOwnProfile && profile && (
        <FloatingSellerChat 
          user={{
            id: profile.id,
            username: profile.username,
            email: profile.username + '@example.com' // Fallback since email isn't in ProfileData
          }} 
        />
      )}
    </div>
  )
}

// Buyer Notifications Section Component
interface BuyerNotificationsSectionProps {
  userId: string
}

interface Negotiation {
  id: number
  status: string
  created_at: string
  updated_at: string
  display_status: string
  needs_attention: boolean
  time_since_last_update: number
  offer_count: number
  latest_offer?: {
    id: number
    price: number
    message?: string
    offer_type: string
    created_at: string
    is_counter_offer: boolean
  }
  items: {
    id: number
    name: string
    starting_price: number
    image_filename?: string
    furniture_type: string
  }
  profiles: {
    id: string
    username: string
  }
}

function BuyerNotificationsSection({ userId }: BuyerNotificationsSectionProps) {
  const [processing, setProcessing] = useState<string>('')
  const [counterOffer, setCounterOffer] = useState<{negotiationId: number | null, isOpen: boolean, price: string}>({
    negotiationId: null,
    isOpen: false,
    price: ''
  })

  // Simple, direct data fetching - no complex status detection
  const { data: myOffers, error, mutate } = useSWR(
    'buyer-offers',
    async () => {
      const headers = await apiClient.getAuthHeaders()
      const response = await fetch('/api/buyer/negotiations', { headers })
      if (!response.ok) throw new Error('Failed to fetch offers')
      return response.json()
    },
    { refreshInterval: 10000 } // Refresh every 10 seconds for real-time updates
  )

  if (error) {
    return (
      <div className="max-w-4xl mx-auto p-6 mt-8">
        <Card className="p-8 text-center">
          <p className="text-red-600">Error loading offers. Please refresh the page.</p>
        </Card>
      </div>
    )
  }

  if (!myOffers?.negotiations || myOffers.negotiations.length === 0) {
    return (
      <div className="max-w-4xl mx-auto p-6 mt-8">
        <div className="flex items-center gap-3 mb-6">
          <ShoppingBag className="h-6 w-6 text-gray-700" />
          <h2 className="text-xl font-semibold text-gray-900">My Offers & Negotiations</h2>
        </div>
        
        <Card className="p-8 text-center">
          <ShoppingBag className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No offers yet</h3>
          <p className="text-gray-500 mb-4">
            Start browsing the marketplace to make your first offer!
          </p>
          <Link href="/marketplace">
            <Button>Browse Marketplace</Button>
          </Link>
        </Card>
      </div>
    )
  }

  // Improved status determination with full context
  const getDetailedStatus = (negotiation: any) => {
    // Handle completed/cancelled negotiations
    if (negotiation.status === 'completed') return { status: 'accepted', context: 'Deal completed' }
    if (negotiation.status === 'cancelled') return { status: 'declined', context: 'Offer was declined' }
    
    const latestOffer = negotiation.latest_offer
    if (!latestOffer) {
      return { status: 'error', context: 'No offers found - system error' }
    }

    // Determine current state based on latest offer and negotiation flow
    if (latestOffer.offer_type === 'seller') {
      // Seller made the last move
      if (latestOffer.is_counter_offer) {
        return { 
          status: 'counter_received', 
          context: `Seller countered with $${latestOffer.price}`,
          needsAction: true
        }
      } else {
        // Shouldn't happen in normal flow, but handle gracefully
        return { 
          status: 'pending', 
          context: 'Unusual seller offer - check manually',
          needsAction: false
        }
      }
    } else {
      // Buyer (you) made the last move
      if (latestOffer.is_counter_offer) {
        return { 
          status: 'pending', 
          context: `You countered with $${latestOffer.price} - waiting for response`,
          needsAction: false
        }
      } else {
        return { 
          status: 'pending', 
          context: `You offered $${latestOffer.price} - waiting for response`,
          needsAction: false
        }
      }
    }
  }

  const getStatusDisplay = (status: string, needsAction = false) => {
    switch (status) {
      case 'accepted': return { icon: '✅', text: 'Accepted', color: 'text-green-600', bgColor: 'bg-green-50' }
      case 'declined': return { icon: '❌', text: 'Declined', color: 'text-red-600', bgColor: 'bg-red-50' }
      case 'counter_received': return { 
        icon: '💰', 
        text: needsAction ? 'Action Required' : 'Counter Received', 
        color: 'text-orange-600', 
        bgColor: 'bg-orange-50' 
      }
      case 'error': return { icon: '⚠️', text: 'System Error', color: 'text-red-600', bgColor: 'bg-red-50' }
      default: return { icon: '⏳', text: 'Pending Response', color: 'text-blue-600', bgColor: 'bg-blue-50' }
    }
  }

  const handleAcceptCounter = async (negotiationId: number) => {
    setProcessing(`accept-${negotiationId}`)
    try {
      await apiClient.acceptNegotiation(negotiationId)
      await mutate()
      alert('Counter offer accepted! The seller has been notified.')
    } catch (error) {
      console.error('Failed to accept:', error)
      alert('Failed to accept counter offer. Please try again.')
    } finally {
      setProcessing('')
    }
  }

  const handleOpenCounterForm = (negotiationId: number, currentPrice: number) => {
    setCounterOffer({
      negotiationId,
      isOpen: true,
      price: Math.floor(currentPrice * 0.9).toString() // Suggest 10% lower
    })
  }

  const handleSubmitCounter = async () => {
    if (!counterOffer.negotiationId || !counterOffer.price) return

    setProcessing(`counter-${counterOffer.negotiationId}`)
    try {
      const headers = await apiClient.getAuthHeaders()
      const response = await fetch(`/api/negotiations/${counterOffer.negotiationId}/counter`, {
        method: 'POST',
        headers: {
          ...headers,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          price: parseFloat(counterOffer.price),
          message: `Counter offer: $${counterOffer.price}`
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to submit counter offer')
      }

      await mutate()
      setCounterOffer({ negotiationId: null, isOpen: false, price: '' })
      alert('Counter offer submitted! The seller has been notified.')
    } catch (error: any) {
      console.error('Failed to submit counter:', error)
      alert(error.message || 'Failed to submit counter offer. Please try again.')
    } finally {
      setProcessing('')
    }
  }

  const handleCloseCounterForm = () => {
    setCounterOffer({ negotiationId: null, isOpen: false, price: '' })
  }

  const handleDeclineCounter = async (negotiationId: number) => {
    setProcessing(`decline-${negotiationId}`)
    try {
      const headers = await apiClient.getAuthHeaders()
      const response = await fetch(`/api/negotiations/${negotiationId}/decline`, {
        method: 'POST',
        headers: {
          ...headers,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          reason: 'Counter offer declined by buyer'
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to decline counter offer')
      }

      await mutate()
      alert('Counter offer declined. The negotiation has ended.')
    } catch (error: any) {
      console.error('Failed to decline:', error)
      alert(error.message || 'Failed to decline counter offer. Please try again.')
    } finally {
      setProcessing('')
    }
  }

  const getItemImageUrl = (filename?: string) => {
    if (!filename) return null
    const supabase = createClient()
    const { data } = supabase.storage.from('furniture-images').getPublicUrl(filename)
    return data.publicUrl
  }

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(price)
  }

  const getTimeAgo = (dateString: string) => {
    const hours = Math.floor((new Date().getTime() - new Date(dateString).getTime()) / (1000 * 60 * 60))
    if (hours < 1) return 'Just now'
    if (hours < 24) return `${hours}h ago`
    return `${Math.floor(hours / 24)}d ago`
  }

  return (
    <div className="max-w-4xl mx-auto p-6 mt-8">
      <div className="flex items-center gap-3 mb-6">
        <ShoppingBag className="h-6 w-6 text-gray-700" />
        <h2 className="text-xl font-semibold text-gray-900">My Offers & Negotiations</h2>
        <span className="text-sm text-gray-500">
          ({myOffers.negotiations.length} total)
        </span>
      </div>

      <div className="space-y-4">
        {myOffers.negotiations.map((negotiation: any) => {
          const statusInfo = getDetailedStatus(negotiation)
          const statusDisplay = getStatusDisplay(statusInfo.status, statusInfo.needsAction)
          const latestOffer = negotiation.latest_offer
          const lastUpdate = latestOffer?.created_at || negotiation.created_at

          return (
            <Card key={negotiation.id} className="p-6 hover:shadow-md transition-all">
              <div className="flex items-start gap-4">
                {/* Item Image */}
                <div className="w-20 h-20 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                  {negotiation.items.image_filename ? (
                    <Image
                      src={getItemImageUrl(negotiation.items.image_filename) || '/placeholder.jpg'}
                      alt={negotiation.items.name}
                      width={80}
                      height={80}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Package className="h-8 w-8 text-gray-400" />
                    </div>
                  )}
                </div>

                {/* Offer Details */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-semibold text-gray-900 text-lg mb-1">
                        {negotiation.items.name}
                      </h3>
                      <p className="text-sm text-gray-600 mb-2">
                        Seller: @{negotiation.profiles.username} | Listed: ${negotiation.items.starting_price}
                      </p>
                      <p className="text-xs text-gray-500">
                        {statusInfo.context}
                      </p>
                    </div>
                    <div className="text-right">
                      <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full ${statusDisplay.bgColor}`}>
                        <span className="text-lg">{statusDisplay.icon}</span>
                        <span className={`text-sm font-medium ${statusDisplay.color}`}>
                          {statusDisplay.text}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        {getTimeAgo(lastUpdate)}
                      </p>
                    </div>
                  </div>

                  {/* Current Offer Info */}
                  {latestOffer && (
                    <div className="mt-3 p-4 bg-gray-50 rounded-lg">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-gray-700">
                          {latestOffer.is_counter_offer && latestOffer.offer_type === 'seller' 
                            ? 'Seller\'s Counter Offer:' 
                            : 'Your Offer:'}
                        </span>
                        <span className="text-xl font-bold text-gray-900">
                          {formatPrice(latestOffer.price)}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex gap-3 mt-4">
                    {statusInfo.status === 'counter_received' && (
                      <>
                        <Button
                          size="sm"
                          className="bg-green-600 hover:bg-green-700 text-white"
                          onClick={() => handleAcceptCounter(negotiation.id)}
                          disabled={processing === `accept-${negotiation.id}`}
                        >
                          {processing === `accept-${negotiation.id}` ? 'Accepting...' : '✅ Accept Counter'}
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => handleOpenCounterForm(negotiation.id, latestOffer?.price || 0)}
                          disabled={processing.startsWith('counter-')}
                        >
                          💰 Counter Offer
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline"
                          className="text-red-600 border-red-600 hover:bg-red-50"
                          onClick={() => handleDeclineCounter(negotiation.id)}
                          disabled={processing === `decline-${negotiation.id}`}
                        >
                          {processing === `decline-${negotiation.id}` ? 'Declining...' : '❌ Decline'}
                        </Button>
                      </>
                    )}
                    
                    {statusInfo.status === 'pending' && !statusInfo.needsAction && (
                      <Link href={`/marketplace/${negotiation.items.id}`}>
                        <Button size="sm" variant="outline">✏️ Update Offer</Button>
                      </Link>
                    )}
                    
                    {statusInfo.status === 'accepted' && (
                      <Button 
                        size="sm" 
                        className="bg-blue-600 hover:bg-blue-700 text-white"
                        onClick={() => alert('Pickup coordination feature coming soon! Please contact the seller directly.')}
                      >
                        📅 Arrange Pickup
                      </Button>
                    )}

                    {statusInfo.status === 'error' && (
                      <Button 
                        size="sm" 
                        variant="outline"
                        className="text-red-600 border-red-600"
                        onClick={() => alert('This negotiation has a data error. Please contact support or try making a new offer.')}
                      >
                        ⚠️ Report Issue
                      </Button>
                    )}

                    <Link href={`/marketplace/${negotiation.items.id}`}>
                      <Button size="sm" variant="ghost">👁️ View Item</Button>
                    </Link>
                  </div>
                </div>
              </div>
            </Card>
          )
        })}
      </div>

      {/* Counter Offer Modal */}
      {counterOffer.isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">Submit Counter Offer</h3>
            
            {/* Show context */}
            {(() => {
              const currentNegotiation = myOffers?.negotiations?.find((neg: any) => neg.id === counterOffer.negotiationId)
              if (!currentNegotiation) return null
              
              return (
                <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-600 mb-1">
                    <strong>{currentNegotiation.items.name}</strong>
                  </p>
                  <p className="text-sm text-gray-600">
                    Seller's offer: <strong>${currentNegotiation.latest_offer?.price}</strong>
                  </p>
                  <p className="text-sm text-gray-600">
                    Listed price: ${currentNegotiation.items.starting_price}
                  </p>
                </div>
              )
            })()}
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Your Counter Price
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">$</span>
                <input
                  type="number"
                  value={counterOffer.price}
                  onChange={(e) => setCounterOffer(prev => ({ ...prev, price: e.target.value }))}
                  className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter your counter offer"
                  min="1"
                />
              </div>
            </div>

            <div className="flex gap-3">
              <Button
                onClick={handleSubmitCounter}
                disabled={!counterOffer.price || processing.startsWith('counter-')}
                className="flex-1"
              >
                {processing.startsWith('counter-') ? 'Submitting...' : 'Submit Counter'}
              </Button>
              <Button
                onClick={handleCloseCounterForm}
                variant="outline"
                disabled={processing.startsWith('counter-')}
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}