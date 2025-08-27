'use client'

import { useState } from 'react'
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { InteractiveUploadZone } from './InteractiveUploadZone'
import { type AIAnalysisResult } from "@/lib/api-client-new"
import { MainNavigation } from "../navigation/MainNavigation"

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
  onSignIn: () => void
  onSignOut: () => void
  onBrowseItems: () => void
  onViewProfile: () => void
  onShowListingPreview: (analysisData: AIAnalysisResult, uploadedImages: string[]) => void
}

export function HeroSection({ 
  user, 
  onSignIn, 
  onSignOut, 
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

  const handleCreateListingClick = () => {
    // Create a temporary file input and trigger it
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'image/*'
    input.multiple = true
    input.style.display = 'none'
    
    input.onchange = async (e) => {
      const files = Array.from((e.target as HTMLInputElement).files || [])
      if (files.length > 0) {
        setIsAnalyzing(true)
        handleFilesDirectly(files)
      }
      document.body.removeChild(input)
    }
    
    document.body.appendChild(input)
    input.click()
  }

  return (
    <div className="min-h-screen pt-20 bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Navigation Header */}
      <MainNavigation
        user={user}
        onBrowseItems={onBrowseItems}
        onViewProfile={onViewProfile}
        onSignIn={onSignIn}
        onSignOut={onSignOut}
        currentPage="home"
      />

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-6 py-16">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold text-slate-800 mb-6">
            Sell Your Home Goods
            <span className="text-blue-600"> in Seconds</span>
          </h1>
          
          <p className="text-xl text-slate-600 mb-8 max-w-2xl mx-auto">
            Snap a photo, get AI pricing, list instantly on our marketplace
          </p>

          {/* Main Upload Button */}
          <div className="mb-16">
            <Button 
              size="lg" 
              onClick={handleCreateListingClick}
              disabled={isAnalyzing}
              className="text-lg px-8 py-4 h-auto border-2 border-blue-200 hover:border-blue-300 shadow-lg ring-2 ring-blue-100 hover:ring-blue-200 transition-all duration-200"
            >
              {isAnalyzing ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2" />
                  AI Analyzing...
                </>
              ) : (
                <>
                  📸 Create Your Listing
                </>
              )}
            </Button>
            <p className="text-sm text-slate-500 mt-2">
              Snap • Price • Sell
            </p>
          </div>

          {/* Upload Zone */}
          {showUploadZone && (
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-lg p-6 max-w-md w-full">
                <InteractiveUploadZone 
                  onShowListingPreview={(analysisData, uploadedImages) => {
                    setShowUploadZone(false)
                    setIsAnalyzing(false)
                    onShowListingPreview(analysisData, uploadedImages)
                  }}
                />
                <Button 
                  variant="ghost" 
                  onClick={() => setShowUploadZone(false)}
                  className="w-full mt-4"
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Feature Cards */}
        <div className="grid md:grid-cols-3 gap-8 mb-16">
          <Card className="p-6 text-center">
            <div className="text-4xl mb-4">🤖</div>
            <h3 className="text-lg font-semibold mb-2">AI-Powered Analysis</h3>
            <p className="text-slate-600">
              Our AI identifies home goods type, style, and condition automatically
            </p>
          </Card>
          
          <Card className="p-6 text-center">
            <div className="text-4xl mb-4">💰</div>
            <h3 className="text-lg font-semibold mb-2">Smart Pricing</h3>
            <p className="text-slate-600">
              Get market-based pricing suggestions in seconds
            </p>
          </Card>
          
          <Card className="p-6 text-center">
            <div className="text-4xl mb-4">⚡</div>
            <h3 className="text-lg font-semibold mb-2">Instant Listings</h3>
            <p className="text-slate-600">
              Complete listings generated automatically from your photos
            </p>
          </Card>
        </div>

      </main>
    </div>
  )
}