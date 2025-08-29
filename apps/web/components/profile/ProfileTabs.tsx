'use client'

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card } from '@/components/ui/card'
import { Package, ShoppingBag, Bell } from 'lucide-react'
import MyListingsTab from './MyListingsTab'
import MyOffersTab from './MyOffersTab'
import ActivityTab from './ActivityTab'
import { ProfileData } from '@/lib/types/profile'

interface ProfileTabsProps {
  profile: ProfileData
  isOwnProfile?: boolean
  userId: string
  onOfferConfirmed?: () => void
  initialOfferItemId?: number
}

export default function ProfileTabs({ 
  profile, 
  isOwnProfile = false, 
  userId,
  onOfferConfirmed,
  initialOfferItemId
}: ProfileTabsProps) {
  return (
    <Card className="bg-white rounded-xl shadow-md border border-slate-200/60 overflow-hidden">
      <Tabs defaultValue="listings" className="w-full">
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
              <MyOffersTab 
                userId={userId}
                onOfferConfirmed={onOfferConfirmed}
                initialOfferItemId={initialOfferItemId}
              />
            </TabsContent>
          )}
          
          {isOwnProfile && (
            <TabsContent value="activity" className="mt-0">
              <ActivityTab userId={userId} />
            </TabsContent>
          )}
        </div>
      </Tabs>
    </Card>
  )
}