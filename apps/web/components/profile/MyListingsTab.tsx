'use client'

import { useMemo } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { Package } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { BLUR_PLACEHOLDERS } from '@/lib/blur-data'
import { ProfileData, MyListingsTabProps } from '@/lib/types/profile'
import { getItemImageUrl, formatPrice, formatTimeAgo } from '@/lib/utils/profile'

export default function MyListingsTab({ profile, isOwnProfile = false }: MyListingsTabProps) {

  if (profile.active_items.length === 0) {
    return (
      <div className="text-center py-12">
        <Package className="mx-auto h-12 w-12 text-slate-400 mb-4" />
        <h3 className="text-lg font-medium text-slate-900 mb-2">No active listings</h3>
        <p className="text-slate-500 mb-6">
          {isOwnProfile 
            ? "You haven't listed any items yet." 
            : `${profile.display_name} doesn't have any active listings.`}
        </p>
        {isOwnProfile && (
          <Link href="/">
            <Button>List Your First Item</Button>
          </Link>
        )}
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {profile.active_items.map((item) => (
        <Link
          key={item.id}
          href={`/marketplace/${item.id}`}
          className="block group"
        >
          <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden hover:shadow-md hover:border-slate-300 transition-all duration-200 group">
            <div className="aspect-square relative bg-slate-50">
              {getItemImageUrl(item) ? (
                <Image
                  src={getItemImageUrl(item)!}
                  alt={item.name}
                  fill
                  className="object-cover group-hover:scale-105 transition-transform duration-300"
                  placeholder="blur"
                  blurDataURL={BLUR_PLACEHOLDERS.furniture}
                  quality={85}
                  sizes="(max-width: 768px) 50vw, 25vw"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Package className="h-12 w-12 text-slate-300" />
                </div>
              )}
              
              {/* Overlay badges */}
              <div className="absolute top-3 right-3 flex flex-col gap-2">
                <div className="bg-white/90 backdrop-blur-sm px-2 py-1 rounded-md">
                  <span className="text-xs font-medium text-slate-600">{item.views_count} views</span>
                </div>
                {item.highest_buyer_offer && (
                  <div className="bg-green-500/90 backdrop-blur-sm px-2 py-1 rounded-md">
                    <span className="text-xs font-medium text-white">
                      Best: {formatPrice(item.highest_buyer_offer)}
                    </span>
                  </div>
                )}
              </div>
            </div>
            
            <div className="p-4">
              <h3 className="font-semibold text-slate-900 mb-2 text-sm line-clamp-1 group-hover:text-blue-600 transition-colors">
                {item.name}
              </h3>
              
              <div className="flex items-center justify-between">
                <p className="text-lg font-bold text-blue-600">
                  {formatPrice(item.starting_price)}
                </p>
                <span className="text-xs px-2 py-1 bg-slate-100 text-slate-700 rounded-full font-medium capitalize">
                  {item.furniture_type.replace('_', ' ')}
                </span>
              </div>
              
              {item.condition && (
                <div className="mt-2">
                  <span className="text-xs text-slate-500 capitalize">
                    Condition: {item.condition}
                  </span>
                </div>
              )}
            </div>
          </div>
        </Link>
      ))}
    </div>
  )
}