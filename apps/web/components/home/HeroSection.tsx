'use client'

import { useState } from 'react'
import { Button } from "@/components/ui/button"
import { InteractiveUploadZone } from './InteractiveUploadZone'
import { InteractiveLivingRoom } from './InteractiveLivingRoom'
import { AnimatedBackground } from './AnimatedBackground'
import { colors, gradients, shadows, cssVariables } from './design-system/colors'
import { animations, animationClasses } from './design-system/animations'
import { type AIAnalysisResult } from "@/lib/api-client-new"
import { getRotatingGreeting } from "@/lib/greetings"
import AdminAccessButton from "../admin/AdminAccessButton"

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
  onViewProfile,
  onShowListingPreview
}: HeroSectionProps) {
  const [showUploadZone, setShowUploadZone] = useState(false)
  const [isAnalyzing, setIsAnalyzing] = useState(false)

  const handleFilesDirectly = async (files: File[]) => {
    try {
      const imageFiles = files.filter(file => file.type.startsWith('image/'))
      if (imageFiles.length === 0) {
        alert('Please select image files only')
        setIsAnalyzing(false)
        return
      }

      // Create FormData for the API call
      const formData = new FormData()
      imageFiles.forEach((file, index) => {
        formData.append(`image${index}`, file)
      })

      // Call the actual AI analysis API
      const response = await fetch('/api/ai/analyze-images', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        throw new Error('Analysis failed')
      }

      const result = await response.json()
      
      // Create image URLs for the uploaded files
      const imageUrls = imageFiles.map(file => URL.createObjectURL(file))
      
      // Add the images metadata to the result for compatibility
      const enrichedResult = {
        ...result,
        images: result.images || imageUrls.map((_, index) => ({
          filename: `temp-${index}`,
          order: index + 1,
          is_primary: index === 0
        }))
      }
      
      // Stop analyzing and show the listing preview
      setIsAnalyzing(false)
      onShowListingPreview(enrichedResult, imageUrls)

    } catch (error) {
      console.error('Upload failed:', error)
      setIsAnalyzing(false)
      alert('Upload failed. Please try again.')
    }
  }
  
  return (
    <>
      <AnimatedBackground />
      
      <div className="hero-container">
        {/* Navigation */}
        <nav className="hero-nav">
          <div className="nav-content">
            <div className="logo">
              <span className="logo-text">SnapNest</span>
            </div>
            
            <div className="nav-buttons">
              {user ? (
                <>
                  <span className="welcome-text">{getRotatingGreeting(user.id)}, {user.username}!</span>
                  <Button 
                    variant="ghost" 
                    onClick={onBrowseItems}
                    className="nav-button nav-button-ghost"
                  >
                    Browse
                  </Button>
                  <Button 
                    variant="ghost" 
                    onClick={onViewProfile}
                    className="nav-button nav-button-ghost"
                  >
                    Profile
                  </Button>
                  <AdminAccessButton variant="icon" className="nav-button" />
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

          {/* Create Your Listing Button */}
          <div className="create-listing-section">
            <div 
              className={`create-listing-button ${isAnalyzing ? 'analyzing' : ''}`}
              onClick={() => {
                if (isAnalyzing) return // Prevent clicks during analysis
                
                console.log('📸 Create Listing button clicked - opening file picker')
                
                // Create a temporary file input and trigger it
                const input = document.createElement('input')
                input.type = 'file'
                input.accept = 'image/*'
                input.multiple = true
                input.style.display = 'none'
                
                input.onchange = async (e) => {
                  const files = Array.from((e.target as HTMLInputElement).files || [])
                  console.log('📁 Create Listing - Files selected:', files.length)
                  if (files.length > 0) {
                    console.log('✅ Files found, starting AI analysis in button')
                    
                    // Start analyzing state for button animation
                    setIsAnalyzing(true)
                    
                    // Process files directly without showing the large upload zone
                    handleFilesDirectly(files)
                  }
                  document.body.removeChild(input)
                }
                
                document.body.appendChild(input)
                input.click()
              }}
            >
              {!isAnalyzing ? (
                <>
                  <div className="create-listing-text">Create Your Listing</div>
                  <div className="create-listing-subtext">Snap • Price • Sell</div>
                </>
              ) : (
                <div className="analyzing-content">
                  <div className="ai-brain-small">🧠</div>
                  <div className="analyzing-text">AI Analyzing...</div>
                  <div className="analyzing-dots">
                    <span></span>
                    <span></span>
                    <span></span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Interactive Living Room */}
          <div className="living-room-section">
            <InteractiveLivingRoom 
              onUploadClick={() => {
                console.log('🔍 InteractiveLivingRoom upload clicked - showing fullscreen upload zone')
                // For living room clicks, still show the fullscreen experience
                setShowUploadZone(true)
                
                // Create a temporary file input and trigger it
                const input = document.createElement('input')
                input.type = 'file'
                input.accept = 'image/*'
                input.multiple = true
                input.style.display = 'none'
                
                input.onchange = async (e) => {
                  const files = Array.from((e.target as HTMLInputElement).files || [])
                  console.log('📁 Files selected:', files.length)
                  if (files.length > 0) {
                    console.log('✅ Files found, triggering hidden input')
                    // We need to call the same upload handling logic
                    // Let's trigger the hidden upload zone's file input instead
                    const hiddenInput = document.querySelector('#hidden-file-input') as HTMLInputElement
                    if (hiddenInput) {
                      console.log('🎯 Found hidden input, copying files')
                      // Copy files to hidden input and trigger its change event
                      const dt = new DataTransfer()
                      files.forEach(file => dt.items.add(file))
                      hiddenInput.files = dt.files
                      hiddenInput.dispatchEvent(new Event('change', { bubbles: true }))
                    } else {
                      console.error('❌ Hidden input not found!')
                    }
                  } else {
                    console.log('❌ No files selected, hiding upload zone')
                    // User cancelled, hide upload zone
                    setShowUploadZone(false)
                  }
                  document.body.removeChild(input)
                }
                
                document.body.appendChild(input)
                input.click()
              }}
            />
          </div>

          {/* Upload Zone - Shows AI loading when analyzing */}
          <div className={showUploadZone ? "upload-zone-visible" : "hidden-upload-zone"}>
            <InteractiveUploadZone 
              onShowListingPreview={(analysisData, uploadedImages) => {
                // Hide upload zone and stop analyzing when complete
                setShowUploadZone(false)
                setIsAnalyzing(false)
                onShowListingPreview(analysisData, uploadedImages)
              }}
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
          height: 100vh;
          overflow: hidden;
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
          padding: 1rem 2rem 1rem;
          position: relative;
          z-index: 2;
          height: calc(100vh - 70px);
          display: flex;
          flex-direction: column;
          justify-content: flex-start;
          padding-top: 8rem;
        }

        .hero-header {
          text-align: center;
          margin-bottom: 2rem;
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

        .create-listing-section {
          display: flex;
          justify-content: center;
          margin: 2rem 0;
          ${animationClasses.fadeIn}
          animation-delay: 300ms;
        }

        .create-listing-button {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          width: 300px;
          height: 120px;
          background: linear-gradient(135deg, ${colors.neutralLight}95, ${colors.background}90);
          backdrop-filter: blur(15px);
          border: 2px solid ${colors.primary}30;
          border-radius: 20px;
          cursor: pointer;
          transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
          box-shadow: 0 8px 32px ${colors.secondary}20, 0 0 0 1px ${colors.neutralLight}50;
          animation: pulse 2.5s ease-in-out infinite;
          position: relative;
          overflow: hidden;
        }
        
        .create-listing-button.analyzing {
          border-color: ${colors.primary};
          background: linear-gradient(135deg, ${colors.primary}10, ${colors.background}95);
          animation: analyzing-pulse 2s ease-in-out infinite;
          cursor: default;
        }

        .create-listing-button:hover {
          transform: translateY(-8px) scale(1.05);
          border: 2px solid ${colors.primary}60;
          background: linear-gradient(135deg, ${colors.background}98, ${colors.neutralLight}95);
          box-shadow: 0 20px 50px ${colors.primary}40, 0 0 0 2px ${colors.primary}30, 0 10px 30px ${colors.primary}20;
        }

        .create-listing-text {
          font-size: 24px;
          font-weight: 800;
          color: ${colors.neutralDark};
          text-align: center;
          line-height: 1.2;
          text-shadow: 0 1px 2px ${colors.neutralLight}80;
          letter-spacing: -0.5px;
          margin-bottom: 8px;
        }

        .create-listing-subtext {
          font-size: 16px;
          font-weight: 600;
          text-align: center;
          color: ${colors.neutralDark};
        }

        @keyframes pulse {
          0%, 100% { 
            box-shadow: 0 8px 32px ${colors.secondary}20, 0 0 0 1px ${colors.neutralLight}50, 0 0 0 0 ${colors.secondary}40;
          }
          50% { 
            box-shadow: 0 8px 32px ${colors.secondary}20, 0 0 0 1px ${colors.neutralLight}50, 0 0 0 15px transparent;
          }
        }
        
        .create-listing-button.analyzing {
          border-color: ${colors.primary};
          background: linear-gradient(135deg, ${colors.primary}10, ${colors.background}95);
          animation: analyzing-pulse 2s ease-in-out infinite;
          cursor: default;
        }
        
        .analyzing-content {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          height: 100%;
        }
        
        .ai-brain-small {
          font-size: 2rem;
          animation: brain-pulse 1.5s ease-in-out infinite;
        }
        
        .analyzing-text {
          font-size: 1rem;
          font-weight: 700;
          color: ${colors.primary};
          text-align: center;
        }
        
        .analyzing-dots {
          display: flex;
          gap: 0.3rem;
        }
        
        .analyzing-dots span {
          width: 6px;
          height: 6px;
          background: ${colors.primary};
          border-radius: 50%;
          animation: dot-bounce 1.4s ease-in-out infinite both;
        }
        
        .analyzing-dots span:nth-child(1) { animation-delay: -0.32s; }
        .analyzing-dots span:nth-child(2) { animation-delay: -0.16s; }
        .analyzing-dots span:nth-child(3) { animation-delay: 0s; }
        
        @keyframes analyzing-pulse {
          0%, 100% { 
            box-shadow: 0 8px 32px ${colors.primary}30, 0 0 0 1px ${colors.primary}20, 0 0 0 0 ${colors.primary}40;
          }
          50% { 
            box-shadow: 0 8px 32px ${colors.primary}30, 0 0 0 1px ${colors.primary}20, 0 0 0 20px transparent;
          }
        }
        
        @keyframes brain-pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.1); }
        }
        
        @keyframes dot-bounce {
          0%, 80%, 100% { 
            transform: scale(0);
            opacity: 0.5;
          }
          40% { 
            transform: scale(1);
            opacity: 1;
          }
        }

        .living-room-section {
          display: flex;
          justify-content: center;
          align-items: center;
          flex: 1;
          ${animationClasses.fadeIn}
          animation-delay: 400ms;
        }

        .hidden-upload-zone {
          position: absolute;
          visibility: hidden;
          pointer-events: none;
          left: -9999px;
        }

        .upload-zone-visible {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.8);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          backdrop-filter: blur(10px);
          animation: fadeIn 0.3s ease;
        }

        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        ${animations.keyframes.fadeIn}
        ${animations.keyframes.pulse}


        @media (max-width: 768px) {
          .hero-main {
            padding: 1rem 1rem 0.5rem;
            height: calc(100vh - 60px);
            padding-top: 4rem;
          }
          
          .hero-header {
            margin-bottom: 1.5rem;
          }
          
          .hero-title {
            font-size: clamp(1.8rem, 7vw, 2.5rem);
            margin-bottom: 0.5rem;
          }
          
          .hero-subtitle {
            font-size: 1rem;
          }

          .create-listing-button {
            width: 260px;
            height: 100px;
          }

          .create-listing-text {
            font-size: 20px;
          }

          .create-listing-subtext {
            font-size: 14px;
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