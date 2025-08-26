'use client'

import { useState, useRef, useCallback } from 'react'
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { type AIAnalysisResult } from "@/lib/api-client-new"
import { Camera, Upload } from "lucide-react"

interface InteractiveUploadZoneProps {
  onShowListingPreview: (analysisData: AIAnalysisResult, uploadedImages: string[]) => void
}

export function InteractiveUploadZone({ onShowListingPreview }: InteractiveUploadZoneProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [progressMessage, setProgressMessage] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleFiles = useCallback(async (files: File[]) => {
    if (files.length === 0) return

    const imageFiles = files.filter(file => file.type.startsWith('image/'))
    if (imageFiles.length === 0) {
      alert('Please select image files only')
      return
    }

    setIsAnalyzing(true)
    setUploadProgress(0)
    setProgressMessage('Uploading images...')

    try {
      // Simulate realistic AI analysis progress
      const progressSteps = [
        { progress: 20, message: "Uploading images..." },
        { progress: 35, message: "Processing images..." },
        { progress: 60, message: "Identifying furniture..." },
        { progress: 80, message: "Analyzing style & material..." },
        { progress: 95, message: "Calculating price..." }
      ]
      
      let stepIndex = 0
      const progressInterval = setInterval(() => {
        if (stepIndex < progressSteps.length) {
          const step = progressSteps[stepIndex]
          setUploadProgress(step.progress)
          setProgressMessage(step.message)
          stepIndex++
        } else {
          clearInterval(progressInterval)
        }
      }, 800)

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

      clearInterval(progressInterval)
      setUploadProgress(100)
      setProgressMessage('Analysis complete!')

      if (!response.ok) {
        throw new Error('Analysis failed')
      }

      const result = await response.json()
      
      // Small delay for UX
      setTimeout(() => {
        setIsAnalyzing(false)
        setUploadProgress(0)
        setProgressMessage('')
        
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
        
        // Show the listing preview
        onShowListingPreview(enrichedResult, imageUrls)
      }, 500)

    } catch (error) {
      console.error('Upload failed:', error)
      setIsAnalyzing(false)
      setUploadProgress(0)
      setProgressMessage('')
      alert('Upload failed. Please try again.')
    }
  }, [onShowListingPreview])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    
    const files = Array.from(e.dataTransfer.files)
    handleFiles(files)
  }, [handleFiles])

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    handleFiles(files)
  }, [handleFiles])

  const handleClick = () => {
    if (isAnalyzing) return
    fileInputRef.current?.click()
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardContent className="p-6">
        <div 
          className={`
            border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-all
            ${isDragging 
              ? 'border-blue-500 bg-blue-50' 
              : 'border-slate-300 hover:border-slate-400 hover:bg-slate-50'
            }
            ${isAnalyzing ? 'cursor-not-allowed' : 'cursor-pointer'}
          `}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={handleClick}
        >
          <input
            ref={fileInputRef}
            id="hidden-file-input"
            type="file"
            multiple
            accept="image/*"
            onChange={handleFileSelect}
            className="hidden"
          />

          {isAnalyzing ? (
            <div className="space-y-4">
              <div className="w-12 h-12 mx-auto text-blue-600">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
              </div>
              
              <div>
                <h3 className="text-lg font-semibold text-slate-800 mb-2">
                  AI Analyzing Your Furniture...
                </h3>
                <p className="text-sm text-slate-600 mb-4">{progressMessage}</p>
                <Progress value={uploadProgress} className="w-full" />
                <p className="text-xs text-slate-500 mt-2">{uploadProgress}% complete</p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="w-12 h-12 mx-auto text-slate-400">
                <Camera className="w-full h-full" />
              </div>
              
              <div>
                <h3 className="text-lg font-semibold text-slate-800 mb-2">
                  Drop photos here
                </h3>
                <p className="text-sm text-slate-600 mb-4">
                  AI will analyze and create your listing
                </p>
                
                <Button variant="outline" className="mb-4">
                  <Upload className="w-4 h-4 mr-2" />
                  Choose Files
                </Button>
                
                <div className="flex justify-center space-x-4 text-xs text-slate-500">
                  <span>✨ Instant Analysis</span>
                  <span>💰 Smart Pricing</span>
                  <span>📝 Complete Listings</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}