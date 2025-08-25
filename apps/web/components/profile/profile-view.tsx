'use client'

import { useState, useEffect, useMemo } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { User, MapPin, Calendar, Star, Package, ShoppingBag, Edit, Bot } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
import { createClient } from '@/src/lib/supabase'
import { getRotatingGreeting } from '@/lib/greetings'
import { BLUR_PLACEHOLDERS } from '@/src/lib/blur-data'
import { BuyerNotifications } from '../buyer/BuyerNotifications'
import BuyerOfferManager from '../buyer/BuyerOfferManager'
import OfferConfirmationPopup from '../buyer/OfferConfirmationPopup'


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
  const [showOfferConfirmation, setShowOfferConfirmation] = useState(false)
  const [lastOfferDetails, setLastOfferDetails] = useState<any>(null)
  const [initialOfferItemId, setInitialOfferItemId] = useState<number | null>(null)

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

  // Check for URL parameter to open offer form
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search)
      const makeOfferParam = urlParams.get('makeOffer')
      if (makeOfferParam) {
        const itemId = parseInt(makeOfferParam)
        if (!isNaN(itemId)) {
          setInitialOfferItemId(itemId)
          // Clear the URL parameter
          const newUrl = window.location.pathname
          window.history.replaceState({}, '', newUrl)
        }
      }
    }
  }, [])

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
        <div className="flex items-center space-x-6 mb-8">
          <Skeleton className="h-24 w-24 rounded-full" />
          <div className="space-y-3">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-4 w-64" />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <Skeleton key={i} className="h-64" />
          ))}
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
      <header className="fixed top-0 left-0 right-0 z-50 backdrop-blur-md bg-white/80 border-b border-gray-200 shadow-sm">
        <div className="px-4 md:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold text-gray-900 tracking-tight font-inter">
                SnapNest
              </span>
            </div>
            
            <div className="flex items-center gap-4">
              {isOwnProfile && profile && (
                <span className="hidden md:block text-sm font-medium text-blue-600">
                  {getRotatingGreeting(profile.id)}, {profile.display_name || profile.username}!
                </span>
              )}
              <Button 
                variant="ghost"
                onClick={onNavigateMarketplace}
                className="font-semibold hover:bg-blue-50 hover:text-blue-600 transition-colors"
              >
                Browse
              </Button>
              <Button 
                variant="ghost"
                onClick={onCreateListing}
                className="font-semibold hover:bg-blue-50 hover:text-blue-600 transition-colors"
              >
                Sell
              </Button>
              <Button 
                variant="ghost"
                onClick={onSignOut}
                className="font-semibold hover:bg-blue-50 hover:text-blue-600 transition-colors"
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
            <Avatar className="h-24 w-24 ring-4 ring-blue-100 shadow-lg">
              <AvatarImage 
                src={getProfileImageUrl(profile.profile_picture_filename) || undefined} 
                alt={`${profile.display_name}'s profile`}
              />
              <AvatarFallback className="bg-gradient-to-br from-blue-100 to-purple-100">
                <User className="h-10 w-10 text-blue-600" />
              </AvatarFallback>
            </Avatar>
            <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-green-500 rounded-full border-4 border-white"></div>
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
                <div className="flex items-center flex-wrap gap-4">
                  <Badge variant="secondary" className="bg-green-50 text-green-700 hover:bg-green-100">
                    <Package className="mr-2 h-4 w-4" />
                    <span className="font-bold">{profile.stats.total_sales}</span>
                    <span className="ml-1 font-medium">sales</span>
                  </Badge>
                  <Separator orientation="vertical" className="h-6" />
                  <Badge variant="secondary" className="bg-blue-50 text-blue-700 hover:bg-blue-100">
                    <ShoppingBag className="mr-2 h-4 w-4" />
                    <span className="font-bold">{profile.stats.total_purchases}</span>
                    <span className="ml-1 font-medium">purchases</span>
                  </Badge>
                  {profile.stats.rating_count > 0 && (
                    <>
                      <Separator orientation="vertical" className="h-6" />
                      <Badge variant="secondary" className="bg-yellow-50 text-yellow-700 hover:bg-yellow-100">
                        <Star className="mr-2 h-4 w-4 fill-current" />
                        <span className="font-bold">{profile.stats.rating_average.toFixed(1)}</span>
                        <span className="ml-1 font-medium">
                          ({profile.stats.rating_count} review{profile.stats.rating_count !== 1 ? 's' : ''})
                        </span>
                      </Badge>
                    </>
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

      {/* Buyer Offer Management Section - Only for own profile */}
      {isOwnProfile && (
        <div className="mb-8">
          <BuyerOfferManager 
            userId={profile.id} 
            onOfferConfirmed={() => setShowOfferConfirmation(true)}
            initialOfferItemId={initialOfferItemId || undefined}
          />
        </div>
      )}

      {/* Buyer Notifications Section - Only for own profile */}
      {isOwnProfile && (
        <div className="mb-8">
          <BuyerNotifications userId={profile.id} />
        </div>
      )}
      
      </div>

      {/* Offer Confirmation Popup */}
      <OfferConfirmationPopup
        isVisible={showOfferConfirmation}
        onClose={() => setShowOfferConfirmation(false)}
        offerDetails={lastOfferDetails}
      />

      
    </div>
  )
}
