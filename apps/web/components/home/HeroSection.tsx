'use client'

import { Button } from "@/components/ui/button"
import { LivingRoomScene } from './LivingRoomScene'
import { PolaroidUpload } from './PolaroidUpload'
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
  onShowListingPreview
}: HeroSectionProps) {
  
  return (
    <div className="hero-container">
      {/* Navigation */}
      <nav className="hero-nav">
        <div className="nav-content">
          <div className="logo">
            <span className="logo-text">FurnitureMarket</span>
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
                  Browse Items
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
                  Browse Items
                </Button>
                <Button 
                  variant="ghost" 
                  onClick={onSignIn}
                  className="nav-button nav-button-ghost"
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
        {/* Top Section - Title and Description */}
        <div className="hero-header">
          <h1 className="hero-title">
            Your Home's Next
            <span className="title-accent"> Story</span>
            <br />
            Starts Here
          </h1>
          
          <p className="hero-subtitle">
            Discover unique furniture pieces from your neighbors. 
            Every item has a story, every sale builds community.
          </p>
        </div>

        {/* Center Section - Polaroid Upload (Star of the Show) */}
        <div className="hero-center">
          <PolaroidUpload 
            onShowListingPreview={onShowListingPreview}
          />
        </div>


        {/* Background Living Room Scene */}
        <div className="hero-scene-background">
          <LivingRoomScene />
        </div>
      </main>

      <style jsx>{`
        .hero-container {
          height: 100vh;
          background: linear-gradient(135deg, #F7F3E9 0%, #E8DDD4 50%, #DDD1C7 100%);
          position: relative;
          overflow: hidden;
        }

        .hero-container::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-image: 
            radial-gradient(circle at 25% 25%, rgba(139, 69, 19, 0.1) 0%, transparent 50%),
            radial-gradient(circle at 75% 75%, rgba(210, 180, 140, 0.15) 0%, transparent 50%);
          pointer-events: none;
        }

        .hero-nav {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          z-index: 50;
          backdrop-filter: blur(10px);
          background: rgba(247, 243, 233, 0.9);
          border-bottom: 1px solid rgba(139, 69, 19, 0.1);
        }

        .nav-content {
          max-width: 1200px;
          margin: 0 auto;
          padding: 1rem 2rem;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .logo-text {
          font-size: 1.5rem;
          font-weight: 700;
          color: #3C2415;
          letter-spacing: -0.025em;
        }

        .nav-buttons {
          display: flex;
          align-items: center;
          gap: 1rem;
        }

        .welcome-text {
          color: #8B4513;
          font-size: 0.9rem;
          font-weight: 500;
        }

        .nav-button {
          font-weight: 500;
          transition: all 0.3s ease;
        }

        .nav-button-ghost {
          color: #8B4513;
          background: transparent;
        }

        .nav-button-ghost:hover {
          background: rgba(139, 69, 19, 0.1);
          color: #3C2415;
        }

        .nav-button-primary {
          background: #8B4513;
          color: #F7F3E9;
          border: none;
        }

        .nav-button-primary:hover {
          background: #6B3410;
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(139, 69, 19, 0.3);
        }

        .hero-main {
          display: flex;
          flex-direction: column;
          height: 100vh;
          max-width: 1200px;
          margin: 0 auto;
          padding: 5rem 2rem 3rem;
          align-items: center;
          justify-content: flex-start;
          position: relative;
          z-index: 2;
          gap: 0.25rem;
          overflow: hidden;
        }

        .hero-header {
          text-align: center;
          max-width: 800px;
          flex-shrink: 0;
          margin-bottom: 0;
          margin-top: 0.5rem;
        }

        .hero-center {
          display: flex;
          justify-content: center;
          align-items: center;
          width: 100%;
          max-width: 500px;
          z-index: 10;
          position: relative;
          flex-shrink: 0;
          margin: 0;
        }


        .hero-title {
          font-size: clamp(2rem, 4vw, 3rem);
          font-weight: 800;
          line-height: 1.1;
          color: #3C2415;
          margin-bottom: 0.5rem;
          letter-spacing: -0.02em;
        }

        .title-accent {
          background: linear-gradient(135deg, #8B4513, #CD853F);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .hero-subtitle {
          font-size: 1.1rem;
          color: #6B5A47;
          line-height: 1.5;
          margin-bottom: 0;
        }

        .hero-buttons {
          display: flex;
          gap: 1rem;
          justify-content: center;
          flex-wrap: wrap;
        }

        .cta-button {
          padding: 1rem 2rem;
          font-weight: 600;
          font-size: 1.1rem;
          transition: all 0.3s ease;
          border-radius: 12px;
        }

        .cta-primary {
          background: linear-gradient(135deg, #8B4513, #CD853F);
          color: #F7F3E9;
          border: none;
          box-shadow: 0 4px 20px rgba(139, 69, 19, 0.3);
        }

        .cta-primary:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 25px rgba(139, 69, 19, 0.4);
        }

        .cta-secondary {
          border: 2px solid #8B4513;
          color: #8B4513;
          background: rgba(247, 243, 233, 0.8);
        }

        .cta-secondary:hover {
          background: #8B4513;
          color: #F7F3E9;
          transform: translateY(-2px);
        }


        .hero-scene-background {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          z-index: 1;
          opacity: 0.6;
          pointer-events: none;
        }

        @media (max-width: 768px) {
          .hero-main {
            padding: 4rem 1rem 2.5rem;
            height: 100vh;
            gap: 0.125rem;
            justify-content: flex-start;
            overflow: hidden;
          }
          
          .hero-center {
            margin: 0;
          }
          
          .hero-header {
            margin-bottom: 0;
            margin-top: 0.5rem;
          }
          
          .hero-title {
            font-size: clamp(1.75rem, 6vw, 2.5rem);
            margin-bottom: 0.5rem;
          }
          
          .hero-subtitle {
            font-size: 1rem;
            margin-bottom: 0;
          }

          .nav-content {
            padding: 1rem;
          }

          .hero-buttons {
            flex-direction: column;
            width: 100%;
            max-width: 300px;
          }


          .nav-buttons {
            gap: 0.5rem;
          }

          .welcome-text {
            display: none;
          }

          .hero-center {
            max-width: 100%;
          }
        }
      `}</style>
    </div>
  )
}