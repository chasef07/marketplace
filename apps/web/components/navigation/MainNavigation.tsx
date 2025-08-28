'use client'

import { Button } from "@/components/ui/button"
import { getRotatingGreeting } from "@/lib/greetings"
import { User } from "@/lib/types/user"

interface MainNavigationProps {
  user: User | null
  onNavigateHome?: () => void
  onBrowseItems?: () => void
  onCreateListing?: () => void
  onViewProfile?: () => void
  onSignIn?: () => void
  onSignOut?: () => void
  currentPage?: 'home' | 'browse' | 'marketplace' | 'profile'
}

export function MainNavigation({
  user,
  onNavigateHome,
  onBrowseItems,
  onCreateListing,
  onViewProfile,
  onSignIn,
  onSignOut,
  currentPage = 'home'
}: MainNavigationProps) {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-200">
      <div className="px-6 py-4">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <div className="text-2xl font-bold text-slate-800">Marketplace</div>
          
          {/* Navigation Buttons */}
          <div className="flex items-center space-x-4">
            {user ? (
              <>
                <span className="text-blue-600 text-sm font-medium">
                  {getRotatingGreeting(user.id)}, {user.username}!
                </span>
                {currentPage !== 'home' && onNavigateHome && (
                  <Button variant="ghost" onClick={onNavigateHome}>
                    Home
                  </Button>
                )}
                {currentPage !== 'browse' && currentPage !== 'marketplace' && onBrowseItems && (
                  <Button variant="ghost" onClick={onBrowseItems}>
                    Browse
                  </Button>
                )}
                {currentPage !== 'home' && onCreateListing && (
                  <Button variant="ghost" onClick={onCreateListing}>
                    Sell
                  </Button>
                )}
                {currentPage !== 'profile' && onViewProfile && (
                  <Button variant="ghost" onClick={onViewProfile}>
                    Profile
                  </Button>
                )}
                {onSignOut && (
                  <Button variant="ghost" onClick={onSignOut}>
                    Sign Out
                  </Button>
                )}
              </>
            ) : (
              <>
                {currentPage !== 'browse' && currentPage !== 'marketplace' && onBrowseItems && (
                  <Button variant="ghost" onClick={onBrowseItems}>
                    Browse
                  </Button>
                )}
                {currentPage !== 'home' && onCreateListing && (
                  <Button variant="ghost" onClick={onCreateListing}>
                    Sell
                  </Button>
                )}
                {onSignIn && (
                  <Button onClick={onSignIn}>
                    Sign In
                  </Button>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}