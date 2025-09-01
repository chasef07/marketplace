import { NextRouter } from 'next/router'
import { AppRouterInstance } from 'next/dist/shared/lib/app-router-context.shared-runtime'
import { User } from '@/lib/types/user'

// Type for Next.js router (supports both pages and app router)
type Router = NextRouter | AppRouterInstance

/**
 * Creates a unified sell button handler that provides consistent navigation
 * behavior across all pages in the marketplace application.
 * 
 * This addresses Bug #3 from the navigation bugs report by:
 * - Providing consistent "Sell" button behavior across all pages
 * - Preserving user intent across authentication flows  
 * - Implementing proper post-auth redirects to listing creation
 * 
 * @param user - Current authenticated user (null if not authenticated)
 * @param router - Next.js router instance for navigation
 * @param setAuthMode - Optional function to set auth modal mode (for HomePage)
 * @param setCurrentView - Optional function to set current view (for HomePage)
 * @returns Function that handles sell button clicks with unified behavior
 */
export const createSellHandler = (
  user: User | null,
  router: Router,
  setAuthMode?: (mode: 'signin' | 'register' | 'reset') => void,
  setCurrentView?: (view: string) => void
) => {
  return () => {
    if (!user) {
      // Store intent for post-auth redirect with timestamp for expiration
      if (typeof window !== 'undefined') {
        localStorage.setItem('pendingAction', 'sell')
        localStorage.setItem('pendingActionTimestamp', Date.now().toString())
      }
      
      // Navigate to sign-in based on available handlers
      if (setAuthMode && setCurrentView) {
        // In-app auth modal (HomePage) - stay on current page
        setAuthMode('signin')
        setCurrentView('auth')
      } else {
        // Navigate to home page for auth (other pages)
        router.push('/')
      }
    } else {
      // Authenticated user - go directly to home for listing creation
      router.push('/')
    }
  }
}

/**
 * Checks for and handles pending actions stored during authentication flows.
 * This should be called after successful authentication to redirect users
 * to their intended destination.
 * 
 * @param action - The pending action from localStorage
 * @param timestamp - When the action was stored
 * @param maxAge - Maximum age in milliseconds before action expires (default: 5 minutes)
 * @returns Object indicating if action is valid and what type it is
 */
export const handlePendingAction = (
  action: string | null, 
  timestamp: string | null,
  maxAge: number = 5 * 60 * 1000 // 5 minutes
): { isValid: boolean; actionType: string | null; shouldStayOnHome: boolean } => {
  if (!action || !timestamp) {
    return { isValid: false, actionType: null, shouldStayOnHome: false }
  }

  // Check if timestamp is valid and not expired
  const actionTime = parseInt(timestamp)
  const isValidTimestamp = !isNaN(actionTime) && (Date.now() - actionTime) < maxAge
  
  if (!isValidTimestamp) {
    // Clean up expired actions
    if (typeof window !== 'undefined') {
      localStorage.removeItem('pendingAction')
      localStorage.removeItem('pendingActionTimestamp')
    }
    return { isValid: false, actionType: null, shouldStayOnHome: false }
  }

  // Handle different action types
  switch (action) {
    case 'sell':
      return { 
        isValid: true, 
        actionType: 'sell', 
        shouldStayOnHome: true // Stay on home page for listing creation
      }
    default:
      return { isValid: false, actionType: null, shouldStayOnHome: false }
  }
}

/**
 * Clears pending actions from localStorage.
 * Should be called after actions are processed or when they expire.
 */
export const clearPendingActions = (): void => {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('pendingAction')
    localStorage.removeItem('pendingActionTimestamp')
  }
}