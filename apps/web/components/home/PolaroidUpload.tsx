'use client'

import { useState, useRef } from 'react'
import Image from 'next/image'
import { Camera, Loader2, X, Plus } from 'lucide-react'
import { apiClient, type AIAnalysisResult } from "@/lib/api-client-new"

interface PolaroidUploadProps {
  onShowListingPreview: (analysisData: AIAnalysisResult, uploadedImages: string[]) => void
}

export function PolaroidUpload({ onShowListingPreview }: PolaroidUploadProps) {
  const [isHovered, setIsHovered] = useState(false)
  const [isClicked, setIsClicked] = useState(false)
  const [loading, setLoading] = useState(false)
  const [dragActive, setDragActive] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [previewUrls, setPreviewUrls] = useState<string[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)

  const addFiles = (files: FileList | File[]) => {
    const fileArray = Array.from(files)
    const imageFiles = fileArray.filter(file => file.type.startsWith('image/'))
    
    if (imageFiles.length === 0) {
      setError('Please select image files')
      return
    }

    // Limit to 3 images total
    const totalFiles = selectedFiles.length + imageFiles.length
    if (totalFiles > 3) {
      const remainingSlots = 3 - selectedFiles.length
      setError(`Maximum 3 images allowed. You can add ${remainingSlots} more.`)
      return
    }

    // Create preview URLs for new files
    const newPreviewUrls = imageFiles.map(file => URL.createObjectURL(file))
    
    setSelectedFiles(prev => [...prev, ...imageFiles])
    setPreviewUrls(prev => [...prev, ...newPreviewUrls])
    setError(null)
  }

  const removeFile = (index: number) => {
    // Revoke the preview URL to prevent memory leaks
    if (previewUrls[index]) {
      URL.revokeObjectURL(previewUrls[index])
    }
    
    setSelectedFiles(prev => prev.filter((_, i) => i !== index))
    setPreviewUrls(prev => prev.filter((_, i) => i !== index))
  }

  const analyzeImages = async () => {
    if (selectedFiles.length === 0) {
      setError('Please select at least one image')
      return
    }

    setLoading(true)
    setError(null)
    setIsClicked(true)

    try {
      // Analyze with AI using multiple images or single image based on availability
      const result = selectedFiles.length === 1 
        ? await apiClient.uploadAndAnalyzeImage(selectedFiles[0])
        : await apiClient.uploadAndAnalyzeImages(selectedFiles)
      
      // Navigate to full listing preview with all preview URLs
      onShowListingPreview(result, previewUrls)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to analyze images')
    } finally {
      setLoading(false)
      setTimeout(() => setIsClicked(false), 300)
    }
  }

  const handleClick = () => {
    if (loading) return
    if (selectedFiles.length === 0) {
      fileInputRef.current?.click()
    } else {
      analyzeImages()
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragActive(false)
    
    if (e.dataTransfer.files) {
      addFiles(e.dataTransfer.files)
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setDragActive(true)
  }

  const handleDragLeave = () => {
    setDragActive(false)
  }


  return (
    <div className="polaroid-section">
      
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={(e) => e.target.files && addFiles(e.target.files)}
        style={{ display: 'none' }}
      />

      <div 
        className={`polaroid-camera ${isHovered ? 'hovered' : ''} ${isClicked ? 'clicked' : ''} ${dragActive ? 'drag-active' : ''} ${loading ? 'loading' : ''}`}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onClick={handleClick}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
      >
        {/* Camera Body */}
        <div className="camera-body">
          {/* Camera Top */}
          <div className="camera-top">
            <div className="viewfinder"></div>
            <div className="flash"></div>
          </div>
          
          {/* Camera Face */}
          <div className="camera-face">
            {/* Lens */}
            <div className="lens-assembly">
              <div className="lens-outer"></div>
              <div className="lens-inner">
                <Camera className="camera-icon" />
              </div>
              <div className="lens-reflection"></div>
            </div>
            
            {/* Camera Details */}
            <div className="camera-details">
              <div className="brand-label">FurnitureSnap</div>
              <div className="model-info">Instant Listing</div>
            </div>
          </div>
          
          {/* Photo Slot */}
          <div className="photo-slot">
            <div className="photo-emerging">
              <div className="photo-preview">
                {loading ? (
                  <div className="loading-state">
                    <Loader2 className="loading-spinner" />
                    <span className="loading-text">Analyzing your furniture...</span>
                  </div>
                ) : selectedFiles.length > 0 ? (
                  <div className="selected-images">
                    <div className="image-grid">
                      {previewUrls.map((url, index) => (
                        <div key={index} className="image-thumbnail">
                          <Image src={url} alt={`Preview ${index + 1}`} width={80} height={80} className="w-full h-full object-cover" />
                          <button 
                            className="remove-button" 
                            onClick={(e) => {
                              e.stopPropagation()
                              removeFile(index)
                            }}
                            type="button"
                          >
                            <X size={12} />
                          </button>
                        </div>
                      ))}
                      {selectedFiles.length < 3 && (
                        <div className="add-more-button" onClick={(e) => {
                          e.stopPropagation()
                          fileInputRef.current?.click()
                        }}>
                          <Plus size={20} />
                        </div>
                      )}
                    </div>
                    <div className="image-count">
                      {selectedFiles.length} of 3 photos • Click to analyze
                    </div>
                  </div>
                ) : (
                  <span className="photo-text">
                    {dragActive ? 'Drop your photos here!' : 'Upload 1-3 photos for better AI analysis'}
                  </span>
                )}
              </div>
            </div>
          </div>
          
          {/* Action Text */}
          <div className="camera-action">
            <span className="action-text">
              {selectedFiles.length > 0 
                ? `${selectedFiles.length} photo${selectedFiles.length > 1 ? 's' : ''} ready to analyze!`
                : 'Snap your furniture to get started!'
              }
            </span>
            <div className="action-subtitle">
              {selectedFiles.length > 0
                ? 'Click to create AI listing'
                : 'Drag, drop, or click to upload 1-3 photos'
              }
            </div>
          </div>
        </div>
        
        {/* Error Display */}
        {error && (
          <div className="error-message">
            {error}
          </div>
        )}
        
        {/* Click Flash Effect */}
        <div className="flash-effect"></div>
        
        {/* Floating Elements */}
        <div className="floating-elements">
          <div className="floating-dollar">$</div>
          <div className="floating-heart">♥</div>
          <div className="floating-star">★</div>
        </div>
      </div>

      <style jsx>{`
        .polaroid-section {
          width: 100%;
          display: flex;
          flex-direction: column;
          align-items: center;
        }


        .polaroid-camera {
          position: relative;
          width: 280px;
          max-width: 85%;
          cursor: pointer;
          transition: all 0.3s ease;
          transform-style: preserve-3d;
          filter: drop-shadow(0 12px 25px rgba(139, 69, 19, 0.3));
          z-index: 10;
          margin: 0 0 2rem 0;
        }

        .polaroid-camera.hovered {
          transform: translateY(-5px) rotateY(-5deg);
        }

        .polaroid-camera.clicked {
          transform: scale(0.95);
        }

        .polaroid-camera.drag-active {
          transform: translateY(-5px) scale(1.02);
          box-shadow: 0 20px 40px rgba(139, 69, 19, 0.4);
        }

        .polaroid-camera.loading {
          pointer-events: none;
        }

        .camera-body {
          background: linear-gradient(135deg, #E8DDD4, #D2B48C);
          border-radius: 18px 18px 35px 35px;
          padding: 1.25rem;
          box-shadow: 
            0 8px 25px rgba(139, 69, 19, 0.3),
            inset 0 1px 0 rgba(255, 255, 255, 0.3),
            inset 0 -1px 0 rgba(0, 0, 0, 0.1);
          position: relative;
          overflow: hidden;
        }

        .camera-top {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1.5rem;
        }

        .viewfinder {
          width: 30px;
          height: 20px;
          background: linear-gradient(135deg, #3C2415, #1a1a1a);
          border-radius: 8px;
          box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.5);
        }

        .flash {
          width: 25px;
          height: 25px;
          background: radial-gradient(circle, #FFF8DC, #E8DDD4);
          border-radius: 50%;
          border: 2px solid #8B4513;
          animation: flash-ready 3s ease-in-out infinite;
        }

        @keyframes flash-ready {
          0%, 90%, 100% { 
            background: radial-gradient(circle, #FFF8DC, #E8DDD4);
            box-shadow: 0 0 5px rgba(255, 248, 220, 0.5);
          }
          95% { 
            background: radial-gradient(circle, #FFFACD, #FFE4B5);
            box-shadow: 0 0 15px rgba(255, 248, 220, 0.8);
          }
        }

        .camera-face {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 2rem;
        }

        .lens-assembly {
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .lens-outer {
          width: 80px;
          height: 80px;
          background: linear-gradient(135deg, #8B4513, #A0522D);
          border-radius: 50%;
          border: 4px solid #3C2415;
          box-shadow: 
            0 0 20px rgba(139, 69, 19, 0.5),
            inset 0 5px 10px rgba(255, 255, 255, 0.2),
            inset 0 -5px 10px rgba(0, 0, 0, 0.3);
        }

        .lens-inner {
          position: absolute;
          width: 60px;
          height: 60px;
          background: radial-gradient(circle at 30% 30%, #2C2C2C, #000);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: inset 0 0 20px rgba(0, 0, 0, 0.8);
        }

        .camera-icon {
          width: 24px;
          height: 24px;
          color: #666;
          opacity: 0.7;
        }

        .lens-reflection {
          position: absolute;
          top: 15px;
          left: 20px;
          width: 20px;
          height: 15px;
          background: radial-gradient(ellipse, rgba(255,255,255,0.4), transparent);
          border-radius: 50%;
          animation: lens-glint 4s ease-in-out infinite;
        }

        @keyframes lens-glint {
          0%, 90%, 100% { opacity: 0.3; }
          95% { opacity: 0.8; }
        }

        .camera-details {
          text-align: right;
          color: #3C2415;
        }

        .brand-label {
          font-size: 1.1rem;
          font-weight: 700;
          letter-spacing: -0.5px;
          margin-bottom: 0.25rem;
        }

        .model-info {
          font-size: 0.85rem;
          opacity: 0.8;
        }

        .photo-slot {
          margin: 1rem 0;
          position: relative;
        }

        .photo-emerging {
          background: #FFF;
          border-radius: 8px 8px 0 0;
          box-shadow: 0 5px 20px rgba(0, 0, 0, 0.2);
          transform: translateY(0);
          transition: transform 0.3s ease;
        }

        .polaroid-camera.hovered .photo-emerging {
          transform: translateY(-10px);
        }

        .photo-preview {
          aspect-ratio: 4/3;
          background: linear-gradient(135deg, #F7F3E9, #E8DDD4);
          border-radius: 6px 6px 0 0;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 1.25rem;
          border: 5px solid #FFF;
          border-bottom: 25px solid #FFF;
          position: relative;
          overflow: hidden;
        }

        .photo-preview::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-image: 
            radial-gradient(circle at 20% 80%, rgba(139, 69, 19, 0.1) 0%, transparent 50%),
            radial-gradient(circle at 80% 20%, rgba(210, 180, 140, 0.1) 0%, transparent 50%);
        }

        .photo-text {
          color: #8B4513;
          font-size: 0.9rem;
          text-align: center;
          font-weight: 500;
          z-index: 2;
          position: relative;
          transition: all 0.3s ease;
        }

        .loading-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 1rem;
          height: 100%;
          color: #8B4513;
        }

        .loading-spinner {
          width: 32px;
          height: 32px;
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        .loading-text {
          font-size: 0.9rem;
          font-weight: 500;
          text-align: center;
        }

        .selected-images {
          width: 100%;
          height: 100%;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 0.75rem;
        }

        .image-grid {
          display: flex;
          gap: 0.5rem;
          align-items: center;
          justify-content: center;
          flex-wrap: wrap;
        }

        .image-thumbnail {
          position: relative;
          width: 50px;
          height: 50px;
          border-radius: 8px;
          overflow: hidden;
          border: 2px solid #8B4513;
        }

        .image-thumbnail img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .remove-button {
          position: absolute;
          top: -5px;
          right: -5px;
          background: #DC2626;
          color: white;
          border: none;
          border-radius: 50%;
          width: 20px;
          height: 20px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          font-size: 10px;
          transition: all 0.2s ease;
        }

        .remove-button:hover {
          background: #B91C1C;
          transform: scale(1.1);
        }

        .add-more-button {
          width: 50px;
          height: 50px;
          border: 2px dashed #8B4513;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          color: #8B4513;
          background: rgba(139, 69, 19, 0.1);
          transition: all 0.2s ease;
        }

        .add-more-button:hover {
          background: rgba(139, 69, 19, 0.2);
          border-color: #6B3410;
        }

        .image-count {
          font-size: 0.85rem;
          color: #8B4513;
          font-weight: 500;
          text-align: center;
        }

        .error-message {
          position: absolute;
          bottom: -2.5rem;
          left: 0;
          right: 0;
          text-align: center;
          color: #DC2626;
          font-size: 0.85rem;
          font-weight: 500;
          background: rgba(220, 38, 38, 0.1);
          padding: 0.5rem;
          border-radius: 8px;
          border: 1px solid rgba(220, 38, 38, 0.3);
        }


        .camera-action {
          text-align: center;
          color: #3C2415;
        }

        .action-text {
          font-size: 1.1rem;
          font-weight: 600;
          display: block;
          margin-bottom: 0.5rem;
        }

        .action-subtitle {
          font-size: 0.85rem;
          opacity: 0.7;
        }

        .flash-effect {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: radial-gradient(circle, rgba(255,255,255,0.9) 0%, transparent 70%);
          border-radius: 20px 20px 40px 40px;
          opacity: 0;
          pointer-events: none;
          z-index: 10;
        }

        .polaroid-camera.clicked .flash-effect {
          animation: camera-flash 0.3s ease-out;
        }

        @keyframes camera-flash {
          0% { opacity: 0; }
          10% { opacity: 1; }
          100% { opacity: 0; }
        }

        .floating-elements {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          pointer-events: none;
          z-index: 1;
        }

        .floating-dollar,
        .floating-heart,
        .floating-star {
          position: absolute;
          font-size: 1.5rem;
          font-weight: bold;
          opacity: 0;
          animation: float-around 6s ease-in-out infinite;
        }

        .floating-dollar {
          color: #228B22;
          top: 20%;
          left: -10px;
          animation-delay: 0s;
        }

        .floating-heart {
          color: #FF6B6B;
          top: 60%;
          right: -10px;
          animation-delay: 2s;
        }

        .floating-star {
          color: #FFD700;
          top: 40%;
          left: -15px;
          animation-delay: 4s;
        }

        .polaroid-camera:hover .floating-dollar,
        .polaroid-camera:hover .floating-heart,
        .polaroid-camera:hover .floating-star {
          animation-play-state: running;
        }

        @keyframes float-around {
          0%, 90%, 100% { 
            opacity: 0; 
            transform: translate(0, 0) rotate(0deg) scale(0.8);
          }
          5% { 
            opacity: 1; 
            transform: translate(10px, -10px) rotate(10deg) scale(1);
          }
          45% { 
            opacity: 1;
            transform: translate(30px, -30px) rotate(-10deg) scale(1.1);
          }
          85% { 
            opacity: 1;
            transform: translate(15px, -50px) rotate(5deg) scale(0.9);
          }
        }

        /* Responsive Design */
        @media (max-width: 768px) {
          .polaroid-camera {
            width: 240px;
            max-width: 90%;
            margin: 0 0 1.5rem 0;
          }

          .camera-body {
            padding: 1rem;
          }

          .lens-outer {
            width: 60px;
            height: 60px;
          }

          .lens-inner {
            width: 45px;
            height: 45px;
          }

          .camera-icon {
            width: 18px;
            height: 18px;
          }

          .brand-label {
            font-size: 1rem;
          }

          .model-info {
            font-size: 0.75rem;
          }
        }
      `}</style>
    </div>
  )
}