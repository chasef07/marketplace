'use client'

import { useMemo } from 'react'
import Link from 'next/link'
import { MapPin, Calendar, Star, Package, ShoppingBag, Edit } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { Separator } from '@/components/ui/separator'
import { ProfileHeaderProps } from '@/lib/types/profile'
import { 
  getProfileImageUrl, 
  formatMemberSince,
  getInitials 
} from '@/lib/utils/profile'

export default function ProfileHeader({ 
  profile, 
  isOwnProfile = false
}: ProfileHeaderProps) {
  const profileImageUrl = useMemo(() => getProfileImageUrl(profile.profile_picture_filename), [profile.profile_picture_filename])
  const memberSinceFormatted = useMemo(() => formatMemberSince(profile.member_since), [profile.member_since])
  const initials = useMemo(() => getInitials(profile.display_name), [profile.display_name])

  const locationString = useMemo(() => {
    return [profile.location.city, profile.location.state].filter(Boolean).join(', ')
  }, [profile.location.city, profile.location.state])

  return (
    <Card className="bg-white rounded-xl shadow-md border border-slate-200/60 p-6 hover:shadow-lg transition-shadow duration-300">
      <div className="flex flex-col md:flex-row items-start md:items-center space-y-6 md:space-y-0 md:space-x-6">
        {/* Profile Picture */}
        <div className="relative flex-shrink-0">
          <Avatar className="h-20 w-20 ring-3 ring-blue-100 shadow-md">
            <AvatarImage 
              src={profileImageUrl || undefined} 
              alt={`${profile.display_name}'s profile`}
            />
            <AvatarFallback className="bg-gradient-to-br from-slate-100 to-blue-100 text-slate-600 font-semibold text-lg">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-green-500 rounded-full border-3 border-white"></div>
          {profile.is_verified && (
            <div className="absolute -top-1 -right-1 bg-blue-500 text-white rounded-full p-1 shadow-md">
              <Star className="h-3 w-3 fill-current" />
            </div>
          )}
        </div>

        {/* Profile Info */}
        <div className="flex-1 min-w-0">
          <div className="flex flex-col md:flex-row md:items-start md:justify-between">
            <div className="space-y-3">
              <div>
                <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                  {profile.display_name}
                  {profile.is_verified && (
                    <Star className="h-5 w-5 text-blue-500 fill-current" />
                  )}
                </h1>
                <p className="text-slate-600 font-medium">@{profile.username}</p>
              </div>
              
              {/* Location & Member Info */}
              <div className="flex flex-wrap items-center gap-4 text-sm text-slate-500">
                {locationString && (
                  <div className="flex items-center">
                    <MapPin className="h-4 w-4 mr-1" />
                    <span>{locationString}</span>
                  </div>
                )}
                <div className="flex items-center">
                  <Calendar className="h-4 w-4 mr-1" />
                  <span>Member since {memberSinceFormatted}</span>
                </div>
              </div>

              {/* Bio */}
              {profile.bio && (
                <p className="text-slate-700 text-sm leading-relaxed">{profile.bio}</p>
              )}

              {/* Stats */}
              <div className="flex items-center flex-wrap gap-3">
                <Badge variant="secondary" className="bg-green-50 text-green-700 hover:bg-green-100">
                  <Package className="mr-1 h-3 w-3" />
                  <span className="font-semibold">{profile.stats.total_sales}</span>
                  <span className="ml-1">sales</span>
                </Badge>
                <Separator orientation="vertical" className="h-4" />
                <Badge variant="secondary" className="bg-blue-50 text-blue-700 hover:bg-blue-100">
                  <ShoppingBag className="mr-1 h-3 w-3" />
                  <span className="font-semibold">{profile.stats.total_purchases}</span>
                  <span className="ml-1">purchases</span>
                </Badge>
                {profile.stats.rating_count > 0 && (
                  <>
                    <Separator orientation="vertical" className="h-4" />
                    <Badge variant="secondary" className="bg-amber-50 text-amber-700 hover:bg-amber-100">
                      <Star className="mr-1 h-3 w-3 fill-current" />
                      <span className="font-semibold">{profile.stats.rating_average.toFixed(1)}</span>
                      <span className="ml-1">
                        ({profile.stats.rating_count} review{profile.stats.rating_count !== 1 ? 's' : ''})
                      </span>
                    </Badge>
                  </>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2 mt-4 md:mt-0 flex-shrink-0">
              {isOwnProfile ? (
                <>
                  <Link href="/profile/edit">
                    <Button variant="outline" size="sm">
                      <Edit className="h-4 w-4 mr-1" />
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
    </Card>
  )
}