import { useState, useCallback, useRef } from 'react'
import { type AIAnalysisResult } from '@/lib/api-client-new'

export interface UseFileUploadOptions {
  onShowListingPreview: (analysisData: AIAnalysisResult, uploadedImages: string[]) => void
  showProgressSteps?: boolean
}

export function useFileUpload({ onShowListingPreview, showProgressSteps = false }: UseFileUploadOptions) {
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [progressMessage, setProgressMessage] = useState('')
  
  // Persistent upload state management using useRef hooks
  const uploadStateRef = useRef<'idle' | 'uploading' | 'processing'>('idle')
  const activeUploadRef = useRef<Promise<void> | null>(null)
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null)

  const uploadAndAnalyze = useCallback(async (files: File[]) => {
    if (files.length === 0) return

    // Prevent duplicate uploads
    if (uploadStateRef.current !== 'idle') {
      console.warn('Upload already in progress')
      return
    }

    // If there's an active upload promise, wait for it to complete
    if (activeUploadRef.current) {
      try {
        await activeUploadRef.current
      } catch (error) {
        console.warn('Previous upload completed with error:', error)
      }
    }

    const uploadPromise = (async () => {
      try {
        uploadStateRef.current = 'uploading'
        setIsAnalyzing(true)
        setUploadProgress(0)
        setProgressMessage('Uploading images...')

        // Clear any existing progress interval
        if (progressIntervalRef.current) {
          clearInterval(progressIntervalRef.current)
          progressIntervalRef.current = null
        }

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
          progressIntervalRef.current = setInterval(() => {
            if (stepIndex < progressSteps.length && uploadStateRef.current !== 'idle') {
              const step = progressSteps[stepIndex]
              setUploadProgress(step.progress)
              setProgressMessage(step.message)
              stepIndex++
            } else {
              if (progressIntervalRef.current) {
                clearInterval(progressIntervalRef.current)
                progressIntervalRef.current = null
              }
            }
          }, 800)
        }

        uploadStateRef.current = 'processing'

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

        // Clear progress interval
        if (progressIntervalRef.current) {
          clearInterval(progressIntervalRef.current)
          progressIntervalRef.current = null
        }
        
        if (showProgressSteps) {
          setUploadProgress(100)
          setProgressMessage('Analysis complete!')
        }

        if (!response.ok) {
          throw new Error('Analysis failed')
        }

        const result = await response.json()
        
        // Create image URLs for the uploaded files (using stable references)
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
        const completeUpload = () => {
          if (uploadStateRef.current !== 'idle') { // Only complete if still processing
            uploadStateRef.current = 'idle'
            setIsAnalyzing(false)
            setUploadProgress(0)
            setProgressMessage('')
            onShowListingPreview(enrichedResult, imageUrls)
          }
        }
        
        if (showProgressSteps) {
          // Small delay for UX (InteractiveUploadZone behavior)
          setTimeout(completeUpload, 500)
        } else {
          // Immediate completion (HeroSection behavior)
          completeUpload()
        }

      } catch (error) {
        console.error('Upload failed:', error)
        
        // Clean up progress interval
        if (progressIntervalRef.current) {
          clearInterval(progressIntervalRef.current)
          progressIntervalRef.current = null
        }
        
        // Reset state only if we're still processing this upload
        if (uploadStateRef.current !== 'idle') {
          uploadStateRef.current = 'idle'
          setIsAnalyzing(false)
          setUploadProgress(0)
          setProgressMessage('')
          alert('Upload failed. Please try again.')
        }
        throw error
      }
    })()

    // Store the active promise
    activeUploadRef.current = uploadPromise

    try {
      await uploadPromise
    } finally {
      // Clear the active promise when done
      if (activeUploadRef.current === uploadPromise) {
        activeUploadRef.current = null
      }
    }
  }, [onShowListingPreview, showProgressSteps])

  // Cleanup function to reset state and clear intervals
  const cleanup = useCallback(() => {
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current)
      progressIntervalRef.current = null
    }
    uploadStateRef.current = 'idle'
    activeUploadRef.current = null
    setIsAnalyzing(false)
    setUploadProgress(0)
    setProgressMessage('')
  }, [])

  return {
    uploadAndAnalyze,
    isAnalyzing,
    uploadProgress,
    progressMessage,
    cleanup,
    isUploading: uploadStateRef.current !== 'idle'
  }
}