'use client'

import { useState } from 'react'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { ArrowLeft, Edit, Save, Camera, ChevronLeft, ChevronRight } from 'lucide-react'
import { type AIAnalysisResult } from "@/lib/api-client-new"
import Image from "next/image"

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

interface ListingPreviewProps {
  analysisData: AIAnalysisResult
  uploadedImages: string[]
  user: User | null
  onBack: () => void
  onSignUp: (editedData: AIAnalysisResult) => void
  onCreateListing?: (editedData: AIAnalysisResult, agentEnabled?: boolean) => void
}

export function ListingPreview({ analysisData, uploadedImages, user, onBack, onSignUp, onCreateListing }: ListingPreviewProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editedData, setEditedData] = useState<AIAnalysisResult>(analysisData)
  const [currentImageIndex, setCurrentImageIndex] = useState(0)
  const [isCreatingListing, setIsCreatingListing] = useState(false)
  const [agentEnabled, setAgentEnabled] = useState(false)

  const handleSignUp = () => {
    onSignUp(editedData)
  }

  const handleCreateListing = async () => {
    if (onCreateListing && !isCreatingListing) {
      setIsCreatingListing(true)
      try {
        await onCreateListing(editedData, agentEnabled)
      } catch (error) {
        // Error handling is done in parent component
      } finally {
        // Don't reset loading state here since we'll navigate away
      }
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
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
            
            <div className="text-2xl font-bold text-slate-800">SnapNest</div>
            
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
                      value={editedData.pricing.suggested_starting_price?.toString() || '0'}
                      onChange={(e) => handleInputChange('suggested_starting_price', parseInt(e.target.value) || 0, 'pricing')}
                      className="text-3xl font-bold text-center border-2"
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

            {/* AI Agent Toggle (for logged in users) */}
            {user && (
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-start space-x-3">
                    <Checkbox
                      id="agent-enabled"
                      checked={agentEnabled}
                      onCheckedChange={(checked) => setAgentEnabled(!!checked)}
                      className="mt-1"
                    />
                    <div className="space-y-1">
                      <Label 
                        htmlFor="agent-enabled" 
                        className="text-sm font-medium text-slate-700 cursor-pointer"
                      >
                        🤖 Enable AI Agent
                      </Label>
                      <p className="text-xs text-slate-500">
                        Let AI handle negotiations automatically
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Action Button */}
            <div className="space-y-2">
              {user ? (
                <Button 
                  onClick={handleCreateListing}
                  disabled={isCreatingListing}
                  className="w-full h-12 text-base font-semibold"
                  size="lg"
                >
                  {isCreatingListing ? 'Creating Listing...' : 'Create Listing'}
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
                      <Badge variant="secondary" className="text-sm px-3 py-1">
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

                {/* Dimensions */}
                <div>
                  <Label className="text-base font-semibold text-slate-700 mb-3 block">
                    Dimensions
                  </Label>
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
                </div>

              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  )
}