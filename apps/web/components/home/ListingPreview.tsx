'use client'

import { useState, useEffect } from 'react'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, Edit, Save, Camera, ChevronLeft, ChevronRight, ChevronDown } from 'lucide-react'
import { type AIAnalysisResult, apiClient } from "@/lib/api-client-new"
import { User } from "@/lib/types/user"
import Image from "next/image"
import { FirstListingSetup } from "../ai-agent/FirstListingSetup"


interface ListingPreviewProps {
  analysisData: AIAnalysisResult
  uploadedImages: string[]
  user: User | null
  onBack: () => void
  onSignUp: (editedData: AIAnalysisResult) => void
  onCreateListing?: (editedData: AIAnalysisResult, agentEnabled?: boolean) => void
}

interface AgentPreferences {
  minAcceptablePrice: number | null
  sellingPriority: 'best_price' | 'quick_sale'
  targetSaleDate?: Date | null
}

export function ListingPreview({ analysisData, uploadedImages, user, onBack, onSignUp, onCreateListing }: ListingPreviewProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editedData, setEditedData] = useState<AIAnalysisResult>(analysisData)
  const [currentImageIndex, setCurrentImageIndex] = useState(0)
  const [isCreatingListing, setIsCreatingListing] = useState(false)
  const [showDimensions, setShowDimensions] = useState(true)
  const [includeDimensions, setIncludeDimensions] = useState(!!analysisData.analysis.estimated_dimensions)
  const [showAgentSetup, setShowAgentSetup] = useState(false)
  const [hasSeenAgentSetup, setHasSeenAgentSetup] = useState(false)
  const [isCheckingAgentSetup, setIsCheckingAgentSetup] = useState(true)
  const [agentPreferences, setAgentPreferences] = useState<AgentPreferences | null>(null)

  const handleSignUp = () => {
    const finalData = {
      ...editedData,
      analysis: {
        ...editedData.analysis,
        estimated_dimensions: includeDimensions ? editedData.analysis.estimated_dimensions : ''
      }
    }
    onSignUp(finalData)
  }

  // Check if user has seen agent setup when component loads
  useEffect(() => {
    const checkAgentSetupStatus = async () => {
      if (!user) {
        setIsCheckingAgentSetup(false)
        return
      }
      
      try {
        const headers = await apiClient.getAuthHeaders(true)
        const response = await fetch('/api/auth/me', { headers })
        if (response.ok) {
          const userData = await response.json()
          console.log('Agent setup status:', userData.has_seen_agent_setup)
          setHasSeenAgentSetup(userData.has_seen_agent_setup || false)
        } else {
          console.error('Failed to fetch user data:', response.status)
        }
      } catch (error) {
        console.error('Failed to check agent setup status:', error)
        // Default to showing setup for safety
        setHasSeenAgentSetup(false)
      } finally {
        setIsCheckingAgentSetup(false)
      }
    }

    checkAgentSetupStatus()
  }, [user])

  const handleCreateListing = async () => {
    if (!onCreateListing || isCreatingListing) return
    
    // If user is logged in and hasn't seen agent setup, show the setup modal first
    if (user && !hasSeenAgentSetup && !isCheckingAgentSetup) {
      setShowAgentSetup(true)
      return
    }
    
    // Otherwise proceed with normal listing creation
    setIsCreatingListing(true)
    try {
      const finalData = {
        ...editedData,
        analysis: {
          ...editedData.analysis,
          estimated_dimensions: includeDimensions ? editedData.analysis.estimated_dimensions : ''
        }
      }
      onCreateListing(finalData, !!agentPreferences)
    } catch (error) {
      // Error handling is done in parent component
    } finally {
      // Don't reset loading state here since we'll navigate away
    }
  }

  const handleAgentSetupComplete = async (preferences: AgentPreferences) => {
    try {
      // Save agent preferences via API
      const headers = await apiClient.getAuthHeaders(true)
      const response = await fetch('/api/seller/agent/setup', {
        method: 'POST',
        headers: {
          ...headers,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          minAcceptablePrice: preferences.minAcceptablePrice && !isNaN(Number(preferences.minAcceptablePrice)) 
            ? Number(preferences.minAcceptablePrice) 
            : null,
          sellingPriority: preferences.sellingPriority,
          targetSaleDate: preferences.targetSaleDate?.toISOString() || null
        })
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error('Agent setup API error:', response.status, errorText)
        throw new Error(`Failed to save agent preferences: ${response.status} - ${errorText}`)
      }

      // Store preferences and mark as completed
      setAgentPreferences(preferences)
      setHasSeenAgentSetup(true)
      setShowAgentSetup(false)
      
      // Now create the listing with agent enabled
      setIsCreatingListing(true)
      try {
        const finalData = {
          ...editedData,
          analysis: {
            ...editedData.analysis,
            estimated_dimensions: includeDimensions ? editedData.analysis.estimated_dimensions : ''
          }
        }
        onCreateListing!(finalData, true) // Enable agent
      } catch (error) {
        console.error('Failed to create listing after agent setup:', error)
      }
    } catch (error) {
      console.error('Failed to setup AI agent:', error)
      // Could show an error message here, but for now proceed without agent
      setShowAgentSetup(false)
      handleCreateListing() // Proceed without agent setup
    }
  }

  const nextImage = () => {
    setCurrentImageIndex((prev) => (prev + 1) % uploadedImages.length)
  }

  const prevImage = () => {
    setCurrentImageIndex((prev) => (prev - 1 + uploadedImages.length) % uploadedImages.length)
  }

  const handleInputChange = (field: string, value: string | number, nested?: string) => {
    setEditedData(prev => {
      if (nested) {
        const nestedObj = prev[nested as keyof AIAnalysisResult] as Record<string, unknown>
        return {
          ...prev,
          [nested]: {
            ...nestedObj,
            [field]: value
          }
        }
      }
      return {
        ...prev,
        [field]: value
      }
    })
  }

  return (
    <>
      <style jsx global>{`
        .no-spinner::-webkit-outer-spin-button,
        .no-spinner::-webkit-inner-spin-button {
          -webkit-appearance: none !important;
          margin: 0 !important;
        }
        .no-spinner {
          -moz-appearance: textfield !important;
        }
      `}</style>
      <div className="min-h-screen bg-hero-gradient">
        {/* Header */}
      <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <Button 
              variant="ghost" 
              onClick={onBack}
              disabled={isCreatingListing}
              className="flex items-center space-x-2"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Upload</span>
            </Button>
            
            <div className="text-2xl font-bold text-slate-800">Marketplace</div>
            
            <Button 
              variant={isEditing ? "default" : "outline"}
              onClick={() => setIsEditing(!isEditing)}
              className="flex items-center space-x-2"
            >
              {isEditing ? (
                <>
                  <Save className="w-4 h-4" />
                  <span>Save</span>
                </>
              ) : (
                <>
                  <Edit className="w-4 h-4" />
                  <span>Edit</span>
                </>
              )}
            </Button>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-6 py-8">
        <div className="grid lg:grid-cols-5 gap-8">
          {/* Left Column - Images, Price, Action */}
          <div className="lg:col-span-2 space-y-6">
            {/* Image Carousel */}
            <Card>
              <CardContent className="p-4">
                <div className="relative">
                  <div className="relative aspect-[4/3] overflow-hidden rounded-lg">
                    <Image 
                      src={uploadedImages[currentImageIndex]} 
                      alt={`Furniture view ${currentImageIndex + 1}`} 
                      fill
                      className="object-cover"
                      sizes="(max-width: 1024px) 100vw, 40vw"
                    />
                    
                    {/* Image overlay */}
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-4">
                      <div className="flex items-center space-x-2 text-white">
                        <Camera className="w-4 h-4" />
                        <span className="text-sm">Photo {currentImageIndex + 1} of {uploadedImages.length}</span>
                      </div>
                    </div>
                    
                    {/* Navigation arrows */}
                    {uploadedImages.length > 1 && (
                      <>
                        <Button
                          variant="secondary"
                          size="sm"
                          className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full p-0"
                          onClick={prevImage}
                        >
                          <ChevronLeft className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="secondary"
                          size="sm"
                          className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full p-0"
                          onClick={nextImage}
                        >
                          <ChevronRight className="w-4 h-4" />
                        </Button>
                      </>
                    )}
                  </div>
                  
                  {/* Image dots */}
                  {uploadedImages.length > 1 && (
                    <div className="flex justify-center space-x-2 mt-4">
                      {uploadedImages.map((_, index) => (
                        <button
                          key={index}
                          className={`w-2 h-2 rounded-full transition-colors ${
                            index === currentImageIndex ? 'bg-blue-600' : 'bg-slate-300'
                          }`}
                          onClick={() => setCurrentImageIndex(index)}
                        />
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Price Card */}
            <Card>
              <CardContent className="p-6 text-center">
                <div className="space-y-2">
                  {isEditing ? (
                    <Input
                      type="number"
                      value={editedData.pricing.suggested_starting_price || ''}
                      onChange={(e) => {
                        const value = e.target.value === '' ? '' : parseFloat(e.target.value) || 0
                        handleInputChange('suggested_starting_price', value, 'pricing')
                      }}
                      className="text-3xl font-bold text-center border-2 no-spinner"
                      onWheel={(e) => (e.target as HTMLInputElement).blur()}
                      placeholder="Enter price"
                    />
                  ) : (
                    <div className="text-3xl font-bold text-slate-800">
                      ${editedData.pricing.suggested_starting_price}
                    </div>
                  )}
                  <div className="text-sm text-blue-600 font-medium">Starting Price</div>
                </div>
                <div className="mt-4 pt-4 border-t border-slate-200">
                  <div className="text-xs text-slate-500">
                    Market Range: ${editedData.pricing.quick_sale_price} - ${editedData.pricing.premium_price}
                  </div>
                </div>
              </CardContent>
            </Card>


            {/* Action Button */}
            <div className="space-y-2">
              {user ? (
                <Button 
                  onClick={handleCreateListing}
                  disabled={isCreatingListing || isCheckingAgentSetup}
                  className="w-full h-12 text-base font-semibold"
                  size="lg"
                >
                  {isCreatingListing 
                    ? 'Creating Listing...' 
                    : isCheckingAgentSetup 
                    ? 'Checking Setup...'
                    : !hasSeenAgentSetup 
                    ? 'Continue with AI Agent Setup'
                    : 'Create Listing'
                  }
                </Button>
              ) : (
                <Button 
                  onClick={handleSignUp}
                  className="w-full h-12 text-base font-semibold"
                  size="lg"
                >
                  Create Account to List
                </Button>
              )}
            </div>
          </div>

          {/* Right Column - Details */}
          <div className="lg:col-span-3">
            <Card>
              <CardHeader>
                <div className="space-y-4">
                  {/* Title */}
                  <div>
                    {isEditing ? (
                      <Input
                        value={editedData.listing.title}
                        onChange={(e) => handleInputChange('title', e.target.value, 'listing')}
                        className="text-2xl font-bold border-2"
                        placeholder="Enter listing title..."
                      />
                    ) : (
                      <CardTitle className="text-2xl text-slate-800">
                        {editedData.listing.title}
                      </CardTitle>
                    )}
                  </div>
                  
                  {/* Category */}
                  <div>
                    {isEditing ? (
                      <Input
                        value={editedData.listing.furniture_type}
                        onChange={(e) => handleInputChange('furniture_type', e.target.value, 'listing')}
                        className="max-w-xs"
                        placeholder="Furniture type..."
                      />
                    ) : (
                      <Badge variant="outline" className="bg-blue-100 text-blue-800 border-blue-300 font-semibold px-4 py-2 text-sm rounded-full">
                        {editedData.listing.furniture_type}
                      </Badge>
                    )}
                  </div>
                </div>
              </CardHeader>

              <CardContent className="space-y-6">
                {/* Description */}
                <div>
                  <Label className="text-base font-semibold text-slate-700 mb-3 block">
                    Description
                  </Label>
                  {isEditing ? (
                    <Textarea
                      value={editedData.listing.description}
                      onChange={(e) => handleInputChange('description', e.target.value, 'listing')}
                      rows={6}
                      placeholder="Describe your furniture..."
                      className="resize-none"
                    />
                  ) : (
                    <p className="text-slate-600 leading-relaxed">
                      {editedData.listing.description}
                    </p>
                  )}
                </div>

                {/* Dimensions Section */}
                <div>
                  <div className="flex items-center space-x-3 mb-4">
                    <Checkbox
                      id="include-dimensions"
                      checked={includeDimensions}
                      onCheckedChange={(checked) => setIncludeDimensions(!!checked)}
                    />
                    <Label 
                      htmlFor="include-dimensions" 
                      className="text-base font-semibold text-slate-700 cursor-pointer"
                    >
                      Include Dimensions
                    </Label>
                  </div>

                  {includeDimensions && (
                    <div>
                      <button
                        onClick={() => setShowDimensions(!showDimensions)}
                        className="flex items-center gap-2 w-full text-left hover:bg-slate-50 p-2 -m-2 rounded-lg transition-colors mb-3"
                      >
                        <Label className="text-base font-semibold text-slate-700 cursor-pointer">
                          Dimensions
                        </Label>
                        {showDimensions ? (
                          <ChevronDown className="h-4 w-4 text-slate-500" />
                        ) : (
                          <ChevronRight className="h-4 w-4 text-slate-500" />
                        )}
                      </button>
                      {showDimensions && (
                        <div className="grid gap-3">
                          <div>
                            <Label className="text-xs font-medium text-slate-500 uppercase tracking-wider">
                              Estimated Dimensions
                            </Label>
                            {isEditing ? (
                              <Input
                                value={editedData.analysis.estimated_dimensions || ''}
                                onChange={(e) => handleInputChange('estimated_dimensions', e.target.value, 'analysis')}
                                placeholder="e.g., 72 inches L x 36 inches W x 32 inches H"
                                className="mt-1"
                              />
                            ) : (
                              <div className="text-slate-700 font-medium mt-1">
                                {editedData.analysis.estimated_dimensions || 'Not specified'}
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>

              </CardContent>
            </Card>
          </div>
        </div>
      </main>
      
      {/* AI Agent Setup Modal */}
      {user && (
        <FirstListingSetup
          isOpen={showAgentSetup}
          onClose={() => setShowAgentSetup(false)}
          analysisData={editedData}
          onComplete={handleAgentSetupComplete}
          isLoading={isCreatingListing}
        />
      )}
      </div>
    </>
  )
}