'use client'

import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Upload, ArrowRight, Star, MapPin, Plus } from "lucide-react"
import { useState, useRef } from "react"
import { apiClient, type AIAnalysisResult, type CreateListingData } from "@/lib/api-client"

interface User {
  id: number
  username: string
  email: string
  seller_personality: string
  buyer_personality: string
  is_active: boolean
  created_at: string
  last_login?: string
}

interface SellerUploadProps {
  user: User
  onLogout: () => void
  onBackToMarketplace: () => void
  onSellerDashboard: () => void
  onListingCreated?: () => void
}

export function SellerUpload({ 
  user, 
  onLogout, 
  onBackToMarketplace, 
  onSellerDashboard,
  onListingCreated 
}: SellerUploadProps) {
  const [step, setStep] = useState<'upload' | 'preview' | 'success'>('upload')
  const [dragActive, setDragActive] = useState(false)
  const [loading, setLoading] = useState(false)
  const [analysisResult, setAnalysisResult] = useState<AIAnalysisResult | null>(null)
  const [uploadedImage, setUploadedImage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [creatingListing, setCreatingListing] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      setError('Please select an image file')
      return
    }

    setLoading(true)
    setError(null)

    try {
      // Create preview URL
      const imageUrl = URL.createObjectURL(file)
      setUploadedImage(imageUrl)

      // Analyze with AI
      const result = await apiClient.uploadAndAnalyzeImage(file)
      setAnalysisResult(result)
      setStep('preview')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to analyze image')
      setUploadedImage(null)
    } finally {
      setLoading(false)
    }
  }

  const handleImageUpload = (e?: React.ChangeEvent<HTMLInputElement>) => {
    const file = e?.target?.files?.[0]
    if (file) {
      handleFileSelect(file)
    } else {
      // Trigger file input
      fileInputRef.current?.click()
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragActive(false)
    
    const file = e.dataTransfer.files[0]
    if (file) {
      handleFileSelect(file)
    }
  }

  const handleCreateListing = async () => {
    if (!analysisResult) return

    setCreatingListing(true)
    setError(null)

    try {
      const getConditionFromScore = (score: number): 'excellent' | 'good' | 'fair' | 'poor' => {
        if (score >= 8) return 'excellent'
        if (score >= 6) return 'good'
        if (score >= 4) return 'fair'
        return 'poor'
      }

      const listingData: CreateListingData = {
        name: analysisResult.listing.title,
        description: analysisResult.listing.description,
        furniture_type: analysisResult.listing.furniture_type,
        starting_price: parseFloat(analysisResult.pricing.suggested_starting_price.toString()),
        condition: getConditionFromScore(analysisResult.analysis.condition_score),
        image_filename: analysisResult.image_filename
      }

      await apiClient.createListing(listingData)
      setStep('success')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create listing')
    } finally {
      setCreatingListing(false)
    }
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-gray-900">FurnitureMarket</h1>
            
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-600">
                Welcome, {user.username}!
              </span>
              <Button 
                variant="outline"
                size="sm"
                onClick={onBackToMarketplace}
                className="border-blue-600 text-blue-600 hover:bg-blue-50"
              >
                Marketplace
              </Button>
              <Button 
                variant="outline"
                size="sm"
                onClick={onSellerDashboard}
                className="border-blue-600 text-blue-600 hover:bg-blue-50"
              >
                Dashboard
              </Button>
              <Button variant="outline" size="sm" onClick={onLogout}>
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-12">
        {error && (
          <div className="max-w-2xl mx-auto mb-8">
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-red-800">{error}</p>
            </div>
          </div>
        )}

        {step === 'upload' && (
          <div className="max-w-3xl mx-auto text-center">
            <div className="animate-fade-in-up">
              <h2 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6 leading-tight">
                Sell another item
                <span className="bg-gradient-to-r from-blue-400 to-blue-600 bg-clip-text text-transparent"> with AI</span>
              </h2>
              <p className="text-xl text-gray-600 mb-12 max-w-2xl mx-auto leading-relaxed">
                Upload a photo. AI handles the rest.
              </p>
            </div>

            {/* Hidden file input */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              className="hidden"
            />

            {/* Upload Area */}
            <div className="animate-fade-in-up delay-200">
              <div 
                className={`border-2 border-dashed rounded-2xl p-16 transition-all duration-300 cursor-pointer group ${
                  dragActive 
                    ? 'border-blue-500 bg-blue-50 scale-105' 
                    : 'border-gray-200 hover:border-gray-300 hover:bg-white'
                } ${loading ? 'pointer-events-none' : ''}`}
                onDragEnter={(e) => {
                  e.preventDefault()
                  setDragActive(true)
                }}
                onDragLeave={(e) => {
                  e.preventDefault()
                  setDragActive(false)
                }}
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleDrop}
                onClick={() => !loading && handleImageUpload()}
              >
                <div className="flex flex-col items-center relative">
                  {loading && (
                    <div className="absolute inset-0 flex items-center justify-center bg-white/90 rounded-2xl z-10">
                      <div className="text-center">
                        <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                        <div className="text-gray-900 font-medium mb-2">AI is analyzing...</div>
                        <div className="text-sm text-gray-600">Creating your listing</div>
                      </div>
                    </div>
                  )}
                  
                  <div className="w-20 h-20 bg-white border rounded-full flex items-center justify-center mb-6 group-hover:bg-gray-50 transition-colors">
                    <Upload className="h-10 w-10 text-gray-600" />
                  </div>
                  
                  <h3 className="text-2xl font-semibold text-gray-900 mb-3">
                    Drop your photo here
                  </h3>
                  
                  <p className="text-gray-500 mb-8">
                    or click to browse
                  </p>
                  
                  <Button className="bg-blue-600 text-white hover:bg-blue-700 px-8 py-3 text-base font-medium rounded-full">
                    Choose Photo
                  </Button>
                </div>
              </div>
            </div>

            <div className="mt-12 text-center animate-fade-in-up delay-300">
              <p className="text-sm text-gray-400">
                Supports JPG, PNG, HEIC • Max 10MB
              </p>
            </div>
          </div>
        )}

        {step === 'preview' && analysisResult && (
          <div className="max-w-5xl mx-auto animate-fade-in-up">
            <div className="text-center mb-12">
              <h2 className="text-4xl font-bold text-gray-900 mb-4">
                ✨ Your listing is ready
              </h2>
              <p className="text-gray-600 text-lg">
                AI analyzed your photo in seconds
              </p>
            </div>

            <div className="grid lg:grid-cols-2 gap-12">
              {/* Preview Card */}
              <Card className="bg-white border-0 shadow-xl">
                <CardContent className="p-0">
                  {/* Image */}
                  <div className="bg-white border-b h-64 flex items-center justify-center rounded-t-lg overflow-hidden">
                    {uploadedImage ? (
                      <img 
                        src={uploadedImage} 
                        alt="Uploaded furniture" 
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="text-8xl">🪑</div>
                    )}
                  </div>
                  
                  <div className="p-8">
                    {/* Price */}
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <p className="text-3xl font-bold text-gray-900">
                          ${analysisResult.pricing.suggested_starting_price}
                        </p>
                        <p className="text-sm text-green-600">AI-suggested price</p>
                        <p className="text-xs text-gray-500">
                          Market range: ${analysisResult.pricing.quick_sale_price} - ${analysisResult.pricing.premium_price}
                        </p>
                      </div>
                      <div className="text-right">
                        <div className="flex items-center gap-1 text-sm text-gray-600">
                          <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                          <span>{user.username}</span>
                        </div>
                      </div>
                    </div>

                    {/* Title */}
                    <h3 className="text-xl font-semibold text-gray-900 mb-3">
                      {analysisResult.listing.title}
                    </h3>

                    {/* Location */}
                    <div className="flex items-center gap-1 text-sm text-gray-600 mb-4">
                      <MapPin className="h-4 w-4" />
                      <span>Your Location</span>
                    </div>

                    {/* Category */}
                    <div className="mb-4">
                      <span className="inline-block bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full capitalize">
                        {analysisResult.listing.furniture_type}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Details */}
              <div className="space-y-8">
                <div>
                  <h4 className="font-semibold text-gray-900 mb-4 text-lg">Description</h4>
                  <div className="bg-white rounded-xl p-6 border">
                    <p className="text-gray-700 leading-relaxed">
                      {analysisResult.listing.description}
                    </p>
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold text-gray-900 mb-4 text-lg">AI Analysis</h4>
                  <div className="bg-white rounded-xl p-6 border">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="text-sm"><span className="font-medium text-gray-900">Style:</span> <span className="text-gray-600">{analysisResult.analysis.style}</span></div>
                      <div className="text-sm"><span className="font-medium text-gray-900">Material:</span> <span className="text-gray-600">{analysisResult.analysis.material}</span></div>
                      <div className="text-sm"><span className="font-medium text-gray-900">Brand:</span> <span className="text-gray-600">{analysisResult.analysis.brand}</span></div>
                      <div className="text-sm"><span className="font-medium text-gray-900">Condition:</span> <span className="text-gray-600">{analysisResult.analysis.condition_score}/10</span></div>
                    </div>
                  </div>
                </div>

                <div className="flex gap-4 pt-4">
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      setStep('upload')
                      setAnalysisResult(null)
                      setUploadedImage(null)
                      setError(null)
                    }}
                    className="flex-1 border-gray-300 text-gray-700 hover:bg-white rounded-full py-3"
                    disabled={creatingListing}
                  >
                    Try Another
                  </Button>
                  <Button 
                    onClick={handleCreateListing}
                    disabled={creatingListing}
                    className="flex-1 bg-blue-600 text-white hover:bg-blue-700 rounded-full py-3 font-medium"
                  >
                    {creatingListing ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                        Creating...
                      </>
                    ) : (
                      <>
                        Create Listing
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {step === 'success' && (
          <div className="max-w-3xl mx-auto text-center animate-fade-in-up">
            <div className="bg-green-50 border border-green-200 rounded-2xl p-12 mb-8">
              <div className="text-6xl mb-6">🎉</div>
              <h2 className="text-4xl font-bold text-gray-900 mb-4">
                Listing Created!
              </h2>
              <p className="text-gray-600 text-lg mb-8">
                Your item is now live on the marketplace and ready for buyers.
              </p>
              
              <div className="flex gap-4 justify-center">
                <Button 
                  onClick={onBackToMarketplace}
                  className="bg-blue-600 text-white hover:bg-blue-700 px-6 py-3 rounded-full"
                >
                  View Marketplace
                </Button>
                <Button 
                  onClick={onSellerDashboard}
                  variant="outline"
                  className="border-blue-600 text-blue-600 hover:bg-blue-50 px-6 py-3 rounded-full"
                >
                  Manage Listings
                </Button>
                <Button 
                  onClick={() => {
                    setStep('upload')
                    setAnalysisResult(null)
                    setUploadedImage(null)
                    setError(null)
                  }}
                  variant="outline"
                  className="border-gray-300 text-gray-700 hover:bg-gray-50 px-6 py-3 rounded-full"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Sell Another
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}