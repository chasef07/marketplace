'use client'

import { useState } from 'react'
import { Button } from "@/components/ui/button"
import { ArrowLeft, Edit, Save, Camera, ChevronLeft, ChevronRight } from 'lucide-react'
import { type AIAnalysisResult } from "@/src/lib/api-client-new"
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
  const [agentEnabled, setAgentEnabled] = useState(false) // Agent toggle state


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
        // setIsCreatingListing(false)
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
    <div className="listing-preview-container">
      {/* Header */}
      <header className="preview-header">
        <div className="header-content">
          <Button 
            variant="ghost" 
            onClick={onBack}
            disabled={isCreatingListing}
            className="back-button"
            style={{ 
              opacity: isCreatingListing ? 0.5 : 1,
              cursor: isCreatingListing ? 'not-allowed' : 'pointer'
            }}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Upload
          </Button>
          
          <div className="header-title">
            <h1>SnapNest</h1>
          </div>
          
          <Button 
            variant="outline"
            onClick={() => setIsEditing(!isEditing)}
            className="edit-toggle"
          >
            {isEditing ? (
              <>
                <Save className="w-4 h-4 mr-2" />
                Save
              </>
            ) : (
              <>
                <Edit className="w-4 h-4 mr-2" />
                Edit
              </>
            )}
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="preview-main">
        <div className="preview-grid">
          {/* Left Column - Image and Basic Info */}
          <div className="preview-left">
            <div className="image-section">
              <div className="image-carousel relative">
                <div className="main-image relative">
                  <Image 
                    src={uploadedImages[currentImageIndex]} 
                    alt={`Furniture view ${currentImageIndex + 1}`} 
                    fill
                    className="object-cover rounded-lg"
                    sizes="(max-width: 768px) 100vw, 50vw"
                  />
                  <div className="image-overlay">
                    <Camera className="w-6 h-6" />
                    <span>Photo {currentImageIndex + 1} of {uploadedImages.length}</span>
                  </div>
                  
                  {/* Navigation arrows - only show if more than 1 image */}
                  {uploadedImages.length > 1 && (
                    <>
                      <button 
                        className="nav-arrow nav-arrow-left"
                        onClick={prevImage}
                        type="button"
                      >
                        <ChevronLeft size={20} />
                      </button>
                      <button 
                        className="nav-arrow nav-arrow-right"
                        onClick={nextImage}
                        type="button"
                      >
                        <ChevronRight size={20} />
                      </button>
                    </>
                  )}
                </div>
                
                {/* Image dots indicator - only show if more than 1 image */}
                {uploadedImages.length > 1 && (
                  <div className="image-dots">
                    {uploadedImages.map((_, index) => (
                      <button
                        key={index}
                        className={`dot ${index === currentImageIndex ? 'active' : ''}`}
                        onClick={() => setCurrentImageIndex(index)}
                        type="button"
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>
            
            {/* Price Card */}
            <div className="price-card">
              <div className="price-main">
                {isEditing ? (
                  <input
                    type="number"
                    value={editedData.pricing.suggested_starting_price?.toString() || '0'}
                    onChange={(e) => handleInputChange('suggested_starting_price', parseInt(e.target.value) || 0, 'pricing')}
                    className="price-input"
                  />
                ) : (
                  <span className="price-amount">${editedData.pricing.suggested_starting_price}</span>
                )}
                <span className="price-label">Starting Price</span>
              </div>
              <div className="price-range">
                <span>Market Range: ${editedData.pricing.quick_sale_price} - ${editedData.pricing.premium_price}</span>
              </div>
            </div>
            
            {/* Agent Toggle */}
            {user && (
              <div className="agent-section">
                <div className="agent-toggle">
                  <input
                    type="checkbox"
                    id="agent-enabled"
                    checked={agentEnabled}
                    onChange={(e) => setAgentEnabled(e.target.checked)}
                    className="agent-checkbox"
                  />
                  <label htmlFor="agent-enabled" className="agent-label">
                    <span className="agent-text">🤖 Enable AI Agent</span>
                    <span className="agent-description">Let AI handle negotiations automatically</span>
                  </label>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="action-section">
              {user ? (
                <Button 
                  onClick={handleCreateListing}
                  disabled={isCreatingListing}
                  className="signup-button"
                  size="lg"
                  variant="ghost"
                  style={{
                    background: isCreatingListing 
                      ? 'rgba(139, 69, 19, 0.5)' 
                      : 'linear-gradient(135deg, #4A6FA5, #6B8BC4)',
                    color: 'white',
                    border: 'none',
                    cursor: isCreatingListing ? 'not-allowed' : 'pointer'
                  }}
                >
                  {isCreatingListing ? 'Creating Listing...' : 'Create Listing'}
                </Button>
              ) : (
                <Button 
                  onClick={handleSignUp}
                  className="signup-button"
                  size="lg"
                  variant="ghost"
                  style={{
                    background: 'linear-gradient(135deg, #4A6FA5, #6B8BC4)',
                    color: 'white',
                    border: 'none'
                  }}
                >
                  Create Account to List
                </Button>
              )}
            </div>
          </div>

          {/* Right Column - Details */}
          <div className="preview-right">
            {/* Title and Category */}
            <div className="title-section">
              {isEditing ? (
                <input
                  type="text"
                  value={editedData.listing.title}
                  onChange={(e) => handleInputChange('title', e.target.value, 'listing')}
                  className="title-input"
                  placeholder="Enter listing title..."
                />
              ) : (
                <h2 className="listing-title">{editedData.listing.title}</h2>
              )}
              
              <div className="category-section">
                {isEditing ? (
                  <input
                    type="text"
                    value={editedData.listing.furniture_type}
                    onChange={(e) => handleInputChange('furniture_type', e.target.value, 'listing')}
                    className="category-input"
                    placeholder="Furniture type..."
                  />
                ) : (
                  <span className="category-tag">{editedData.listing.furniture_type}</span>
                )}
              </div>
            </div>


            {/* Description */}
            <div className="description-section">
              <h3>Description</h3>
              {isEditing ? (
                <textarea
                  value={editedData.listing.description}
                  onChange={(e) => handleInputChange('description', e.target.value, 'listing')}
                  className="description-textarea"
                  rows={6}
                  placeholder="Describe your furniture..."
                />
              ) : (
                <p className="description-text">{editedData.listing.description}</p>
              )}
            </div>


            {/* Dimensions */}
            <div className="dimensions-section">
              <h3>Dimensions</h3>
              <div className="dimension-item">
                <span className="dimension-label">Estimated Dimensions</span>
                {isEditing ? (
                  <input
                    type="text"
                    value={editedData.analysis.estimated_dimensions || ''}
                    onChange={(e) => handleInputChange('estimated_dimensions', e.target.value, 'analysis')}
                    className="dimension-input"
                    placeholder="e.g., 72 inches L x 36 inches W x 32 inches H"
                  />
                ) : (
                  <span className="dimension-value">{editedData.analysis.estimated_dimensions || 'Not specified'}</span>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>

      <style jsx>{`
        .listing-preview-container {
          min-height: 100vh;
          background: linear-gradient(135deg, #F5F0E8 0%, #FAF7F2 50%, #E8DDD4 100%);
        }

        .preview-header {
          background: rgba(255, 255, 255, 0.95);
          backdrop-filter: blur(10px);
          border-bottom: 1px solid rgba(74, 111, 165, 0.1);
          position: sticky;
          top: 0;
          z-index: 10;
        }

        .header-content {
          max-width: 1200px;
          margin: 0 auto;
          padding: 1.5rem 2rem;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 1rem;
        }

        .back-button {
          color: #4A6FA5;
          border: 1px solid #4A6FA5;
        }

        .back-button:hover {
          background: #4A6FA5;
          color: white;
        }

        .header-title h1 {
          font-size: 1.5rem;
          font-weight: 700;
          color: #2C3E50;
          margin: 0 0 0.25rem 0;
        }

        .header-title p {
          font-size: 0.9rem;
          color: #E89A5C;
          margin: 0;
        }

        .edit-toggle {
          color: #E89A5C;
          border: 1px solid #4A6FA5;
          background: ${isEditing ? '#4A6FA5' : 'transparent'};
          color: ${isEditing ? 'white' : '#4A6FA5'};
        }

        .edit-toggle:hover {
          background: #4A6FA5;
          color: white;
        }

        .preview-main {
          max-width: 1200px;
          margin: 0 auto;
          padding: 2rem;
        }

        .preview-grid {
          display: grid;
          grid-template-columns: 400px 1fr;
          gap: 3rem;
          align-items: start;
        }

        .preview-left {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
          position: sticky;
          top: 120px;
        }

        .image-section {
          background: white;
          border-radius: 16px;
          padding: 1rem;
          box-shadow: 0 10px 30px rgba(139, 69, 19, 0.1);
        }

        .main-image {
          position: relative;
          aspect-ratio: 4/3;
          border-radius: 12px;
          overflow: hidden;
        }

        .main-image img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .image-overlay {
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          background: linear-gradient(transparent, rgba(0,0,0,0.7));
          color: white;
          padding: 1rem;
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.9rem;
        }

        .image-carousel {
          position: relative;
        }

        .nav-arrow {
          position: absolute;
          top: 50%;
          transform: translateY(-50%);
          background: rgba(0, 0, 0, 0.5);
          color: white;
          border: none;
          border-radius: 50%;
          width: 40px;
          height: 40px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          z-index: 2;
          transition: all 0.2s ease;
        }

        .nav-arrow:hover {
          background: rgba(0, 0, 0, 0.7);
          transform: translateY(-50%) scale(1.1);
        }

        .nav-arrow-left {
          left: 10px;
        }

        .nav-arrow-right {
          right: 10px;
        }

        .image-dots {
          display: flex;
          justify-content: center;
          gap: 0.5rem;
          margin-top: 1rem;
        }

        .dot {
          width: 12px;
          height: 12px;
          border-radius: 50%;
          border: none;
          background: rgba(139, 69, 19, 0.3);
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .dot:hover {
          background: rgba(139, 69, 19, 0.6);
        }

        .dot.active {
          background: #4A6FA5;
        }

        .price-card {
          background: white;
          border-radius: 16px;
          padding: 1.5rem;
          box-shadow: 0 10px 30px rgba(139, 69, 19, 0.1);
          text-align: center;
        }

        .price-main {
          margin-bottom: 1rem;
        }

        .price-amount {
          font-size: 2.5rem;
          font-weight: 700;
          color: #2C3E50;
          line-height: 1;
          display: block;
        }

        .price-input {
          font-size: 2.5rem;
          font-weight: 700;
          color: #2C3E50;
          border: 2px solid #E8DDD4;
          border-radius: 8px;
          padding: 0.5rem;
          text-align: center;
          width: 100%;
          max-width: 200px;
        }

        /* Hide number input arrows */
        .price-input::-webkit-outer-spin-button,
        .price-input::-webkit-inner-spin-button {
          -webkit-appearance: none;
          margin: 0;
        }

        .price-input[type=number] {
          -moz-appearance: textfield;
        }

        .price-input:focus {
          outline: none;
          border-color: #4A6FA5;
        }

        .price-label {
          font-size: 0.9rem;
          color: #E89A5C;
          font-weight: 500;
          display: block;
          margin-top: 0.5rem;
        }

        .price-range {
          font-size: 0.8rem;
          color: #6B5A47;
          padding-top: 1rem;
          border-top: 1px solid #E8DDD4;
        }

        .agent-section {
          background: rgba(74, 111, 165, 0.05);
          border: 1px solid rgba(74, 111, 165, 0.2);
          border-radius: 12px;
          padding: 1rem;
        }

        .agent-toggle {
          display: flex;
          align-items: flex-start;
          gap: 0.75rem;
        }

        .agent-checkbox {
          width: 18px;
          height: 18px;
          border: 2px solid #4A6FA5;
          border-radius: 4px;
          background: white;
          cursor: pointer;
          margin: 0;
          flex-shrink: 0;
        }

        .agent-checkbox:checked {
          background: #4A6FA5;
          border-color: #4A6FA5;
        }

        .agent-checkbox:checked::after {
          content: '✓';
          color: white;
          font-size: 12px;
          display: block;
          text-align: center;
          line-height: 14px;
        }

        .agent-label {
          cursor: pointer;
          flex: 1;
        }

        .agent-text {
          display: block;
          font-size: 0.95rem;
          font-weight: 600;
          color: #4A6FA5;
          margin-bottom: 0.25rem;
        }

        .agent-description {
          display: block;
          font-size: 0.8rem;
          color: #6B5A47;
          line-height: 1.3;
        }

        .action-section {
          text-align: center;
        }

        .signup-button {
          background: linear-gradient(135deg, #4A6FA5, #6B8BC4) !important;
          color: white !important;
          border: none !important;
          width: 100%;
          padding: 1rem 2rem;
          font-size: 1.1rem;
          font-weight: 600;
          border-radius: 12px;
          box-shadow: 0 4px 15px rgba(139, 69, 19, 0.3);
          transition: all 0.3s ease;
        }

        .signup-button:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(139, 69, 19, 0.4);
        }

        .signup-note {
          font-size: 0.8rem;
          color: #E89A5C;
          margin-top: 0.75rem;
          margin-bottom: 0;
        }

        .preview-right {
          background: white;
          border-radius: 16px;
          padding: 2rem;
          box-shadow: 0 10px 30px rgba(139, 69, 19, 0.1);
        }

        .title-section {
          margin-bottom: 2rem;
        }

        .listing-title {
          font-size: 2rem;
          font-weight: 700;
          color: #2C3E50;
          margin: 0 0 1rem 0;
          line-height: 1.2;
        }

        .title-input {
          font-size: 2rem;
          font-weight: 700;
          color: #2C3E50;
          border: 2px solid #E8DDD4;
          border-radius: 8px;
          padding: 0.5rem;
          width: 100%;
          margin-bottom: 1rem;
        }

        .title-input:focus {
          outline: none;
          border-color: #4A6FA5;
        }

        .category-section {
          margin-bottom: 1rem;
        }

        .category-tag {
          display: inline-block;
          background: linear-gradient(135deg, #4A6FA5, #6B8BC4);
          color: white;
          padding: 0.5rem 1rem;
          border-radius: 20px;
          font-size: 0.9rem;
          font-weight: 500;
          text-transform: capitalize;
        }

        .category-input {
          border: 2px solid #E8DDD4;
          border-radius: 20px;
          padding: 0.5rem 1rem;
          font-size: 0.9rem;
          font-weight: 500;
        }

        .category-input:focus {
          outline: none;
          border-color: #4A6FA5;
        }


        .description-section, .analysis-section, .dimensions-section {
          margin-bottom: 2rem;
        }

        .description-section h3, .analysis-section h3, .dimensions-section h3 {
          font-size: 1.25rem;
          font-weight: 600;
          color: #2C3E50;
          margin: 0 0 1rem 0;
        }

        .description-text {
          color: #4A4A4A;
          line-height: 1.6;
          margin: 0;
        }

        .description-textarea {
          width: 100%;
          border: 2px solid #E8DDD4;
          border-radius: 8px;
          padding: 1rem;
          font-family: inherit;
          color: #4A4A4A;
          line-height: 1.6;
          resize: vertical;
        }

        .description-textarea:focus {
          outline: none;
          border-color: #4A6FA5;
        }

        .analysis-grid, .dimensions-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1.5rem;
        }

        .analysis-item, .dimension-item {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .analysis-label, .dimension-label {
          font-size: 0.8rem;
          font-weight: 500;
          color: #E89A5C;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .analysis-value, .dimension-value {
          font-size: 1rem;
          color: #2C3E50;
          font-weight: 600;
          text-transform: capitalize;
        }

        .analysis-input, .dimension-input {
          border: 2px solid #E8DDD4;
          border-radius: 6px;
          padding: 0.5rem;
          font-size: 1rem;
          color: #2C3E50;
          font-weight: 600;
        }

        .analysis-input:focus, .dimension-input:focus {
          outline: none;
          border-color: #4A6FA5;
        }

        @media (max-width: 768px) {
          .preview-grid {
            grid-template-columns: 1fr;
            gap: 2rem;
          }

          .preview-left {
            position: static;
          }

          .header-content {
            flex-wrap: wrap;
            gap: 1rem;
          }

          .analysis-grid, .dimensions-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  )
}