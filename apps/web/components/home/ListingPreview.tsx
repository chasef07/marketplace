'use client'

import { useState } from 'react'
import { Button } from "@/components/ui/button"
import { ArrowLeft, Edit, Save, MapPin, Star, Camera } from 'lucide-react'
import { type AIAnalysisResult } from "@/lib/api-client-new"

interface ListingPreviewProps {
  analysisData: AIAnalysisResult
  uploadedImage: string
  onBack: () => void
  onSignUp: (editedData: AIAnalysisResult) => void
}

export function ListingPreview({ analysisData, uploadedImage, onBack, onSignUp }: ListingPreviewProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editedData, setEditedData] = useState<AIAnalysisResult>(analysisData)


  const handleSignUp = () => {
    onSignUp(editedData)
  }

  const handleInputChange = (field: string, value: string | number, nested?: string) => {
    setEditedData(prev => {
      if (nested) {
        const nestedObj = prev[nested as keyof AIAnalysisResult] as any
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
            className="back-button"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Upload
          </Button>
          
          <div className="header-title">
            <h1>Your Listing Preview</h1>
            <p>Review and edit your furniture listing details</p>
          </div>
          
          <Button 
            variant="outline"
            onClick={() => setIsEditing(!isEditing)}
            className="edit-toggle"
          >
            {isEditing ? (
              <>
                <Save className="w-4 h-4 mr-2" />
                Save Changes
              </>
            ) : (
              <>
                <Edit className="w-4 h-4 mr-2" />
                Edit Details
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
              <div className="main-image">
                <img src={uploadedImage} alt="Your furniture" />
                <div className="image-overlay">
                  <Camera className="w-6 h-6" />
                  <span>Primary Photo</span>
                </div>
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
            
            {/* Action Buttons */}
            <div className="action-section">
              <Button 
                onClick={handleSignUp}
                className="signup-button"
                size="lg"
                variant="ghost"
                style={{
                  background: 'linear-gradient(135deg, #8B4513, #CD853F)',
                  color: 'white',
                  border: 'none'
                }}
              >
                Sign in to Create Listing
              </Button>
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

            {/* Location and Rating */}
            <div className="meta-section">
              <div className="location">
                <MapPin className="w-4 h-4" />
                <span>Your Location</span>
              </div>
              <div className="rating">
                <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                <span>New Seller</span>
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

            {/* AI Analysis Details */}
            <div className="analysis-section">
              <h3>AI Analysis</h3>
              <div className="analysis-grid">
                <div className="analysis-item">
                  <span className="analysis-label">Style</span>
                  {isEditing ? (
                    <input
                      type="text"
                      value={editedData.analysis.style}
                      onChange={(e) => handleInputChange('style', e.target.value, 'analysis')}
                      className="analysis-input"
                    />
                  ) : (
                    <span className="analysis-value">{editedData.analysis.style}</span>
                  )}
                </div>
                
                <div className="analysis-item">
                  <span className="analysis-label">Material</span>
                  {isEditing ? (
                    <input
                      type="text"
                      value={editedData.analysis.material}
                      onChange={(e) => handleInputChange('material', e.target.value, 'analysis')}
                      className="analysis-input"
                    />
                  ) : (
                    <span className="analysis-value">{editedData.analysis.material}</span>
                  )}
                </div>
                
                <div className="analysis-item">
                  <span className="analysis-label">Brand</span>
                  {isEditing ? (
                    <input
                      type="text"
                      value={editedData.analysis.brand}
                      onChange={(e) => handleInputChange('brand', e.target.value, 'analysis')}
                      className="analysis-input"
                    />
                  ) : (
                    <span className="analysis-value">{editedData.analysis.brand}</span>
                  )}
                </div>
                
                <div className="analysis-item">
                  <span className="analysis-label">Condition Score</span>
                  {isEditing ? (
                    <input
                      type="number"
                      min="1"
                      max="10"
                      value={editedData.analysis.condition_score?.toString() || '1'}
                      onChange={(e) => handleInputChange('condition_score', parseInt(e.target.value) || 1, 'analysis')}
                      className="analysis-input"
                    />
                  ) : (
                    <span className="analysis-value">{editedData.analysis.condition_score}/10</span>
                  )}
                </div>
              </div>
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
          background: linear-gradient(135deg, #F7F3E9 0%, #E8DDD4 50%, #DDD1C7 100%);
        }

        .preview-header {
          background: rgba(255, 255, 255, 0.95);
          backdrop-filter: blur(10px);
          border-bottom: 1px solid rgba(139, 69, 19, 0.1);
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
          color: #8B4513;
          border: 1px solid #8B4513;
        }

        .back-button:hover {
          background: #8B4513;
          color: white;
        }

        .header-title h1 {
          font-size: 1.5rem;
          font-weight: 700;
          color: #3C2415;
          margin: 0 0 0.25rem 0;
        }

        .header-title p {
          font-size: 0.9rem;
          color: #8B4513;
          margin: 0;
        }

        .edit-toggle {
          color: #8B4513;
          border: 1px solid #8B4513;
          background: ${isEditing ? '#8B4513' : 'transparent'};
          color: ${isEditing ? 'white' : '#8B4513'};
        }

        .edit-toggle:hover {
          background: #8B4513;
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
          color: #3C2415;
          line-height: 1;
          display: block;
        }

        .price-input {
          font-size: 2.5rem;
          font-weight: 700;
          color: #3C2415;
          border: 2px solid #E8DDD4;
          border-radius: 8px;
          padding: 0.5rem;
          text-align: center;
          width: 100%;
          max-width: 200px;
        }

        .price-input:focus {
          outline: none;
          border-color: #8B4513;
        }

        .price-label {
          font-size: 0.9rem;
          color: #8B4513;
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

        .action-section {
          text-align: center;
        }

        .signup-button {
          background: linear-gradient(135deg, #8B4513, #CD853F) !important;
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
          color: #8B4513;
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
          color: #3C2415;
          margin: 0 0 1rem 0;
          line-height: 1.2;
        }

        .title-input {
          font-size: 2rem;
          font-weight: 700;
          color: #3C2415;
          border: 2px solid #E8DDD4;
          border-radius: 8px;
          padding: 0.5rem;
          width: 100%;
          margin-bottom: 1rem;
        }

        .title-input:focus {
          outline: none;
          border-color: #8B4513;
        }

        .category-section {
          margin-bottom: 1rem;
        }

        .category-tag {
          display: inline-block;
          background: linear-gradient(135deg, #8B4513, #CD853F);
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
          border-color: #8B4513;
        }

        .meta-section {
          display: flex;
          gap: 2rem;
          margin-bottom: 2rem;
          padding-bottom: 1.5rem;
          border-bottom: 1px solid #E8DDD4;
        }

        .location, .rating {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.9rem;
          color: #6B5A47;
        }

        .description-section, .analysis-section, .dimensions-section {
          margin-bottom: 2rem;
        }

        .description-section h3, .analysis-section h3, .dimensions-section h3 {
          font-size: 1.25rem;
          font-weight: 600;
          color: #3C2415;
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
          border-color: #8B4513;
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
          color: #8B4513;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .analysis-value, .dimension-value {
          font-size: 1rem;
          color: #3C2415;
          font-weight: 600;
          text-transform: capitalize;
        }

        .analysis-input, .dimension-input {
          border: 2px solid #E8DDD4;
          border-radius: 6px;
          padding: 0.5rem;
          font-size: 1rem;
          color: #3C2415;
          font-weight: 600;
        }

        .analysis-input:focus, .dimension-input:focus {
          outline: none;
          border-color: #8B4513;
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