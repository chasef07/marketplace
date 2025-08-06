'use client'

import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Upload, ArrowRight, Star, MapPin } from "lucide-react"
import { useState, useRef } from "react"
import { apiClient, type AIAnalysisResult } from "@/lib/api-client-new"


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
              <Button variant="outline" size="sm" className="border-gray-300 text-gray-700 hover:bg-white" onClick={onSignInClick}>
                Sign In
              </Button>
              <Button size="sm" className="bg-blue-600 text-white hover:bg-blue-700" onClick={onBrowseClick}>
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
                className={`border-2 border-dashed rounded-2xl p-16 transition-all duration-300 cursor-pointer group relative ${
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
                {loading && (
                  <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-blue-950/98 via-blue-900/98 to-blue-800/98 backdrop-blur-xl rounded-2xl z-50 overflow-hidden">
                    {/* Animated background pattern */}
                    <div className="absolute inset-0">
                      <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 via-blue-400/10 to-blue-600/10 animate-pulse"></div>
                      <div className="absolute top-0 left-0 w-full h-full">
                        <div className="absolute top-1/4 left-1/4 w-32 h-32 bg-blue-500/20 rounded-full blur-3xl animate-float"></div>
                        <div className="absolute top-3/4 right-1/4 w-24 h-24 bg-blue-400/20 rounded-full blur-2xl animate-float-delayed"></div>
                        <div className="absolute bottom-1/4 left-1/3 w-20 h-20 bg-blue-600/20 rounded-full blur-xl animate-float-slow"></div>
                      </div>
                    </div>
                    
                    {/* Main content */}
                    <div className="relative text-center z-10">
                      {/* Central AI orb */}
                      <div className="relative mb-8">
                        <div className="w-20 h-20 mx-auto relative">
                          {/* Outer rotating ring */}
                          <div className="absolute inset-0 rounded-full border-2 border-blue-400 animate-spin-slow opacity-80"></div>
                          <div className="absolute inset-1 rounded-full border border-blue-300 animate-spin-reverse opacity-60"></div>
                          
                          {/* Central core */}
                          <div className="absolute inset-3 rounded-full bg-gradient-to-br from-blue-400 via-blue-500 to-blue-600 animate-pulse shadow-2xl shadow-blue-500/50">
                            <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-white/20 to-transparent"></div>
                            <div className="absolute inset-2 rounded-full bg-gradient-to-br from-blue-300/30 to-blue-500/30 animate-ping"></div>
                          </div>
                          
                          {/* Particle effects */}
                          <div className="absolute -top-2 -left-2 w-2 h-2 bg-blue-300 rounded-full animate-float opacity-80 blur-sm"></div>
                          <div className="absolute -top-1 -right-3 w-1.5 h-1.5 bg-blue-400 rounded-full animate-float-delayed opacity-70 blur-sm"></div>
                          <div className="absolute -bottom-3 -left-1 w-1 h-1 bg-blue-500 rounded-full animate-float-slow opacity-60 blur-sm"></div>
                          <div className="absolute -bottom-2 -right-2 w-2 h-2 bg-blue-300 rounded-full animate-float opacity-75 blur-sm"></div>
                        </div>
                      </div>
                      
                      {/* Text with gradient effect */}
                      <div className="space-y-3">
                        <div className="text-2xl font-bold bg-gradient-to-r from-blue-200 via-blue-100 to-blue-300 bg-clip-text text-transparent animate-pulse">
                          AI Neural Processing
                        </div>
                        <div className="text-sm text-blue-200/80 font-medium tracking-wide">
                          Analyzing visual patterns • Extracting features • Generating insights
                        </div>
                        
                        {/* Progress indicator */}
                        <div className="mt-6 w-64 mx-auto">
                          <div className="h-1 bg-white/10 rounded-full overflow-hidden">
                            <div className="h-full bg-gradient-to-r from-blue-400 via-blue-500 to-blue-600 rounded-full animate-progress-bar"></div>
                          </div>
                          <div className="flex justify-between text-xs text-blue-200/60 mt-2">
                            <span>Image Recognition</span>
                            <span>Feature Analysis</span>
                            <span>Price Estimation</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                
                <div className={`flex flex-col items-center ${loading ? 'opacity-0' : 'opacity-100'} transition-opacity duration-300`}>
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
                    className="flex-1 bg-blue-600 text-white hover:bg-blue-700 rounded-full py-3 font-medium"
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