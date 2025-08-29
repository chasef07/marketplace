'use client'

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { Menu, X } from "lucide-react"
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
  currentPage?: 'home' | 'browse' | 'profile'
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
  const [isOpen, setIsOpen] = useState(false)

  const handleMenuClick = (callback?: () => void) => {
    setIsOpen(false)
    callback?.()
  }

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-md border-b border-slate-200">
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <div className="text-xl sm:text-2xl font-bold text-slate-800">Marketplace</div>
          
          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-3 lg:space-x-4">
            {user ? (
              <>
                <span className="text-blue-600 text-sm font-medium hidden lg:block truncate max-w-32">
                  {getRotatingGreeting(user.id)}, {user.username}!
                </span>
                <span className="text-blue-600 text-sm font-medium lg:hidden">
                  Hi, {user.username}!
                </span>
                {currentPage !== 'home' && onNavigateHome && (
                  <Button variant="ghost" size="sm" onClick={onNavigateHome}>
                    Home
                  </Button>
                )}
                {currentPage !== 'browse' && onBrowseItems && (
                  <Button variant="ghost" size="sm" onClick={onBrowseItems}>
                    Browse
                  </Button>
                )}
                {currentPage !== 'home' && onCreateListing && (
                  <Button variant="ghost" size="sm" onClick={onCreateListing}>
                    Sell
                  </Button>
                )}
                {currentPage !== 'profile' && onViewProfile && (
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={onViewProfile}
                    disabled={!user?.username}
                    className={!user?.username ? 'opacity-50 cursor-not-allowed' : ''}
                    title={!user?.username ? 'Loading profile...' : `View ${user.username}'s profile`}
                  >
                    Profile
                  </Button>
                )}
                {onSignOut && (
                  <Button variant="ghost" size="sm" onClick={onSignOut}>
                    Sign Out
                  </Button>
                )}
              </>
            ) : (
              <>
                {currentPage !== 'browse' && onBrowseItems && (
                  <Button variant="ghost" size="sm" onClick={onBrowseItems}>
                    Browse
                  </Button>
                )}
                {currentPage !== 'home' && onCreateListing && (
                  <Button variant="ghost" size="sm" onClick={onCreateListing}>
                    Sell
                  </Button>
                )}
                {onSignIn && (
                  <Button size="sm" onClick={onSignIn}>
                    Sign In
                  </Button>
                )}
              </>
            )}
          </div>

          {/* Mobile Navigation */}
          <div className="md:hidden">
            <Sheet open={isOpen} onOpenChange={setIsOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="sm" className="p-2">
                  <Menu className="h-5 w-5" />
                  <span className="sr-only">Open menu</span>
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[280px] sm:w-[320px]">
                <SheetHeader>
                  <SheetTitle className="text-left">
                    {user ? `Hi, ${user.username}!` : 'Menu'}
                  </SheetTitle>
                </SheetHeader>
                <div className="flex flex-col space-y-4 mt-8">
                  {user ? (
                    <>
                      {/* User greeting */}
                      <div className="px-3 py-2 bg-blue-50 rounded-lg">
                        <p className="text-blue-600 text-sm font-medium">
                          {getRotatingGreeting(user.id)}, {user.username}!
                        </p>
                      </div>
                      
                      {currentPage !== 'home' && onNavigateHome && (
                        <Button 
                          variant="ghost" 
                          className="justify-start h-12 text-base" 
                          onClick={() => handleMenuClick(onNavigateHome)}
                        >
                          Home
                        </Button>
                      )}
                      {currentPage !== 'browse' && onBrowseItems && (
                        <Button 
                          variant="ghost" 
                          className="justify-start h-12 text-base" 
                          onClick={() => handleMenuClick(onBrowseItems)}
                        >
                          Browse
                        </Button>
                      )}
                      {currentPage !== 'home' && onCreateListing && (
                        <Button 
                          variant="ghost" 
                          className="justify-start h-12 text-base" 
                          onClick={() => handleMenuClick(onCreateListing)}
                        >
                          Sell
                        </Button>
                      )}
                      {currentPage !== 'profile' && onViewProfile && (
                        <Button 
                          variant="ghost" 
                          className={`justify-start h-12 text-base ${!user?.username ? 'opacity-50 cursor-not-allowed' : ''}`}
                          onClick={() => handleMenuClick(onViewProfile)}
                          disabled={!user?.username}
                          title={!user?.username ? 'Loading profile...' : `View ${user.username}'s profile`}
                        >
                          Profile {!user?.username && <span className="ml-2 text-xs">(Loading...)</span>}
                        </Button>
                      )}
                      {onSignOut && (
                        <>
                          <div className="border-t pt-4 mt-4">
                            <Button 
                              variant="ghost" 
                              className="justify-start h-12 text-base text-red-600 hover:text-red-700 hover:bg-red-50" 
                              onClick={() => handleMenuClick(onSignOut)}
                            >
                              Sign Out
                            </Button>
                          </div>
                        </>
                      )}
                    </>
                  ) : (
                    <>
                      {currentPage !== 'browse' && onBrowseItems && (
                        <Button 
                          variant="ghost" 
                          className="justify-start h-12 text-base" 
                          onClick={() => handleMenuClick(onBrowseItems)}
                        >
                          Browse
                        </Button>
                      )}
                      {currentPage !== 'home' && onCreateListing && (
                        <Button 
                          variant="ghost" 
                          className="justify-start h-12 text-base" 
                          onClick={() => handleMenuClick(onCreateListing)}
                        >
                          Sell
                        </Button>
                      )}
                      {onSignIn && (
                        <Button 
                          className="justify-start h-12 text-base" 
                          onClick={() => handleMenuClick(onSignIn)}
                        >
                          Sign In
                        </Button>
                      )}
                    </>
                  )}
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </header>
  )
}