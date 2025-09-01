'use client'

import { useState } from "react"
import { usePathname } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { Menu } from "lucide-react"
import { getRotatingGreeting } from "@/lib/greetings"
import { User } from "@/lib/types/user"

interface MainNavigationProps {
  user: User | null
  onNavigateHome?: () => void
  onBrowseItems?: () => void
  onCreateListing?: () => void
  onViewProfile?: (username?: string) => void
  onSignIn?: () => void
  onSignOut?: () => void
}

export function MainNavigation({
  user,
  onNavigateHome,
  onBrowseItems,
  onCreateListing,
  onViewProfile,
  onSignIn,
  onSignOut,
}: MainNavigationProps) {
  const [isOpen, setIsOpen] = useState(false)
  const pathname = usePathname()

  // Auto-detect current page from URL
  const getCurrentPage = (): 'home' | 'browse' | 'profile' => {
    if (pathname === '/') return 'home'
    if (pathname.startsWith('/browse')) return 'browse'
    if (pathname.startsWith('/profile')) return 'profile'
    return 'home' // default fallback
  }

  const currentPage = getCurrentPage()

  const handleMenuClick = (callback?: () => void) => {
    setIsOpen(false)
    callback?.()
  }

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-white/95 md:bg-white/90 backdrop-blur-md border-b border-slate-200 shadow-sm">
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <div className="text-xl sm:text-2xl font-bold text-slate-800">Marketplace</div>
          
          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-3 lg:space-x-4">
            {user ? (
              <>
                <span className="text-primary text-sm font-medium hidden lg:block truncate max-w-32">
                  {getRotatingGreeting(user.id)}, {user.username}!
                </span>
                <span className="text-primary text-sm font-medium lg:hidden">
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
                    onClick={() => onViewProfile()}
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
                <Button variant="ghost" size="sm" className="p-2 text-slate-700 hover:bg-white/20">
                  <Menu className="h-5 w-5" />
                  <span className="sr-only">Open menu</span>
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[280px] sm:w-[320px] bg-white border-l border-slate-200 shadow-xl">
                <SheetHeader>
                  <SheetTitle className="text-left text-slate-900 font-semibold">
                    Menu
                  </SheetTitle>
                </SheetHeader>
                <div className="flex flex-col space-y-4 mt-8">
                  {user ? (
                    <>
                      {/* User greeting */}
                      <div className="px-3 py-2 bg-accent/30 rounded-lg">
                        <p className="text-primary text-sm font-medium">
                          {getRotatingGreeting(user.id)}, {user.username}!
                        </p>
                      </div>
                      
                      {currentPage !== 'home' && onNavigateHome && (
                        <Button 
                          variant="ghost" 
                          className="justify-start h-12 text-base text-slate-800 hover:bg-slate-100 hover:text-slate-900" 
                          onClick={() => handleMenuClick(onNavigateHome)}
                        >
                          Home
                        </Button>
                      )}
                      {currentPage !== 'browse' && onBrowseItems && (
                        <Button 
                          variant="ghost" 
                          className="justify-start h-12 text-base text-slate-800 hover:bg-slate-100 hover:text-slate-900" 
                          onClick={() => handleMenuClick(onBrowseItems)}
                        >
                          Browse
                        </Button>
                      )}
                      {currentPage !== 'home' && onCreateListing && (
                        <Button 
                          variant="ghost" 
                          className="justify-start h-12 text-base text-slate-800 hover:bg-slate-100 hover:text-slate-900" 
                          onClick={() => handleMenuClick(onCreateListing)}
                        >
                          Sell
                        </Button>
                      )}
                      {currentPage !== 'profile' && onViewProfile && (
                        <Button 
                          variant="ghost" 
                          className={`justify-start h-12 text-base text-slate-800 hover:bg-slate-100 hover:text-slate-900 ${!user?.username ? 'opacity-50 cursor-not-allowed' : ''}`}
                          onClick={() => handleMenuClick(() => onViewProfile())}
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
                          className="justify-start h-12 text-base text-slate-800 hover:bg-slate-100 hover:text-slate-900" 
                          onClick={() => handleMenuClick(onBrowseItems)}
                        >
                          Browse
                        </Button>
                      )}
                      {currentPage !== 'home' && onCreateListing && (
                        <Button 
                          variant="ghost" 
                          className="justify-start h-12 text-base text-slate-800 hover:bg-slate-100 hover:text-slate-900" 
                          onClick={() => handleMenuClick(onCreateListing)}
                        >
                          Sell
                        </Button>
                      )}
                      {onSignIn && (
                        <Button 
                          className="justify-start h-12 text-base bg-primary text-black hover:bg-primary/90" 
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