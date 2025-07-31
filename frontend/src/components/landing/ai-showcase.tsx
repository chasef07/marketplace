'use client'

import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Upload, ArrowRight, Star, MapPin, Loader2 } from "lucide-react"
import { useState, useRef } from "react"
import { apiClient, type AIAnalysisResult, type CreateAccountData } from "@/lib/api-client"

interface User {
  id: number
  username: string
  email: string
  full_name: string
}

interface AIShowcaseProps {
  onAccountCreated: (user: User) => void
}

export function AIShowcase({ onAccountCreated }: AIShowcaseProps) {
  const [step, setStep] = useState<'upload' | 'preview' | 'account' | 'success'>('upload')
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

  const handleCreateAccount = async (formData: FormData) => {
    if (!analysisResult) {
      setError('No listing data available')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const email = formData.get('email') as string
      const accountData: CreateAccountData = {
        full_name: formData.get('full_name') as string,
        email: email,
        phone: '', // Remove phone requirement
        location: formData.get('location') as string,
        username: email.split('@')[0], // Use email prefix as username
        password: formData.get('password') as string
      }

      // Convert condition_score to condition string
      const getConditionFromScore = (score: number): 'excellent' | 'good' | 'fair' | 'poor' => {
        if (score >= 8) return 'excellent'
        if (score >= 6) return 'good'
        if (score >= 4) return 'fair'
        return 'poor'
      }

      const listingData = {
        name: analysisResult.listing.title,
        description: analysisResult.listing.description,
        furniture_type: analysisResult.listing.furniture_type,
        starting_price: analysisResult.pricing.suggested_starting_price,
        min_price: analysisResult.pricing.suggested_min_price,
        condition: getConditionFromScore(analysisResult.analysis.condition_score),
        image_filename: analysisResult.image_filename
      }

      await apiClient.createAccountAndListing(accountData, listingData)
      
      // Get the current user info and notify parent component
      const user = await apiClient.getCurrentUser()
      if (user) {
        onAccountCreated(user)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create account and listing')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 via-blue-700 to-blue-800">
      {/* Header */}
      <header className="bg-white/10 backdrop-blur-sm border-b border-white/20">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-white">FurnitureMarket</h1>
            <div className="flex items-center gap-4">
              <Button variant="outline" size="sm" className="border-white/30 text-white hover:bg-white/10" onClick={() => window.location.href = 'http://localhost:8000/login'}>
                Sign In
              </Button>
              <Button size="sm" className="bg-white text-blue-700 hover:bg-blue-50" onClick={() => window.location.href = 'http://localhost:8000'}>
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
          <div className="max-w-2xl mx-auto text-center">
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-6 font-inter">
              The AI-Powered Furniture Marketplace
            </h2>
            <p className="text-xl text-blue-100 mb-8 font-inter max-w-3xl mx-auto leading-relaxed">
              Buy and sell furniture with intelligent AI assistance. Upload a photo and our advanced AI instantly analyzes, prices, and creates professional listings. Smart negotiations powered by AI personalities make every deal smooth and fair.
            </p>
            <p className="text-lg text-blue-200 mb-12 font-inter">
              Experience the future of furniture trading - where artificial intelligence meets marketplace efficiency.
            </p>

            {/* Hidden file input */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              className="hidden"
            />

            {/* Upload Area */}
            <div 
              className={`border-2 border-dashed rounded-xl p-12 transition-colors cursor-pointer ${
                dragActive 
                  ? 'border-blue-500 bg-blue-50' 
                  : 'border-gray-300 hover:border-gray-400'
              } ${loading ? 'pointer-events-none opacity-50' : ''}`}
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
              <div className="flex flex-col items-center">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
                  {loading ? (
                    <Loader2 className="h-8 w-8 text-blue-600 animate-spin" />
                  ) : (
                    <Upload className="h-8 w-8 text-blue-600" />
                  )}
                </div>
                <h3 className="text-xl font-semibold text-white mb-2 font-inter">
                  {loading ? 'AI Analyzing Your Photo...' : 'Upload Your Furniture Photo'}
                </h3>
                <p className="text-blue-100 mb-6 font-inter">
                  {loading ? 'Advanced AI is examining the image and generating professional listing details' : 'Drag and drop an image here, or click to browse'}
                </p>
                {!loading && (
                  <Button className="bg-white text-blue-700 hover:bg-blue-50 font-inter font-medium">
                    Choose Photo
                  </Button>
                )}
              </div>
            </div>

            <div className="mt-12 text-center">
              <p className="text-sm text-blue-200 font-inter">
                Try uploading a photo of your furniture to see AI magic in action
              </p>
            </div>
          </div>
        )}

        {step === 'preview' && analysisResult && (
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold text-white mb-2 font-inter">
                ✨ Your listing is ready!
              </h2>
              <p className="text-blue-100 font-inter">
                AI analyzed your photo and created this professional listing in seconds
              </p>
            </div>

            <div className="grid lg:grid-cols-2 gap-8">
              {/* Preview Card */}
              <Card className="bg-white">
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
                  
                  <div className="p-6">
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
              <div className="space-y-6">
                <div>
                  <h4 className="font-semibold text-white mb-3 font-inter">AI-Generated Description</h4>
                  <div className="bg-white rounded-lg p-4 border">
                    <p className="text-gray-700 leading-relaxed">
                      {analysisResult.listing.description}
                    </p>
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold text-white mb-3 font-inter">AI-Detected Details</h4>
                  <div className="bg-white rounded-lg p-4 border">
                    <ul className="space-y-2">
                      <li className="text-sm text-gray-700">• Style: {analysisResult.analysis.style}</li>
                      <li className="text-sm text-gray-700">• Material: {analysisResult.analysis.material}</li>
                      <li className="text-sm text-gray-700">• Brand: {analysisResult.analysis.brand}</li>
                      <li className="text-sm text-gray-700">• Condition: {analysisResult.analysis.condition_score}/10 ({analysisResult.analysis.condition_notes})</li>
                      <li className="text-sm text-gray-700">• Type: {analysisResult.analysis.furniture_type}</li>
                    </ul>
                  </div>
                </div>

                <div className="flex gap-4">
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      setStep('upload')
                      setAnalysisResult(null)
                      setUploadedImage(null)
                      setError(null)
                    }}
                    className="flex-1"
                  >
                    Try Another Photo
                  </Button>
                  <Button 
                    onClick={() => setStep('account')}
                    className="flex-1 bg-white text-blue-700 hover:bg-blue-50 font-inter font-medium"
                  >
                    Create Listing
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {step === 'account' && (
          <div className="max-w-md mx-auto">
            <div className="bg-white rounded-lg p-8 shadow-sm border">
              <div className="text-center mb-6">
                <h2 className="text-2xl font-bold text-white mb-2 font-inter">
                  Almost done! 
                </h2>
                <p className="text-blue-100 font-inter">
                  Create your account to publish this listing
                </p>
              </div>

              <form 
                onSubmit={(e) => {
                  e.preventDefault()
                  const formData = new FormData(e.currentTarget)
                  handleCreateAccount(formData)
                }}
                className="space-y-4"
              >
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Full Name *
                  </label>
                  <input
                    name="full_name"
                    type="text"
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter your name"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email *
                  </label>
                  <input
                    name="email"
                    type="email"
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="your@email.com"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Password *
                  </label>
                  <input
                    name="password"
                    type="password"
                    required
                    minLength={6}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Choose a password (min 6 characters)"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Your Location
                  </label>
                  <input
                    name="location"
                    type="text"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Brooklyn, NY"
                  />
                </div>

                <Button 
                  type="submit"
                  disabled={loading}
                  className="w-full bg-white text-blue-700 hover:bg-blue-50 py-3 font-inter font-medium"
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creating Account...
                    </>
                  ) : (
                    'Create Account & Publish Listing'
                  )}
                </Button>
              </form>

              <p className="text-xs text-gray-500 text-center mt-4">
                By creating an account, you agree to our Terms of Service and Privacy Policy
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}