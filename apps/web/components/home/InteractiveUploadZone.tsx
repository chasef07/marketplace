'use client'

import { useState, useRef, useCallback } from 'react'
import { colors, gradients, shadows } from './design-system/colors'
import { animations, animationClasses } from './design-system/animations'
import { type AIAnalysisResult } from "@/lib/api-client-new"

interface InteractiveUploadZoneProps {
  onShowListingPreview: (analysisData: AIAnalysisResult, uploadedImages: string[]) => void
}

export function InteractiveUploadZone({ onShowListingPreview }: InteractiveUploadZoneProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [isHovered, setIsHovered] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    
    const files = Array.from(e.dataTransfer.files)
    handleFiles(files)
  }, [])

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    handleFiles(files)
  }, [])

  const handleFiles = async (files: File[]) => {
    if (files.length === 0) return

    const imageFiles = files.filter(file => file.type.startsWith('image/'))
    if (imageFiles.length === 0) {
      alert('Please select image files only')
      return
    }

    setIsAnalyzing(true)
    setUploadProgress(0)

    try {
      // Simulate upload progress
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval)
            return 90
          }
          return prev + Math.random() * 20
        })
      }, 200)

      // Create FormData for the API call
      const formData = new FormData()
      imageFiles.forEach((file, index) => {
        formData.append(`image${index}`, file)
      })

      // Call the actual AI analysis API (multiple images endpoint)
      const response = await fetch('/api/ai/analyze-images', {
        method: 'POST',
        body: formData,
      })

      clearInterval(progressInterval)
      setUploadProgress(100)

      if (!response.ok) {
        throw new Error('Analysis failed')
      }

      const result = await response.json()
      
      // Small delay for UX
      setTimeout(() => {
        setIsAnalyzing(false)
        setUploadProgress(0)
        
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
      alert('Upload failed. Please try again.')
    }
  }

  const handleClick = () => {
    fileInputRef.current?.click()
  }

  return (
    <div className="upload-zone-container">
      <div 
        className={`upload-zone ${isDragging ? 'dragging' : ''} ${isAnalyzing ? 'analyzing' : ''} ${isHovered ? 'hovered' : ''}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onClick={handleClick}
      >
        <input
          ref={fileInputRef}
          id="hidden-file-input"
          type="file"
          multiple
          accept="image/*"
          onChange={handleFileSelect}
          className="file-input"
        />

        {isAnalyzing ? (
          <div className="analyzing-state">
            <div className="ai-icon">AI</div>
            <div className="analyzing-text">Analyzing your image...</div>
            <div className="progress-container">
              <div className="progress-bar">
                <div 
                  className="progress-fill"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
              <div className="progress-text">{Math.round(uploadProgress)}%</div>
            </div>
            <div className="analyzing-steps">
              <div className="step">Processing image</div>
              <div className="step">Identifying furniture</div>
              <div className="step">Calculating price</div>
            </div>
          </div>
        ) : (
          <div className="upload-content">
            <div className="camera-icon">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M9 2L7.17 4H4C2.9 4 2 4.9 2 6V18C2 19.1 2.9 20 4 20H20C21.1 20 22 19.1 22 18V6C22 4.9 21.1 4 20 4H16.83L15 2H9ZM12 17C9.24 17 7 14.76 7 12S9.24 7 12 7S17 9.24 17 12S14.76 17 12 17ZM12 9C10.34 9 9 10.34 9 12S10.34 15 12 15S15 13.66 15 12S13.66 9 12 9Z" fill="currentColor"/>
              </svg>
            </div>
            
            <div className="upload-text">
              <h3 className="upload-title">Drop photo here</h3>
              <p className="upload-subtitle">
                AI will analyze and create your listing
              </p>
            </div>

            <div className="upload-features">
              <div className="feature">
                <span className="feature-text">Instant Analysis</span>
              </div>
              <div className="feature">
                <span className="feature-text">Smart Pricing</span>
              </div>
              <div className="feature">
                <span className="feature-text">Complete Listings</span>
              </div>
            </div>

            <div className="dashed-border"></div>
          </div>
        )}
      </div>

      <style jsx>{`
        .upload-zone-container {
          width: 100%;
          max-width: 400px;
        }

        .upload-zone {
          background: ${colors.glass.background};
          border: 2px dashed ${colors.primary}40;
          border-radius: 20px;
          padding: 2.5rem 2rem;
          text-align: center;
          cursor: pointer;
          transition: all 300ms ${animations.easing.smooth};
          position: relative;
          overflow: hidden;
          backdrop-filter: blur(10px);
          min-height: 300px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .upload-zone::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: ${gradients.mesh};
          opacity: 0.2;
          transition: opacity 300ms ${animations.easing.smooth};
        }

        .upload-zone.hovered {
          border-color: ${colors.primary};
          transform: translateY(-2px);
          box-shadow: ${shadows.primary};
        }

        .upload-zone.hovered::before {
          opacity: 0.3;
        }

        .upload-zone.dragging {
          border-color: ${colors.accent};
          background: ${colors.accent}10;
          transform: scale(1.02);
        }

        .upload-zone.analyzing {
          border-color: ${colors.primary};
          background: ${colors.primary}05;
        }

        .file-input {
          display: none;
        }

        .upload-content {
          position: relative;
          z-index: 2;
          width: 100%;
        }

        .camera-icon {
          color: ${colors.primary};
          margin-bottom: 1.5rem;
          transition: color 300ms ${animations.easing.smooth};
        }

        .upload-zone:hover .camera-icon {
          color: ${colors.accent};
        }

        .upload-title {
          font-size: 1.2rem;
          font-weight: 700;
          color: ${colors.neutralDark};
          margin-bottom: 0.5rem;
          font-family: 'Inter', -apple-system, sans-serif;
        }

        .upload-subtitle {
          color: ${colors.primary};
          font-size: 0.9rem;
          margin-bottom: 2rem;
        }


        .upload-features {
          display: flex;
          justify-content: center;
          gap: 1.5rem;
          margin-bottom: 1.5rem;
          flex-wrap: wrap;
        }

        .feature {
          font-size: 0.8rem;
          color: ${colors.neutralDark};
          font-weight: 500;
        }

        .feature-text {
          opacity: 0.8;
        }

        .dashed-border {
          position: absolute;
          top: 12px;
          left: 12px;
          right: 12px;
          bottom: 12px;
          border: 1px dashed ${colors.primary}20;
          border-radius: 16px;
          pointer-events: none;
        }

        .analyzing-state {
          position: relative;
          z-index: 2;
          width: 100%;
        }

        .ai-icon {
          background: ${gradients.primary};
          color: white;
          width: 48px;
          height: 48px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: bold;
          font-size: 0.9rem;
          margin: 0 auto 1rem auto;
        }

        .analyzing-text {
          font-size: 1.1rem;
          font-weight: 600;
          color: ${colors.primary};
          margin-bottom: 1.5rem;
        }

        .progress-container {
          margin-bottom: 2rem;
        }

        .progress-bar {
          width: 100%;
          height: 8px;
          background: ${colors.primary}20;
          border-radius: 4px;
          overflow: hidden;
          margin-bottom: 0.5rem;
        }

        .progress-fill {
          height: 100%;
          background: ${gradients.primary};
          transition: width 300ms ${animations.easing.smooth};
          border-radius: 4px;
        }

        .progress-text {
          font-size: 0.8rem;
          color: ${colors.primary};
          font-weight: 600;
          font-family: 'Monaco', 'Menlo', monospace;
        }

        .analyzing-steps {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .step {
          font-size: 0.8rem;
          color: ${colors.neutralDark};
          opacity: 0.7;
          ${animationClasses.fadeIn}
        }

        .step:nth-child(1) {
          animation-delay: 0ms;
        }

        .step:nth-child(2) {
          animation-delay: 200ms;
        }

        .step:nth-child(3) {
          animation-delay: 400ms;
        }

        ${animations.keyframes.fadeIn}

        @media (max-width: 768px) {
          .upload-zone {
            padding: 2rem 1.5rem;
            min-height: 250px;
          }
          
          .camera-icon svg {
            width: 40px;
            height: 40px;
          }
          
          .upload-features {
            gap: 1rem;
          }
          
          .feature {
            font-size: 0.75rem;
            text-align: center;
          }
          
          .upload-title {
            font-size: 1.1rem;
          }
        }
      `}</style>
    </div>
  )
}