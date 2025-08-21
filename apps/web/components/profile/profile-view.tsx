'use client'

import { useState, useEffect, useMemo } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { User, MapPin, Calendar, Star, Package, ShoppingBag, Edit, Bot, Clock, DollarSign, CheckCircle, XCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { createClient } from '@/lib/supabase'
import { colors, gradients, shadows } from '../home/design-system/colors'
import { animations } from '../home/design-system/animations'
import useSWR from 'swr'
import { apiClient } from '@/src/lib/api-client-new'
import { getRotatingGreeting } from '@/lib/greetings'
import { BLUR_PLACEHOLDERS } from '@/src/lib/blur-data'
import { QuickActionsOverlay } from '../marketplace/QuickActionsOverlay'

type NegotiationWithItems = {
  id: number
  status: string
  final_price: number | null
  latest_offer_price: number | null
  created_at: string
  display_status: string
  needs_attention: boolean
  latest_offer: {
    id: number
    price: number
    offer_type: 'buyer' | 'seller'
    is_counter_offer: boolean
    created_at: string
  } | null
  offer_count: number
  items: {
    id: number
    name: string
    image_filename?: string
    starting_price: number
  }
  profiles: {
    username: string
  }
}


// ProfileData interface (shared with wrapper)
export interface ProfileData {
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
  onNavigateAgentDashboard?: () => void
}

export default function ProfileView({ username, isOwnProfile = false, onNavigateHome, onNavigateMarketplace, onCreateListing, onSignOut, onNavigateAgentDashboard }: ProfileViewProps) {
  const [profile, setProfile] = useState<ProfileData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const response = await fetch(`/api/profiles/${username}`)
        
        if (!response.ok) {
          throw new Error(response.status === 404 ? 'Profile not found' : 'Failed to load profile')
        }

        const profileData = await response.json()
        setProfile(profileData)
      } catch (err) {
        console.error('Error fetching profile:', err)
        setError(err instanceof Error ? err.message : 'Something went wrong')
      } finally {
        setLoading(false)
      }
    }

    fetchProfile()
  }, [username])

  // Memoized utility functions for better performance
  const supabaseClient = useMemo(() => createClient(), [])

  const getProfileImageUrl = useMemo(() => (filename?: string) => {
    if (!filename) return null
    const { data } = supabaseClient.storage.from('furniture-images').getPublicUrl(filename)
    return data.publicUrl
  }, [supabaseClient])

  const getItemImageUrl = useMemo(() => (item: ProfileData['active_items'][0]) => {
    // Use the first image from the images array, or fall back to image_filename
    const primaryImage = item.images?.find(img => img.is_primary) || item.images?.[0]
    const filename = primaryImage?.filename || item.image_filename
    
    if (!filename) return null
    
    const { data } = supabaseClient.storage.from('furniture-images').getPublicUrl(filename)
    return data.publicUrl
  }, [supabaseClient])

  const formatDate = useMemo(() => (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long'
    })
  }, [])

  const formatPrice = useMemo(() => (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(price)
  }, [])

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
        <div className="p-8 text-center">
          <h3 className="text-lg font-medium text-gray-900 mb-2">Profile not found</h3>
          <p className="text-gray-500">{error}</p>
        </div>
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
                onClick={onCreateListing}
                className="nav-button nav-button-ghost"
              >
                Sell
              </Button>
              <Button 
                variant="ghost"
                onClick={onSignOut}
                className="nav-button nav-button-ghost"
              >
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto p-6" style={{ paddingTop: '6rem' }}>
      {/* Profile Header */}
      <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8 mb-8 hover:shadow-2xl transition-all duration-300">
        <div className="flex flex-col md:flex-row items-start md:items-center space-y-6 md:space-y-0 md:space-x-8">
          {/* Profile Picture */}
          <div className="relative">
            {profile.profile_picture_filename ? (
              <div className="relative">
                <Image
                  src={getProfileImageUrl(profile.profile_picture_filename)!}
                  alt={`${profile.display_name}'s profile`}
                  width={96}
                  height={96}
                  className="rounded-full object-cover ring-4 ring-blue-100 shadow-lg"
                  placeholder="blur"
                  blurDataURL={BLUR_PLACEHOLDERS.profile}
                  quality={90}
                  priority
                />
                <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-green-500 rounded-full border-4 border-white"></div>
              </div>
            ) : (
              <div className="w-24 h-24 bg-gradient-to-br from-blue-100 to-purple-100 rounded-full flex items-center justify-center ring-4 ring-gray-100 shadow-lg">
                <User className="h-10 w-10 text-blue-600" />
                <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-green-500 rounded-full border-4 border-white"></div>
              </div>
            )}
            {profile.is_verified && (
              <div className="absolute -top-1 -right-1 bg-blue-500 text-white rounded-full p-1.5 shadow-lg">
                <Star className="h-4 w-4 fill-current" />
              </div>
            )}
          </div>

          {/* Profile Info */}
          <div className="flex-1">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between">
              <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent mb-3">
                  {profile.display_name}
                  {profile.is_verified && (
                    <Star className="inline h-6 w-6 text-blue-500 ml-3 fill-current" />
                  )}
                </h1>
                <p className="text-gray-600 mb-3 font-medium">@{profile.username}</p>
                
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
                <div className="flex flex-wrap gap-8 text-sm">
                  <div className="flex items-center bg-green-50 px-3 py-2 rounded-lg">
                    <Package className="h-5 w-5 mr-2 text-green-600" />
                    <span className="font-bold text-green-800">{profile.stats.total_sales}</span>
                    <span className="text-green-600 ml-1 font-medium">sales</span>
                  </div>
                  <div className="flex items-center bg-blue-50 px-3 py-2 rounded-lg">
                    <ShoppingBag className="h-5 w-5 mr-2 text-blue-600" />
                    <span className="font-bold text-blue-800">{profile.stats.total_purchases}</span>
                    <span className="text-blue-600 ml-1 font-medium">purchases</span>
                  </div>
                  {profile.stats.rating_count > 0 && (
                    <div className="flex items-center bg-yellow-50 px-3 py-2 rounded-lg">
                      <Star className="h-5 w-5 mr-2 text-yellow-500 fill-current" />
                      <span className="font-bold text-yellow-800">{profile.stats.rating_average.toFixed(1)}</span>
                      <span className="text-yellow-600 ml-1 font-medium">
                        ({profile.stats.rating_count} review{profile.stats.rating_count !== 1 ? 's' : ''})
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 mt-4 md:mt-0">
                {isOwnProfile ? (
                  <>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={onNavigateAgentDashboard}
                      className="flex items-center"
                    >
                      <Bot className="h-4 w-4 mr-2" />
                      AI Agent
                    </Button>
                    <Link href="/profile/edit">
                      <Button variant="outline" size="sm">
                        <Edit className="h-4 w-4 mr-2" />
                        Edit Profile
                      </Button>
                    </Link>
                  </>
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
      <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8 hover:shadow-2xl transition-all duration-300">
        <div className="flex items-center gap-3 mb-8">
          <div className="p-2 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg">
            <Package className="h-6 w-6 text-white" />
          </div>
          <h2 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Active Listings ({profile.active_items.length})
          </h2>
        </div>

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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {profile.active_items.map((item) => (
              <Link
                key={item.id}
                href={`/marketplace/${item.id}`}
                className="block group"
              >
                <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden hover:shadow-2xl hover:-translate-y-2 transition-all duration-300 group">
                  <div className="aspect-square relative bg-gradient-to-br from-gray-50 to-gray-100">
                    {getItemImageUrl(item) ? (
                      <Image
                        src={getItemImageUrl(item)!}
                        alt={item.name}
                        fill
                        className="object-cover group-hover:scale-110 transition-transform duration-500"
                        placeholder="blur"
                        blurDataURL={BLUR_PLACEHOLDERS.furniture}
                        quality={85}
                        sizes="(max-width: 768px) 50vw, 25vw"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Package className="h-16 w-16 text-gray-300" />
                      </div>
                    )}
                    <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-sm px-3 py-1 rounded-full">
                      <span className="text-xs font-medium text-gray-600">{item.views_count} views</span>
                    </div>
                  </div>
                  <div className="p-6">
                    <h3 className="font-bold text-gray-900 mb-3 text-lg line-clamp-1 group-hover:text-blue-600 transition-colors">
                      {item.name}
                    </h3>
                    <div className="flex items-center justify-between">
                      <p className="text-2xl font-bold bg-gradient-to-r from-green-600 to-blue-600 bg-clip-text text-transparent">
                        {formatPrice(item.starting_price)}
                      </p>
                      <span className="text-sm px-3 py-1 bg-blue-100 text-blue-800 rounded-full font-medium capitalize">
                        {item.furniture_type.replace('_', ' ')}
                      </span>
                    </div>
                  </div>
                </div>
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
      
    </div>
  )
}

// Buyer Notifications Section Component
interface BuyerNotificationsSectionProps {
  userId: string
}

function BuyerNotificationsSection({ userId: _userId }: BuyerNotificationsSectionProps) {
  const [processing, setProcessing] = useState<string>('')
  const [counterOffer, setCounterOffer] = useState<{negotiationId: number | null, isOpen: boolean, price: string}>({
    negotiationId: null,
    isOpen: false,
    price: ''
  })

  // Handler for accepting counter offers
  const handleAcceptCounter = async (negotiationId: number) => {
    setProcessing(`accept-${negotiationId}`)
    try {
      const headers = await apiClient.getAuthHeaders(true)
      const response = await fetch(`/api/negotiations/${negotiationId}/buyer-accept`, {
        method: 'POST',
        headers
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to accept counter offer')
      }

      // Refresh the negotiations list
      await mutate()
      
      // Show success message (you could add a toast here)
      console.log('Counter offer accepted successfully!')
    } catch (error) {
      console.error('Failed to accept counter offer:', error)
      alert((error as Error).message || 'Failed to accept counter offer')
    } finally {
      setProcessing('')
    }
  }

  // Handler for submitting counter offers
  const handleSubmitCounter = async () => {
    if (!counterOffer.negotiationId || !counterOffer.price) return
    
    setProcessing(`counter-${counterOffer.negotiationId}`)
    try {
      const headers = await apiClient.getAuthHeaders(true)
      const response = await fetch(`/api/negotiations/${counterOffer.negotiationId}/counter`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          price: parseFloat(counterOffer.price),
          message: 'Counter offer from buyer'
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to submit counter offer')
      }

      // Refresh the negotiations list
      await mutate()
      
      // Close dialog and reset
      setCounterOffer({ negotiationId: null, isOpen: false, price: '' })
      
      console.log('Counter offer submitted successfully!')
    } catch (error) {
      console.error('Failed to submit counter offer:', error)
      alert((error as Error).message || 'Failed to submit counter offer')
    } finally {
      setProcessing('')
    }
  }

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
        <div className="p-8 text-center">
          <p className="text-red-600">Error loading offers. Please refresh the page.</p>
        </div>
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
        
        <div className="p-8 text-center border rounded-lg">
          <ShoppingBag className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No offers yet</h3>
          <p className="text-gray-500 mb-4">
            Start browsing the marketplace to make your first offer!
          </p>
          <Link href="/marketplace">
            <Button>Browse Marketplace</Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto p-6 mt-8">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <ShoppingBag className="h-6 w-6 text-gray-700" />
          <h2 className="text-xl font-semibold text-gray-900">My Offers & Negotiations</h2>
          <span className="text-sm text-gray-500">
            ({myOffers.negotiations.length} total)
          </span>
        </div>
        
        {/* Quick Actions Button for Buyers */}
        <QuickActionsOverlay 
          trigger={
            <Button variant="outline" size="sm" className="flex items-center gap-2">
              <Bot className="h-4 w-4" />
              Quick Actions
            </Button>
          }
        />
      </div>

      <div className="space-y-4">
        {myOffers.negotiations.map((negotiation: NegotiationWithItems) => (
          <div key={negotiation.id} className="p-6 border rounded-lg hover:shadow-md transition-all">
            <div className="flex items-start gap-4">
              {/* Item Image */}
              <div className="w-20 h-20 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                {negotiation.items?.image_filename ? (
                  <Image
                    src={`/api/images/${negotiation.items?.image_filename}`}
                    alt={negotiation.items?.name || 'Item'}
                    width={80}
                    height={80}
                    className="w-full h-full object-cover"
                    placeholder="blur"
                    blurDataURL={BLUR_PLACEHOLDERS.furniture}
                    quality={80}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Package className="h-8 w-8 text-gray-400" />
                  </div>
                )}
              </div>

              {/* Offer Details */}
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-gray-900 text-lg mb-1">
                  {negotiation.items?.name}
                </h3>
                <p className="text-sm text-gray-600 mb-2">
                  Seller: @{negotiation.profiles?.username} | Listed: ${negotiation.items?.starting_price}
                </p>
                
                {/* Status and Latest Offer Info */}
                <div className="flex items-center gap-3 mb-3">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    negotiation.display_status === 'counter_received' ? 'bg-orange-100 text-orange-800' :
                    negotiation.display_status === 'accepted' ? 'bg-green-100 text-green-800' :
                    negotiation.display_status === 'declined' ? 'bg-red-100 text-red-800' :
                    'bg-blue-100 text-blue-800'
                  }`}>
                    {negotiation.display_status === 'counter_received' ? '🔄 Counter Received' :
                     negotiation.display_status === 'accepted' ? '✅ Accepted' :
                     negotiation.display_status === 'declined' ? '❌ Declined' :
                     '⏳ Awaiting Response'}
                  </span>
                  
                  {negotiation.latest_offer && (
                    <span className="text-sm font-semibold text-gray-900">
                      Latest: ${negotiation.latest_offer.price}
                    </span>
                  )}
                  
                  {negotiation.needs_attention && (
                    <span className="px-2 py-1 bg-red-100 text-red-800 rounded-full text-xs font-medium animate-pulse">
                      🔔 Action Needed
                    </span>
                  )}
                </div>

                {/* Offer History Summary */}
                {negotiation.latest_offer && (
                  <p className="text-xs text-gray-500 mb-3">
                    {negotiation.latest_offer.offer_type === 'seller' && negotiation.latest_offer.is_counter_offer
                      ? `Seller countered with $${negotiation.latest_offer.price}`
                      : negotiation.latest_offer.offer_type === 'buyer'
                      ? `Your offer: $${negotiation.latest_offer.price}`
                      : `Latest offer: $${negotiation.latest_offer.price}`
                    } • {negotiation.offer_count} round{negotiation.offer_count !== 1 ? 's' : ''}
                  </p>
                )}

                <div className="flex gap-3">
                  <Link href={`/marketplace/${negotiation.items?.id}`}>
                    <Button size="sm" variant="outline">View Item</Button>
                  </Link>
                  
                  {/* Quick Action Buttons for Counter Offers */}
                  {negotiation.display_status === 'counter_received' && (
                    <>
                      <Button 
                        size="sm" 
                        className="bg-green-600 hover:bg-green-700 text-white"
                        disabled={processing === `accept-${negotiation.id}`}
                        onClick={() => handleAcceptCounter(negotiation.id)}
                      >
                        <CheckCircle className="w-3 h-3 mr-1" />
                        {processing === `accept-${negotiation.id}` ? 'Accepting...' : `Accept $${negotiation.latest_offer?.price}`}
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => {
                          setCounterOffer({
                            negotiationId: negotiation.id,
                            isOpen: true,
                            price: ''
                          })
                        }}
                      >
                        <DollarSign className="w-3 h-3 mr-1" />
                        Counter
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
      
      {/* Counter Offer Dialog */}
      {counterOffer.isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">Make Counter Offer</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Your Counter Offer Amount
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">$</span>
                  <input
                    type="number"
                    value={counterOffer.price}
                    onChange={(e) => setCounterOffer(prev => ({ ...prev, price: e.target.value }))}
                    className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter amount"
                    min="0"
                    step="0.01"
                  />
                </div>
              </div>
              
              <div className="flex gap-3 pt-2">
                <Button
                  onClick={handleSubmitCounter}
                  disabled={!counterOffer.price || processing.includes('counter')}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                >
                  {processing.includes('counter') ? 'Submitting...' : 'Submit Counter'}
                </Button>
                <Button
                  onClick={() => setCounterOffer({ negotiationId: null, isOpen: false, price: '' })}
                  variant="outline"
                  className="flex-1"
                >
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

