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
}

export default function ProfileView({ username, isOwnProfile = false, onNavigateHome, onNavigateMarketplace }: ProfileViewProps) {
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
              <Button 
                variant="ghost"
                onClick={onNavigateHome}
                className="nav-button nav-button-ghost"
              >
                <Home className="h-4 w-4 mr-2" />
                Home
              </Button>
              <Button 
                variant="ghost"
                onClick={onNavigateMarketplace}
                className="nav-button nav-button-ghost"
              >
                <Store className="h-4 w-4 mr-2" />
                Marketplace
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
          color: black;
          letter-spacing: -0.025em;
          font-family: 'Inter', -apple-system, sans-serif;
        }

        .nav-buttons {
          display: flex;
          align-items: center;
          gap: 1rem;
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
  const [processingNegotiation, setProcessingNegotiation] = useState<number | null>(null)
  
  const { data: negotiationsData, error, mutate } = useSWR(
    `/api/buyer/negotiations`,
    async (url) => {
      const headers = await apiClient.getAuthHeaders()
      const response = await fetch(url, { headers })
      if (!response.ok) throw new Error('Failed to fetch')
      return response.json()
    },
    { refreshInterval: 30000 } // Refresh every 30 seconds
  )

  const handleAcceptCounter = async (negotiationId: number) => {
    setProcessingNegotiation(negotiationId)
    try {
      await apiClient.acceptNegotiation(negotiationId)
      await mutate() // Refresh the data
    } catch (error) {
      console.error('Failed to accept counter offer:', error)
      alert('Failed to accept counter offer. Please try again.')
    } finally {
      setProcessingNegotiation(null)
    }
  }

  const handleMakeNewOffer = (itemId: number) => {
    // Navigate to the item page where they can make a new offer
    window.location.href = `/marketplace/${itemId}`
  }

  const handleUpdateOffer = (itemId: number) => {
    // Navigate to the item page where they can update their offer
    window.location.href = `/marketplace/${itemId}`
  }

  const handleArrangePickup = (negotiationId: number) => {
    // For now, just show an alert - this could be enhanced later
    alert('Pickup arrangement feature coming soon! Please contact the seller directly.')
  }

  const getNegotiationItemImageUrl = (filename?: string) => {
    if (!filename) return null
    const supabase = createClient()
    const { data } = supabase.storage.from('furniture-images').getPublicUrl(filename)
    return data.publicUrl
  }

  const negotiations: Negotiation[] = negotiationsData?.negotiations || []
  const pendingCount = negotiations.filter(n => n.needs_attention).length

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'counter_received':
        return <AlertCircle className="h-5 w-5 text-orange-500" />
      case 'awaiting_response':
        return <Clock className="h-5 w-5 text-blue-500" />
      case 'accepted':
        return <CheckCircle className="h-5 w-5 text-green-500" />
      case 'declined':
        return <XCircle className="h-5 w-5 text-red-500" />
      default:
        return <Bell className="h-5 w-5 text-gray-500" />
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'counter_received':
        return 'Counter Offer Received'
      case 'awaiting_response':
        return 'Awaiting Seller Response'
      case 'accepted':
        return 'Offer Accepted'
      case 'declined':
        return 'Offer Declined'
      default:
        return 'Unknown Status'
    }
  }

  const formatTimeAgo = (hours: number) => {
    if (hours < 1) return 'Just now'
    if (hours < 24) return `${hours}h ago`
    const days = Math.floor(hours / 24)
    return `${days}d ago`
  }

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(price)
  }

  if (negotiations.length === 0) {
    return (
      <div className="max-w-4xl mx-auto p-6 mt-8">
        <div className="flex items-center gap-3 mb-6">
          <ShoppingBag className="h-6 w-6 text-gray-700" />
          <h2 className="text-xl font-semibold text-gray-900">My Offers & Negotiations</h2>
        </div>
        
        <Card className="p-8 text-center">
          <ShoppingBag className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No active offers</h3>
          <p className="text-gray-500">
            You haven't made any offers yet. Browse the marketplace to start negotiating!
          </p>
          <Link href="/marketplace" className="inline-block mt-4">
            <Button>Browse Marketplace</Button>
          </Link>
        </Card>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto p-6 mt-8">
      <div className="flex items-center gap-3 mb-6">
        <ShoppingBag className="h-6 w-6 text-gray-700" />
        <h2 className="text-xl font-semibold text-gray-900">My Offers & Negotiations</h2>
        {pendingCount > 0 && (
          <span className="bg-orange-100 text-orange-800 text-xs font-medium px-2.5 py-0.5 rounded-full">
            {pendingCount} need{pendingCount === 1 ? 's' : ''} attention
          </span>
        )}
      </div>

      <div className="space-y-3">
        {negotiations.map((negotiation) => (
          <Card key={negotiation.id} className={`p-4 transition-all hover:shadow-lg border-l-4 ${
            negotiation.needs_attention 
              ? 'border-l-orange-400 bg-orange-50/30' 
              : 'border-l-gray-200'
          }`}>
            <div className="flex items-start gap-4">
              {/* Item Image */}
              <div className="w-20 h-20 bg-gray-100 rounded-xl overflow-hidden flex-shrink-0 shadow-sm">
                {negotiation.items.image_filename ? (
                  <Image
                    src={getNegotiationItemImageUrl(negotiation.items.image_filename) || '/placeholder-image.jpg'}
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

              {/* Negotiation Details */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between">
                  <div className="min-w-0 flex-1">
                    <h3 className="font-semibold text-gray-900 truncate text-lg">
                      {negotiation.items.name}
                    </h3>
                    <p className="text-sm text-gray-600 mt-1">
                      Seller: <span className="font-medium">@{negotiation.profiles.username}</span>
                    </p>
                    <div className="flex items-center gap-2 mt-2">
                      {getStatusIcon(negotiation.display_status)}
                      <span className={`text-sm font-medium ${
                        negotiation.needs_attention ? 'text-orange-700' : 'text-gray-700'
                      }`}>
                        {getStatusText(negotiation.display_status)}
                      </span>
                      {negotiation.needs_attention && (
                        <span className="text-xs bg-orange-100 text-orange-800 px-2 py-1 rounded-full font-medium">
                          Action needed
                        </span>
                      )}
                    </div>
                  </div>
                  
                  <div className="text-right ml-4">
                    <p className="text-sm text-gray-500">
                      {formatTimeAgo(negotiation.time_since_last_update)}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      {negotiation.offer_count} offer{negotiation.offer_count !== 1 ? 's' : ''}
                    </p>
                  </div>
                </div>

                {/* Latest Offer Info */}
                {negotiation.latest_offer && (
                  <div className="mt-3 p-3 bg-white border border-gray-200 rounded-lg">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-gray-700">Latest offer:</span>
                      <span className="text-lg font-bold text-gray-900">
                        {formatPrice(negotiation.latest_offer.price)}
                        {negotiation.latest_offer.is_counter_offer && (
                          <span className="text-sm font-normal text-orange-600 ml-2">(Counter)</span>
                        )}
                      </span>
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex flex-wrap gap-2 mt-4 pt-3 border-t border-gray-100">
                  {negotiation.display_status === 'counter_received' && (
                    <>
                      <Button 
                        size="sm" 
                        className="bg-green-600 hover:bg-green-700 text-white font-medium"
                        onClick={() => handleAcceptCounter(negotiation.id)}
                        disabled={processingNegotiation === negotiation.id}
                      >
                        {processingNegotiation === negotiation.id ? 'Accepting...' : '✓ Accept Counter'}
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline"
                        className="border-blue-200 text-blue-700 hover:bg-blue-50"
                        onClick={() => handleMakeNewOffer(negotiation.items.id)}
                      >
                        💰 Make New Offer
                      </Button>
                    </>
                  )}
                  {negotiation.display_status === 'awaiting_response' && (
                    <Button 
                      size="sm" 
                      variant="outline"
                      className="border-blue-200 text-blue-700 hover:bg-blue-50"
                      onClick={() => handleUpdateOffer(negotiation.items.id)}
                    >
                      ✏️ Update Offer
                    </Button>
                  )}
                  {negotiation.display_status === 'accepted' && (
                    <Button 
                      size="sm" 
                      className="bg-blue-600 hover:bg-blue-700 text-white font-medium"
                      onClick={() => handleArrangePickup(negotiation.id)}
                    >
                      📅 Arrange Pickup
                    </Button>
                  )}
                  <Link href={`/marketplace/${negotiation.items.id}`}>
                    <Button size="sm" variant="ghost" className="text-gray-600 hover:text-gray-800">
                      👁️ View Item
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}