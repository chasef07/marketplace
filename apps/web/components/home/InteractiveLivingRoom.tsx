'use client'

import { useState, useEffect } from 'react'
import { colors, gradients } from './design-system/colors'

interface InteractiveLivingRoomProps {
  onUploadClick: () => void
}

export function InteractiveLivingRoom({ onUploadClick }: InteractiveLivingRoomProps) {
  const [hoveredItem, setHoveredItem] = useState<string | null>(null)
  const [soldTags, setSoldTags] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [loadingText, setLoadingText] = useState('Preparing upload...')

  // Handle upload click with loading state
  const handleUploadClick = async () => {
    setIsLoading(true)
    setLoadingText('Opening camera...')
    
    // Small delay to show the loading state
    setTimeout(() => {
      setLoadingText('Select your photos')
      onUploadClick()
      
      // Listen for file input changes to show analysis loading
      const checkForAnalysis = setInterval(() => {
        const hiddenInput = document.querySelector('#hidden-file-input') as HTMLInputElement
        if (hiddenInput && hiddenInput.files && hiddenInput.files.length > 0) {
          setLoadingText('Analyzing images...')
          clearInterval(checkForAnalysis)
          // Don't reset loading state - let it persist until navigation
        }
      }, 100)
      
      // Only reset if no files selected after 10 seconds (user cancelled)
      setTimeout(() => {
        const hiddenInput = document.querySelector('#hidden-file-input') as HTMLInputElement
        if (!hiddenInput || !hiddenInput.files || hiddenInput.files.length === 0) {
          setIsLoading(false)
        }
        clearInterval(checkForAnalysis)
      }, 10000)
    }, 300)
  }

  // Animated SOLD tags that appear and disappear
  useEffect(() => {
    const items = ['sofa', 'table', 'chair', 'lamp', 'bookshelf']
    let tagIndex = 0
    
    const showSoldTag = () => {
      const currentItem = items[tagIndex % items.length]
      setSoldTags(prev => [...prev, currentItem])
      
      // Remove tag after 2 seconds
      setTimeout(() => {
        setSoldTags(prev => prev.filter(tag => tag !== currentItem))
      }, 2000)
      
      tagIndex++
    }

    // Show first tag after 1 second, then every 3 seconds
    const initialTimer = setTimeout(showSoldTag, 1000)
    const interval = setInterval(showSoldTag, 3000)

    return () => {
      clearTimeout(initialTimer)
      clearInterval(interval)
    }
  }, [])

  const furnitureData = {
    sofa: { price: '$400-800', position: { x: 25, y: 60 } },
    table: { price: '$150-350', position: { x: 45, y: 55 } },
    chair: { price: '$200-400', position: { x: 65, y: 65 } },
    lamp: { price: '$75-200', position: { x: 75, y: 35 } },
    bookshelf: { price: '$200-500', position: { x: 15, y: 25 } }
  }

  return (
    <div className="living-room-container">
      {/* Room Floor */}
      <div className="room-floor"></div>
      
      {/* Furniture Items */}
      <div 
        className={`furniture-item sofa ${hoveredItem === 'sofa' ? 'hovered' : ''}`}
        onMouseEnter={() => setHoveredItem('sofa')}
        onMouseLeave={() => setHoveredItem(null)}
        onClick={handleUploadClick}
      >
        <div className="sofa-back"></div>
        <div className="sofa-seat"></div>
        <div className="sofa-cushion left"></div>
        <div className="sofa-cushion right"></div>
        {hoveredItem === 'sofa' && (
          <div className="price-tag">
            {furnitureData.sofa.price}
          </div>
        )}
        {soldTags.includes('sofa') && (
          <div className="sold-tag">SOLD</div>
        )}
      </div>

      <div 
        className={`furniture-item coffee-table ${hoveredItem === 'table' ? 'hovered' : ''}`}
        onMouseEnter={() => setHoveredItem('table')}
        onMouseLeave={() => setHoveredItem(null)}
        onClick={handleUploadClick}
      >
        <div className="table-top"></div>
        <div className="table-leg tl"></div>
        <div className="table-leg tr"></div>
        <div className="table-leg bl"></div>
        <div className="table-leg br"></div>
        {hoveredItem === 'table' && (
          <div className="price-tag">
            {furnitureData.table.price}
          </div>
        )}
        {soldTags.includes('table') && (
          <div className="sold-tag">SOLD</div>
        )}
      </div>

      <div 
        className={`furniture-item accent-chair ${hoveredItem === 'chair' ? 'hovered' : ''}`}
        onMouseEnter={() => setHoveredItem('chair')}
        onMouseLeave={() => setHoveredItem(null)}
        onClick={handleUploadClick}
      >
        <div className="chair-back"></div>
        <div className="chair-seat"></div>
        <div className="chair-legs"></div>
        {hoveredItem === 'chair' && (
          <div className="price-tag">
            {furnitureData.chair.price}
          </div>
        )}
        {soldTags.includes('chair') && (
          <div className="sold-tag">SOLD</div>
        )}
      </div>

      <div 
        className={`furniture-item floor-lamp ${hoveredItem === 'lamp' ? 'hovered' : ''}`}
        onMouseEnter={() => setHoveredItem('lamp')}
        onMouseLeave={() => setHoveredItem(null)}
        onClick={handleUploadClick}
      >
        <div className="lamp-shade"></div>
        <div className="lamp-pole"></div>
        <div className="lamp-base"></div>
        <div className="lamp-glow"></div>
        {hoveredItem === 'lamp' && (
          <div className="price-tag">
            {furnitureData.lamp.price}
          </div>
        )}
        {soldTags.includes('lamp') && (
          <div className="sold-tag">SOLD</div>
        )}
      </div>

      <div 
        className={`furniture-item bookshelf ${hoveredItem === 'bookshelf' ? 'hovered' : ''}`}
        onMouseEnter={() => setHoveredItem('bookshelf')}
        onMouseLeave={() => setHoveredItem(null)}
        onClick={handleUploadClick}
      >
        <div className="shelf-frame"></div>
        <div className="shelf shelf-1"></div>
        <div className="shelf shelf-2"></div>
        <div className="shelf shelf-3"></div>
        <div className="books"></div>
        {hoveredItem === 'bookshelf' && (
          <div className="price-tag">
            {furnitureData.bookshelf.price}
          </div>
        )}
        {soldTags.includes('bookshelf') && (
          <div className="sold-tag">SOLD</div>
        )}
      </div>

      {/* Upload Box - Center Focus */}
      <div 
        className={`upload-box ${isLoading ? 'loading' : ''}`}
        onClick={handleUploadClick}
      >
        {isLoading ? (
          <>
            <div className="loading-spinner"></div>
            <div className="loading-text">{loadingText}</div>
          </>
        ) : (
          <>
            <div className="upload-icon">📸</div>
            <div className="upload-text">Create Your Listing</div>
            <div className="upload-subtext">Snap • Price • Sell</div>
          </>
        )}
      </div>


      <style jsx>{`
        .living-room-container {
          position: relative;
          width: 100%;
          max-width: 800px;
          height: 400px;
          margin: 0 auto;
          perspective: 1000px;
          cursor: pointer;
        }

        .room-floor {
          position: absolute;
          bottom: 0;
          left: 10%;
          right: 10%;
          height: 200px;
          background: linear-gradient(135deg, 
            ${colors.neutralLight} 0%, 
            ${colors.background} 50%, 
            ${colors.backgroundGradient.from} 100%
          );
          transform: rotateX(60deg);
          border-radius: 8px;
          opacity: 0.6;
          box-shadow: 0 20px 40px ${colors.primary}20;
        }

        .furniture-item {
          position: absolute;
          transition: all 0.3s ease;
          cursor: pointer;
        }

        .furniture-item:hover {
          transform: translateY(-5px);
          filter: brightness(1.1);
        }

        .furniture-item.hovered {
          z-index: 10;
        }


        /* Sofa */
        .sofa {
          left: 15%;
          bottom: 45%;
          width: 120px;
          height: 60px;
        }

        .sofa-back {
          width: 120px;
          height: 35px;
          background: ${colors.secondaryDark};
          border-radius: 8px 8px 4px 4px;
          position: relative;
        }

        .sofa-seat {
          width: 120px;
          height: 25px;
          background: ${colors.secondary};
          border-radius: 4px;
          margin-top: 2px;
        }

        .sofa-cushion {
          position: absolute;
          top: 8px;
          width: 35px;
          height: 20px;
          background: ${colors.alert};
          border-radius: 4px;
        }

        .sofa-cushion.left {
          left: 15px;
        }

        .sofa-cushion.right {
          right: 15px;
        }

        /* Coffee Table */
        .coffee-table {
          left: 38%;
          bottom: 48%;
          width: 80px;
          height: 40px;
        }

        .table-top {
          width: 80px;
          height: 8px;
          background: ${colors.neutralDark};
          border-radius: 4px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }

        .table-leg {
          position: absolute;
          width: 4px;
          height: 25px;
          background: ${colors.secondaryDark};
          top: 8px;
        }

        .table-leg.tl { left: 8px; }
        .table-leg.tr { right: 8px; }
        .table-leg.bl { left: 8px; bottom: -17px; top: auto; }
        .table-leg.br { right: 8px; bottom: -17px; top: auto; }

        /* Accent Chair */
        .accent-chair {
          right: 15%;
          bottom: 40%;
          width: 50px;
          height: 70px;
        }

        .chair-back {
          width: 50px;
          height: 45px;
          background: ${colors.secondary};
          border-radius: 8px 8px 4px 4px;
        }

        .chair-seat {
          width: 50px;
          height: 20px;
          background: ${colors.secondaryLight};
          border-radius: 4px;
          margin-top: 2px;
        }

        .chair-legs {
          width: 50px;
          height: 15px;
          background: ${colors.secondaryDark};
          margin-top: 2px;
          border-radius: 0 0 4px 4px;
        }

        /* Floor Lamp */
        .floor-lamp {
          right: 8%;
          bottom: 65%;
          width: 30px;
          height: 100px;
        }

        .lamp-shade {
          width: 40px;
          height: 25px;
          background: ${colors.neutralLight};
          border-radius: 50% 50% 20% 20%;
          margin-left: -5px;
          border: 2px solid ${colors.secondary};
        }

        .lamp-pole {
          width: 3px;
          height: 60px;
          background: ${colors.secondaryDark};
          margin: 0 auto;
        }

        .lamp-base {
          width: 25px;
          height: 8px;
          background: ${colors.neutralDark};
          border-radius: 50%;
          margin-left: 2.5px;
        }

        .lamp-glow {
          position: absolute;
          top: -10px;
          left: -15px;
          width: 60px;
          height: 60px;
          background: radial-gradient(circle, ${colors.alert}30, transparent);
          border-radius: 50%;
          animation: glow 2s ease-in-out infinite alternate;
        }

        @keyframes glow {
          from { opacity: 0.5; }
          to { opacity: 0.8; }
        }

        /* Bookshelf */
        .bookshelf {
          left: 8%;
          bottom: 70%;
          width: 60px;
          height: 80px;
        }

        .shelf-frame {
          width: 60px;
          height: 80px;
          background: ${colors.neutralDark};
          border-radius: 4px;
          border: 2px solid ${colors.secondaryDark};
        }

        .shelf {
          position: absolute;
          width: 56px;
          height: 2px;
          background: ${colors.secondaryDark};
          left: 2px;
        }

        .shelf-1 { top: 20px; }
        .shelf-2 { top: 40px; }
        .shelf-3 { top: 60px; }

        .books {
          position: absolute;
          top: 8px;
          left: 4px;
          width: 52px;
          height: 65px;
          background: linear-gradient(90deg, 
            ${colors.secondary} 0%, ${colors.secondary} 15%,
            ${colors.alert} 15%, ${colors.alert} 30%,
            ${colors.accent} 30%, ${colors.accent} 45%,
            ${colors.secondaryLight} 45%, ${colors.secondaryLight} 60%,
            ${colors.accentLight} 60%, ${colors.accentLight} 75%,
            ${colors.primary} 75%
          );
        }

        /* Upload Box */
        .upload-box {
          position: absolute;
          left: 50%;
          bottom: 25%;
          transform: translateX(-50%);
          width: 160px;
          height: 100px;
          border: 3px dashed ${colors.secondary};
          border-radius: 12px;
          background: ${colors.neutralLight}90;
          backdrop-filter: blur(10px);
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.3s ease;
          animation: pulse 2s ease-in-out infinite;
        }

        .upload-box:hover {
          transform: translateX(-50%) translateY(-5px);
          border-color: ${colors.alert};
          background: ${colors.background}95;
          box-shadow: 0 10px 25px ${colors.secondary}40;
        }

        .upload-box.loading {
          border-color: ${colors.primary};
          background: ${colors.neutralLight}95;
          animation: none;
        }

        @keyframes pulse {
          0%, 100% { 
            box-shadow: 0 0 0 0 ${colors.secondary}40;
          }
          50% { 
            box-shadow: 0 0 0 10px transparent;
          }
        }

        .upload-icon {
          font-size: 2rem;
          margin-bottom: 8px;
        }

        .upload-text {
          font-size: 14px;
          font-weight: 700;
          color: ${colors.neutralDark};
          text-align: center;
          line-height: 1.2;
        }

        .upload-subtext {
          font-size: 11px;
          color: ${colors.primary};
          margin-top: 4px;
          font-weight: 500;
        }

        /* Price Tags */
        .price-tag {
          position: absolute;
          top: -35px;
          left: 50%;
          transform: translateX(-50%);
          background: ${gradients.primary};
          color: white;
          padding: 6px 12px;
          border-radius: 20px;
          font-size: 12px;
          font-weight: 600;
          white-space: nowrap;
          box-shadow: 0 4px 12px rgba(0,0,0,0.15);
          animation: slideUp 0.3s ease;
        }

        .price-tag::after {
          content: '';
          position: absolute;
          top: 100%;
          left: 50%;
          transform: translateX(-50%);
          width: 0;
          height: 0;
          border-left: 6px solid transparent;
          border-right: 6px solid transparent;
          border-top: 6px solid ${colors.secondary};
        }

        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateX(-50%) translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateX(-50%) translateY(0);
          }
        }

        /* SOLD Tags */
        .sold-tag {
          position: absolute;
          top: -20px;
          right: -10px;
          background: ${colors.accent};
          color: white;
          padding: 4px 8px;
          border-radius: 12px;
          font-size: 10px;
          font-weight: 700;
          transform: rotate(15deg);
          box-shadow: 0 2px 8px rgba(0,0,0,0.2);
          animation: soldAppear 0.5s ease, soldDisappear 0.5s ease 1.5s forwards;
          z-index: 20;
        }

        @keyframes soldAppear {
          from {
            opacity: 0;
            transform: rotate(15deg) scale(0.5);
          }
          to {
            opacity: 1;
            transform: rotate(15deg) scale(1);
          }
        }

        @keyframes soldDisappear {
          from {
            opacity: 1;
            transform: rotate(15deg) scale(1);
          }
          to {
            opacity: 0;
            transform: rotate(15deg) scale(0.8);
          }
        }

        /* Loading States */
        .loading-spinner {
          width: 20px;
          height: 20px;
          border: 2px solid ${colors.primary}30;
          border-top: 2px solid ${colors.primary};
          border-radius: 50%;
          animation: spin 1s linear infinite;
          margin-bottom: 8px;
        }

        .loading-text {
          font-size: 12px;
          color: ${colors.primary};
          font-weight: 600;
        }


        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        /* Responsive Design */
        @media (max-width: 768px) {
          .living-room-container {
            height: 300px;
            transform: scale(0.8);
            transform-origin: center;
          }

          .upload-box {
            width: 140px;
            height: 80px;
          }

          .upload-text {
            font-size: 12px;
          }

          .upload-subtext {
            font-size: 10px;
          }
        }

        @media (max-width: 480px) {
          .living-room-container {
            height: 250px;
            transform: scale(0.7);
          }
        }
      `}</style>
    </div>
  )
}