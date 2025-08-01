'use client'

import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Upload, ArrowRight, Star, MapPin } from "lucide-react"
import { useState, useRef } from "react"
import { apiClient, type AIAnalysisResult } from "@/lib/api-client"


interface AIShowcaseProps {
  onSignInClick?: () => void
  onBrowseClick?: () => void
  onPendingListing?: (analysisData: AIAnalysisResult) => void
}

export function AIShowcase({ onSignInClick, onBrowseClick, onPendingListing }: AIShowcaseProps) {
  const [step, setStep] = useState<'upload' | 'preview'>('upload')
  const [dragActive, setDragActive] = useState(false)
  const [loading, setLoading] = useState(false)
  const [analysisResult, setAnalysisResult] = useState<AIAnalysisResult | null>(null)
  const [uploadedImage, setUploadedImage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
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


  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="bg-white border-b border-gray-100">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-gray-900">FurnitureMarket</h1>
            <div className="flex items-center gap-3">
              <Button variant="outline" size="sm" className="border-gray-300 text-gray-700 hover:bg-gray-50" onClick={onSignInClick}>
                Sign In
              </Button>
              <Button size="sm" className="bg-gray-900 text-white hover:bg-gray-800" onClick={onBrowseClick}>
                Browse Items
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
                Sell furniture
                <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent"> with AI</span>
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
                    : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
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
                  
                  <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-6 group-hover:bg-gray-200 transition-colors">
                    <Upload className="h-10 w-10 text-gray-600" />
                  </div>
                  
                  <h3 className="text-2xl font-semibold text-gray-900 mb-3">
                    Drop your photo here
                  </h3>
                  
                  <p className="text-gray-500 mb-8">
                    or click to browse
                  </p>
                  
                  <Button className="bg-gray-900 text-white hover:bg-gray-800 px-8 py-3 text-base font-medium rounded-full">
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
                  <div className="bg-gray-100 h-64 flex items-center justify-center rounded-t-lg overflow-hidden">
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
                          <span>New seller</span>
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
                  <div className="bg-gray-50 rounded-xl p-6 border">
                    <p className="text-gray-700 leading-relaxed">
                      {analysisResult.listing.description}
                    </p>
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold text-gray-900 mb-4 text-lg">AI Analysis</h4>
                  <div className="bg-gray-50 rounded-xl p-6 border">
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
                    className="flex-1 border-gray-300 text-gray-700 hover:bg-gray-50 rounded-full py-3"
                  >
                    Try Another
                  </Button>
                  <Button 
                    onClick={() => {
                      if (analysisResult && onPendingListing) {
                        onPendingListing(analysisResult)
                      }
                      onSignInClick?.()
                    }}
                    className="flex-1 bg-gray-900 text-white hover:bg-gray-800 rounded-full py-3 font-medium"
                  >
                    Sign Up to Create Listing
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}