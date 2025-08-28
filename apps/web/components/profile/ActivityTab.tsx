'use client'

import { Bell, AlertCircle, CheckCircle, Clock, User } from 'lucide-react'
import { SellerNotifications } from '../seller/SellerNotifications'

interface ActivityTabProps {
  userId: string
}

export default function ActivityTab({ userId }: ActivityTabProps) {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-blue-100 rounded-lg">
          <Bell className="h-5 w-5 text-blue-600" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-slate-900">Recent Activity</h3>
          <p className="text-sm text-slate-600">Stay updated on your offers and listings</p>
        </div>
      </div>

      {/* Notifications Sections */}
      <div className="space-y-6">
        {/* Seller Notifications - Action required items */}
        <div>
          <h4 className="text-sm font-medium text-slate-700 mb-3 flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-orange-500" />
            Action Required
          </h4>
          <SellerNotifications userId={userId} />
        </div>
        
        
        {/* Future: Additional activity types can be added here */}
        <div className="text-center py-8 border border-dashed border-slate-200 rounded-lg">
          <Clock className="mx-auto h-8 w-8 text-slate-400 mb-2" />
          <p className="text-sm text-slate-500">More activity notifications will appear here</p>
        </div>
      </div>
    </div>
  )
}