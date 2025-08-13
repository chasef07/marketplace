'use client'

import { colors, gradients } from '../home/design-system/colors'
import { animations } from '../home/design-system/animations'

interface ThemedLoadingProps {
  message?: string
  size?: 'sm' | 'md' | 'lg'
}

export function ThemedLoading({ message = "Loading your marketplace...", size = 'md' }: ThemedLoadingProps) {
  const sizeClasses = {
    sm: 'h-8 w-8',
    md: 'h-12 w-12',
    lg: 'h-16 w-16'
  }

  const containerSizeClasses = {
    sm: 'gap-3',
    md: 'gap-4',
    lg: 'gap-6'
  }

  return (
    <div className="min-h-screen flex items-center justify-center" 
         style={{ background: gradients.background }}>
      <div className={`text-center ${containerSizeClasses[size]}`}>
        
        {/* Animated Furniture Icons */}
        <div className="relative mb-8">
          {/* Floating Chair */}
          <div 
            className="absolute left-0 top-0 opacity-70"
            style={{
              animation: `float 6s ease-in-out infinite`,
              color: colors.primary
            }}
          >
            <svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor">
              <path d="M7 11v2a1 1 0 0 0 1 1h1v5a1 1 0 0 0 1 1h1a1 1 0 0 0 1-1v-5h2v5a1 1 0 0 0 1 1h1a1 1 0 0 0 1-1v-5h1a1 1 0 0 0 1-1v-2a3 3 0 0 0-3-3H10a3 3 0 0 0-3 3z"/>
              <path d="M6 6a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v2H6V6z"/>
            </svg>
          </div>

          {/* Floating Sofa */}
          <div 
            className="absolute right-0 top-0 opacity-70"
            style={{
              animation: `float 6s ease-in-out infinite 2s`,
              color: colors.secondary
            }}
          >
            <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor">
              <path d="M20 9V7a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v2a2 2 0 0 0-2 2v5a2 2 0 0 0 2 2h1v1a1 1 0 0 0 1 1h1a1 1 0 0 0 1-1v-1h8v1a1 1 0 0 0 1 1h1a1 1 0 0 0 1-1v-1h1a2 2 0 0 0 2-2v-5a2 2 0 0 0-2-2zM6 7h12v2H6V7z"/>
            </svg>
          </div>

          {/* Floating Table */}
          <div 
            className="absolute left-1/2 transform -translate-x-1/2 -top-4 opacity-70"
            style={{
              animation: `float 6s ease-in-out infinite 4s`,
              color: colors.accent
            }}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
              <path d="M20 6H4a2 2 0 0 0-2 2v2a2 2 0 0 0 2 2v6a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2v-6h4v6a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2v-6a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2z"/>
            </svg>
          </div>
        </div>

        {/* Main Loading Spinner with Furniture Theme */}
        <div className="relative">
          <div 
            className={`${sizeClasses[size]} mx-auto mb-4 relative`}
            style={{
              animation: 'spin 1.5s linear infinite'
            }}
          >
            {/* Outer Ring - Primary Color */}
            <div 
              className="absolute inset-0 rounded-full border-2 border-transparent"
              style={{
                borderTopColor: colors.primary,
                borderRightColor: colors.primary,
                opacity: 0.8
              }}
            />
            
            {/* Inner Ring - Secondary Color */}
            <div 
              className="absolute inset-1 rounded-full border-2 border-transparent"
              style={{
                borderBottomColor: colors.secondary,
                borderLeftColor: colors.secondary,
                opacity: 0.6,
                animation: 'spin 1s linear infinite reverse'
              }}
            />
            
            {/* Center Furniture Icon */}
            <div 
              className="absolute inset-0 flex items-center justify-center"
              style={{ color: colors.accent }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2L2 7v10c0 5.55 3.84 10 9 11 1.92-.36 3.65-1.23 5-2.4 1.35 1.17 3.08 2.04 5 2.4 5.16-1 9-5.45 9-11V7l-10-5z"/>
              </svg>
            </div>
          </div>
        </div>

        {/* Brand Name with Typewriter Effect */}
        <div className="mb-4">
          <h1 
            className="text-2xl font-bold mb-2"
            style={{ 
              color: colors.primary,
              background: gradients.primary,
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text'
            }}
          >
            SnapNest
          </h1>
        </div>

        {/* Loading Message with Shimmer Effect */}
        <div className="relative">
          <div 
            className="text-base font-medium relative overflow-hidden"
            style={{ color: colors.neutralDark }}
          >
            {message}
            
            {/* Shimmer overlay */}
            <div 
              className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-30"
              style={{
                animation: 'shimmer 2s infinite',
                transform: 'translateX(-100%)'
              }}
            />
          </div>
        </div>

        {/* Progress Dots */}
        <div className="flex justify-center space-x-2 mt-6">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="w-2 h-2 rounded-full"
              style={{
                backgroundColor: colors.primary,
                opacity: 0.3,
                animation: `pulse 1.5s ease-in-out infinite ${i * 0.2}s`
              }}
            />
          ))}
        </div>
      </div>

      <style jsx>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        
        @keyframes float {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          33% { transform: translateY(-10px) rotate(1deg); }
          66% { transform: translateY(5px) rotate(-1deg); }
        }
        
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        
        @keyframes pulse {
          0%, 100% { opacity: 0.3; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.1); }
        }
      `}</style>
    </div>
  )
}