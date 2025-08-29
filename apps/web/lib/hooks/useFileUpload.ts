import { useState, useCallback } from 'react'
import { type AIAnalysisResult } from '@/lib/api-client-new'

export interface UseFileUploadOptions {
  onShowListingPreview: (analysisData: AIAnalysisResult, uploadedImages: string[]) => void
  showProgressSteps?: boolean
}

export function useFileUpload({ onShowListingPreview, showProgressSteps = false }: UseFileUploadOptions) {
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [progressMessage, setProgressMessage] = useState('')

  const uploadAndAnalyze = useCallback(async (files: File[]) => {
    if (files.length === 0) return

    setIsAnalyzing(true)
    setUploadProgress(0)
    setProgressMessage('Uploading images...')

    try {
      let progressInterval: NodeJS.Timeout | null = null

      // Show progress steps if requested (for InteractiveUploadZone)
      if (showProgressSteps) {
        const progressSteps = [
          { progress: 20, message: "Uploading images..." },
          { progress: 35, message: "Processing images..." },
          { progress: 60, message: "Identifying furniture..." },
          { progress: 80, message: "Analyzing style & material..." },
          { progress: 95, message: "Calculating price..." }
        ]
        
        let stepIndex = 0
        progressInterval = setInterval(() => {
          if (stepIndex < progressSteps.length) {
            const step = progressSteps[stepIndex]
            setUploadProgress(step.progress)
            setProgressMessage(step.message)
            stepIndex++
          } else {
            clearInterval(progressInterval!)
          }
        }, 800)
      }

      // Create FormData for the API call
      const formData = new FormData()
      files.forEach((file, index) => {
        formData.append(`image${index}`, file)
      })

      // Call the actual AI analysis API
      const response = await fetch('/api/ai/analyze-images', {
        method: 'POST',
        body: formData,
      })

      if (progressInterval) {
        clearInterval(progressInterval)
      }
      
      if (showProgressSteps) {
        setUploadProgress(100)
        setProgressMessage('Analysis complete!')
      }

      if (!response.ok) {
        throw new Error('Analysis failed')
      }

      const result = await response.json()
      
      // Create image URLs for the uploaded files
      const imageUrls = files.map(file => URL.createObjectURL(file))
      
      // Add the images metadata to the result for compatibility
      const enrichedResult = {
        ...result,
        images: result.images || imageUrls.map((_, index) => ({
          filename: `temp-${index}`,
          order: index + 1,
          is_primary: index === 0
        }))
      }
      
      // Handle completion based on whether we're showing progress steps
      if (showProgressSteps) {
        // Small delay for UX (InteractiveUploadZone behavior)
        setTimeout(() => {
          setIsAnalyzing(false)
          setUploadProgress(0)
          setProgressMessage('')
          onShowListingPreview(enrichedResult, imageUrls)
        }, 500)
      } else {
        // Immediate completion (HeroSection behavior)
        setIsAnalyzing(false)
        onShowListingPreview(enrichedResult, imageUrls)
      }

    } catch (error) {
      console.error('Upload failed:', error)
      setIsAnalyzing(false)
      setUploadProgress(0)
      setProgressMessage('')
      alert('Upload failed. Please try again.')
    }
  }, [onShowListingPreview, showProgressSteps])

  return {
    uploadAndAnalyze,
    isAnalyzing,
    uploadProgress,
    progressMessage
  }
}