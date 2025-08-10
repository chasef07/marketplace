'use client'

import { Button } from "@/components/ui/button"
import { InteractiveUploadZone } from './InteractiveUploadZone'
import { AnimatedBackground } from './AnimatedBackground'
import { colors, gradients, shadows, cssVariables } from './design-system/colors'
import { animations, animationClasses } from './design-system/animations'
import { type AIAnalysisResult } from "@/lib/api-client-new"

interface User {
  id: string
  username: string
  email: string
  seller_personality: string
  buyer_personality: string
  is_active: boolean
  created_at: string
  last_login?: string
}

interface HeroSectionProps {
  user: User | null
  onGetStarted: () => void
  onSignIn: () => void
  onSignOut: () => void
  onCreateListing: () => void
  onBrowseItems: () => void
  onSellerDashboard: () => void
  onViewProfile: () => void
  onShowListingPreview: (analysisData: AIAnalysisResult, uploadedImages: string[]) => void
}

export function HeroSection({ 
  user, 
  onGetStarted, 
  onSignIn, 
  onSignOut, 
  onCreateListing, 
  onBrowseItems,
  onSellerDashboard,
  onViewProfile,
  onShowListingPreview
}: HeroSectionProps) {
  
  return (
    <>
      <AnimatedBackground />
      
      <div className="hero-container">
        {/* Navigation */}
        <nav className="hero-nav">
          <div className="nav-content">
            <div className="logo">
              <span className="logo-icon">📷</span>
              <span className="logo-text">SnapNest</span>
            </div>
            
            <div className="nav-buttons">
              {user ? (
                <>
                  <span className="welcome-text">Welcome back, {user.username}!</span>
                  <Button 
                    variant="ghost" 
                    onClick={onBrowseItems}
                    className="nav-button nav-button-ghost"
                  >
                    Browse
                  </Button>
                  <Button 
                    variant="ghost" 
                    onClick={onSellerDashboard}
                    className="nav-button nav-button-ghost"
                  >
                    Dashboard
                  </Button>
                  <Button 
                    variant="ghost" 
                    onClick={onViewProfile}
                    className="nav-button nav-button-ghost"
                  >
                    Profile
                  </Button>
                  <Button 
                    variant="ghost" 
                    onClick={onSignOut}
                    className="nav-button nav-button-ghost"
                  >
                    Sign Out
                  </Button>
                </>
              ) : (
                <>
                  <Button 
                    variant="ghost" 
                    onClick={onBrowseItems}
                    className="nav-button nav-button-ghost"
                  >
                    Browse
                  </Button>
                  <Button 
                    variant="ghost" 
                    onClick={onSignIn}
                    className="nav-button nav-button-primary"
                  >
                    Sign In
                  </Button>
                </>
              )}
            </div>
          </div>
        </nav>

        {/* Main Hero Content */}
        <main className="hero-main">
          {/* Hero Header */}
          <div className="hero-header">
            <h1 className="hero-title">
              Sell Your Furniture
              <span className="title-accent"> in Seconds</span>
            </h1>
            
            <p className="hero-subtitle">
              Snap a photo, get AI pricing, list instantly on our marketplace
            </p>
          </div>

          {/* Centered Upload Zone */}
          <div className="hero-center">
            <InteractiveUploadZone 
              onShowListingPreview={onShowListingPreview}
            />
          </div>
        </main>

      </div>

      <style jsx>{`
        ${cssVariables}
        
        .hero-container {
          position: relative;
          z-index: 1;
          background: transparent;
        }

        .hero-nav {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          z-index: 50;
          backdrop-filter: blur(10px);
          background: ${colors.glass.background};
          border-bottom: 1px solid ${colors.glass.border};
          box-shadow: ${shadows.sm};
        }

        .nav-content {
          max-width: 1200px;
          margin: 0 auto;
          padding: 1rem 2rem;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .logo {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .logo-icon {
          font-size: 1.5rem;
        }

        .logo-text {
          font-size: 1.5rem;
          font-weight: 800;
          color: ${colors.neutralDark};
          letter-spacing: -0.025em;
          font-family: 'Inter', -apple-system, sans-serif;
          background: ${gradients.primary};
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .nav-buttons {
          display: flex;
          align-items: center;
          gap: 1rem;
        }

        .welcome-text {
          color: ${colors.primary};
          font-size: 0.9rem;
          font-weight: 500;
        }

        .nav-button {
          font-weight: 600;
          transition: all 300ms ${animations.easing.smooth};
          border-radius: 8px;
          font-size: 0.9rem;
        }

        .nav-button-ghost {
          color: ${colors.neutralDark};
          background: transparent;
        }

        .nav-button-ghost:hover {
          background: ${colors.primary}10;
          color: ${colors.primary};
          transform: translateY(-1px);
        }

        .nav-button-primary {
          background: ${gradients.primary};
          color: white;
          border: none;
          box-shadow: ${shadows.primary};
        }

        .nav-button-primary:hover {
          background: ${colors.primaryDark};
          transform: translateY(-1px);
          box-shadow: ${shadows.lg};
        }

        .hero-main {
          max-width: 1200px;
          margin: 0 auto;
          padding: 6rem 2rem 4rem;
          position: relative;
          z-index: 2;
        }

        .hero-header {
          text-align: center;
          margin-bottom: 4rem;
        }

        .hero-title {
          font-size: clamp(2.5rem, 5vw, 4rem);
          font-weight: 800;
          line-height: 1.1;
          color: ${colors.neutralDark};
          margin-bottom: 1rem;
          letter-spacing: -0.02em;
          font-family: 'Inter', -apple-system, sans-serif;
          ${animationClasses.fadeIn}
        }

        .title-accent {
          background: ${gradients.accent};
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .hero-subtitle {
          font-size: 1.25rem;
          color: ${colors.primary};
          line-height: 1.5;
          max-width: 600px;
          margin: 0 auto;
          font-weight: 500;
          ${animationClasses.fadeIn}
          animation-delay: 200ms;
        }

        .hero-center {
          display: flex;
          justify-content: center;
          align-items: center;
          margin-bottom: 2rem;
          ${animationClasses.fadeIn}
          animation-delay: 400ms;
        }

        ${animations.keyframes.fadeIn}
        ${animations.keyframes.pulse}


        @media (max-width: 768px) {
          .hero-main {
            padding: 5rem 1rem 2rem;
          }
          
          .hero-header {
            margin-bottom: 2.5rem;
          }
          
          .hero-title {
            font-size: clamp(2rem, 8vw, 3rem);
            margin-bottom: 0.75rem;
          }
          
          .hero-subtitle {
            font-size: 1.1rem;
          }

          .nav-content {
            padding: 1rem;
          }

          .nav-buttons {
            gap: 0.5rem;
          }

          .welcome-text {
            display: none;
          }

          .logo-text {
            font-size: 1.25rem;
          }
        }
      `}</style>
    </>
  )
}