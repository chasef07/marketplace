'use client'

import React, { useState } from 'react'
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { InteractiveUploadZone } from './InteractiveUploadZone'
import { type AIAnalysisResult } from "@/lib/api-client-new"
import { User } from "@/lib/types/user"
import { useFileUpload } from "@/lib/hooks/useFileUpload"
import { MainNavigation } from "../navigation/MainNavigation"
import { Cpu, DollarSign, Zap } from "lucide-react"


interface HeroSectionProps {
  user: User | null
  onSignIn: () => void
  onSignOut: () => void
  onBrowseItems: () => void
  onViewProfile: (username?: string) => void
  onShowListingPreview: (analysisData: AIAnalysisResult, uploadedImages: string[]) => void
}

export const HeroSection = React.memo(function HeroSection({ 
  user, 
  onSignIn, 
  onSignOut, 
  onBrowseItems,
  onViewProfile,
  onShowListingPreview
}: HeroSectionProps) {
  const [showUploadZone, setShowUploadZone] = useState(false)
  const { uploadAndAnalyze, isAnalyzing } = useFileUpload({ 
    onShowListingPreview, 
    showProgressSteps: false 
  })

  const handleFilesDirectly = async (files: File[]) => {
    const imageFiles = files.filter(file => file.type.startsWith('image/'))
    if (imageFiles.length === 0) {
      alert('Please select image files only')
      return
    }
    await uploadAndAnalyze(imageFiles)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    
    const files = Array.from(e.dataTransfer.files)
    if (files.length > 0) {
      handleFilesDirectly(files)
    }
  }

  const handleCreateListingClick = () => {
    // Prevent multiple file inputs if already analyzing
    if (isAnalyzing) {
      console.warn('Upload already in progress')
      return
    }

    // Create a temporary file input and trigger it
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'image/*'
    input.multiple = true
    input.style.display = 'none'
    
    input.onchange = async (e) => {
      const files = Array.from((e.target as HTMLInputElement).files || [])
      if (files.length > 0) {
        // Start upload before removing input to prevent state conflicts
        handleFilesDirectly(files)
      }
      
      // Delayed cleanup to prevent state conflicts
      setTimeout(() => {
        if (document.body.contains(input)) {
          document.body.removeChild(input)
        }
      }, 100)
    }
    
    document.body.appendChild(input)
    input.click()
  }

  return (
    <div className="min-h-screen pt-20 bg-hero-gradient">
      {/* Navigation Header */}
      <MainNavigation
        user={user}
        onBrowseItems={onBrowseItems}
        onViewProfile={onViewProfile}
        onSignIn={onSignIn}
        onSignOut={onSignOut}
      />

      {/* Main Content */}
      <main 
        className="max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-16"
        onDragOver={handleDragOver}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {/* Hero Section */}
        <div className="text-center mb-8 sm:mb-12">
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-slate-900 mb-4 sm:mb-6 px-4">
            Sell Your Home Goods
            <span className="text-primary"> in Seconds</span>
          </h1>
          
          <p className="text-lg sm:text-xl text-slate-700 mb-6 sm:mb-8 max-w-2xl mx-auto px-4">
            Snap a photo, get AI pricing, list instantly on our marketplace
          </p>

          {/* Main Upload Button */}
          <div className="mb-16">
            <Button 
              size="lg" 
              onClick={handleCreateListingClick}
              disabled={isAnalyzing}
              className="text-lg px-8 py-4 h-auto border-2 border-primary/20 hover:border-primary/30 shadow-lg ring-2 ring-primary/10 hover:ring-primary/20 transition-all duration-200 bg-white/80 backdrop-blur-sm hover:bg-white/90"
            >
              {isAnalyzing ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2" />
                  AI Analyzing...
                </>
              ) : (
                <>
                  Create Your Listing
                </>
              )}
            </Button>
            <p className="text-sm text-slate-600 mt-2">
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
          <Card className="p-8 text-center border-0 bg-white/60 backdrop-blur-sm hover:bg-white/80 transition-all">
            <div className="w-16 h-16 mx-auto mb-4 bg-primary/10 rounded-full flex items-center justify-center">
              <Cpu className="w-8 h-8 text-primary" />
            </div>
            <h3 className="text-xl font-bold mb-3">AI-Powered Analysis</h3>
            <p className="text-slate-700 leading-relaxed">
              Advanced computer vision identifies furniture type, condition, and style with 95% accuracy
            </p>
          </Card>
          
          <Card className="p-8 text-center border-0 bg-white/60 backdrop-blur-sm hover:bg-white/80 transition-all">
            <div className="w-16 h-16 mx-auto mb-4 bg-primary/10 rounded-full flex items-center justify-center">
              <DollarSign className="w-8 h-8 text-primary" />
            </div>
            <h3 className="text-xl font-bold mb-3">Smart Pricing</h3>
            <p className="text-slate-700 leading-relaxed">
              Market-based pricing algorithms suggest optimal starting prices for maximum profits
            </p>
          </Card>
          
          <Card className="p-8 text-center border-0 bg-white/60 backdrop-blur-sm hover:bg-white/80 transition-all">
            <div className="w-16 h-16 mx-auto mb-4 bg-primary/10 rounded-full flex items-center justify-center">
              <Zap className="w-8 h-8 text-primary" />
            </div>
            <h3 className="text-xl font-bold mb-3">Instant Listings</h3>
            <p className="text-slate-700 leading-relaxed">
              Complete product descriptions generated automatically from your photos
            </p>
          </Card>
        </div>

      </main>
    </div>
  )
})