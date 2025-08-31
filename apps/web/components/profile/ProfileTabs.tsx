'use client'

import { useState, lazy, Suspense, memo } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card } from '@/components/ui/card'
import { Package, ShoppingBag, Bell } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import MyListingsTab from './MyListingsTab'
import { ProfileData } from '@/lib/types/profile'

// Lazy load heavy tab components
const MyOffersTab = lazy(() => import('./MyOffersTab'))
const ActivityTab = lazy(() => import('./ActivityTab'))

interface ProfileTabsProps {
  profile: ProfileData
  isOwnProfile?: boolean
  userId: string
  onOfferConfirmed?: () => void
  initialOfferItemId?: number
}

// Tab loading skeleton component
const TabLoadingSkeleton = memo(() => (
  <div className="space-y-4">
    <Skeleton className="h-6 w-32" />
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {[1, 2, 3].map(i => (
        <Skeleton key={i} className="h-48 rounded-lg" />
      ))}
    </div>
  </div>
))

TabLoadingSkeleton.displayName = 'TabLoadingSkeleton'

const ProfileTabs = memo(function ProfileTabs({ 
  profile, 
  isOwnProfile = false, 
  userId,
  onOfferConfirmed,
  initialOfferItemId
}: ProfileTabsProps) {
  const [activeTab, setActiveTab] = useState('listings')
  
  return (
    <Card className="bg-white rounded-xl shadow-md border border-slate-200/60 overflow-hidden">
      <Tabs defaultValue="listings" className="w-full" onValueChange={setActiveTab}>
        <div className="border-b border-slate-200">
          <TabsList className="grid w-full grid-cols-3 h-14 bg-transparent rounded-none p-0">
            <TabsTrigger 
              value="listings" 
              className="flex items-center gap-2 h-full border-b-2 border-transparent data-[state=active]:border-blue-500 data-[state=active]:bg-blue-50/50 rounded-none"
            >
              <Package className="h-4 w-4" />
              <span className="font-medium">My Listings</span>
              <span className="text-xs bg-slate-200 text-slate-700 px-2 py-0.5 rounded-full">
                {profile.active_items?.length || 0}
              </span>
            </TabsTrigger>
            
            {isOwnProfile && (
              <TabsTrigger 
                value="offers" 
                className="flex items-center gap-2 h-full border-b-2 border-transparent data-[state=active]:border-blue-500 data-[state=active]:bg-blue-50/50 rounded-none"
              >
                <ShoppingBag className="h-4 w-4" />
                <span className="font-medium">My Offers</span>
              </TabsTrigger>
            )}
            
            {isOwnProfile && (
              <TabsTrigger 
                value="activity" 
                className="flex items-center gap-2 h-full border-b-2 border-transparent data-[state=active]:border-blue-500 data-[state=active]:bg-blue-50/50 rounded-none"
              >
                <Bell className="h-4 w-4" />
                <span className="font-medium">Activity</span>
              </TabsTrigger>
            )}
          </TabsList>
        </div>

        <div className="p-6">
          <TabsContent value="listings" className="mt-0">
            <MyListingsTab 
              profile={profile} 
              isOwnProfile={isOwnProfile}
            />
          </TabsContent>
          
          {isOwnProfile && (
            <TabsContent value="offers" className="mt-0">
              <Suspense fallback={<TabLoadingSkeleton />}>
                {activeTab === 'offers' && (
                  <MyOffersTab 
                    userId={userId}
                    onOfferConfirmed={onOfferConfirmed}
                    initialOfferItemId={initialOfferItemId}
                  />
                )}
              </Suspense>
            </TabsContent>
          )}
          
          {isOwnProfile && (
            <TabsContent value="activity" className="mt-0">
              <Suspense fallback={<TabLoadingSkeleton />}>
                {activeTab === 'activity' && (
                  <ActivityTab userId={userId} />
                )}
              </Suspense>
            </TabsContent>
          )}
        </div>
      </Tabs>
    </Card>
  )
})

export default ProfileTabs