'use client'

import { useEffect, useState } from 'react'
import { colors, gradients, shadows } from './design-system/colors'
import { animations, animationClasses, staggerDelays } from './design-system/animations'

interface TrustMetric {
  id: string
  icon: string
  value: string
  label: string
  trend?: string
  color: string
}

const trustMetrics: TrustMetric[] = [
  {
    id: 'items-analyzed',
    icon: '🔍',
    value: '2,847',
    label: 'items analyzed today',
    trend: '+127',
    color: colors.primary
  },
  {
    id: 'avg-sale-time',
    icon: '⚡',
    value: '48 hours',
    label: 'average sale time',
    trend: '-12h',
    color: colors.accent
  },
  {
    id: 'earnings',
    icon: '💰',
    value: '$12,450',
    label: 'earned by neighbors this month',
    trend: '+$2,100',
    color: colors.secondary
  }
]

export function TrustIndicators() {
  const [animatedValues, setAnimatedValues] = useState<{ [key: string]: number }>({})
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    // Trigger visibility for staggered animations
    const timer = setTimeout(() => setIsVisible(true), 500)
    return () => clearTimeout(timer)
  }, [])

  useEffect(() => {
    if (!isVisible) return

    // Animate numerical values
    const animateValue = (targetStr: string, key: string) => {
      const target = parseInt(targetStr.replace(/[^0-9]/g, ''))
      if (isNaN(target)) return

      let current = 0
      const increment = target / 50
      const timer = setInterval(() => {
        current += increment
        if (current >= target) {
          current = target
          clearInterval(timer)
        }
        setAnimatedValues(prev => ({ ...prev, [key]: Math.floor(current) }))
      }, 30)

      return () => clearInterval(timer)
    }

    // Start animations for numerical metrics
    trustMetrics.forEach(metric => {
      if (metric.value.includes('$') || metric.value.includes(',')) {
        animateValue(metric.value, metric.id)
      }
    })
  }, [isVisible])

  const formatAnimatedValue = (metric: TrustMetric): string => {
    const animatedValue = animatedValues[metric.id]
    
    if (metric.value.includes('$')) {
      return `$${animatedValue?.toLocaleString() || '0'}`
    }
    if (metric.value.includes(',')) {
      return animatedValue?.toLocaleString() || '0'
    }
    return metric.value
  }

  return (
    <div className="trust-indicators">
      <div className="trust-header">
        <h3 className="trust-title">Join the Community</h3>
        <p className="trust-subtitle">Real stats from real neighbors</p>
      </div>

      <div className="metrics-grid">
        {trustMetrics.map((metric, index) => (
          <div 
            key={metric.id}
            className={`metric-card ${isVisible ? 'visible' : ''}`}
            style={{ animationDelay: Object.values(staggerDelays)[index] }}
          >
            <div className="metric-icon" style={{ color: metric.color }}>
              {metric.icon}
            </div>
            
            <div className="metric-content">
              <div className="metric-value-container">
                <span className="metric-value" style={{ color: metric.color }}>
                  {formatAnimatedValue(metric)}
                </span>
                {metric.trend && (
                  <span className={`metric-trend ${metric.trend.startsWith('+') ? 'positive' : 'negative'}`}>
                    {metric.trend}
                  </span>
                )}
              </div>
              <span className="metric-label">{metric.label}</span>
            </div>

            <div className="metric-pulse" style={{ backgroundColor: metric.color + '20' }}></div>
          </div>
        ))}
      </div>

      {/* Community highlight */}
      <div className={`community-highlight ${isVisible ? 'visible' : ''}`}>
        <div className="highlight-content">
          <span className="highlight-icon">🏘️</span>
          <span className="highlight-text">
            Active in <strong>47 neighborhoods</strong> across your city
          </span>
        </div>
      </div>

      <style jsx>{`
        .trust-indicators {
          max-width: 1000px;
          margin: 0 auto;
          padding: 3rem 2rem;
          text-align: center;
        }

        .trust-header {
          margin-bottom: 2.5rem;
        }

        .trust-title {
          font-size: 2rem;
          font-weight: 800;
          color: ${colors.neutralDark};
          margin-bottom: 0.5rem;
          font-family: 'Inter', -apple-system, sans-serif;
          letter-spacing: -0.02em;
        }

        .trust-subtitle {
          color: ${colors.primary};
          font-size: 1rem;
          opacity: 0.8;
          font-weight: 500;
        }

        .metrics-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
          gap: 1.5rem;
          margin-bottom: 2.5rem;
        }

        .metric-card {
          background: ${colors.glass.background};
          border: 1px solid ${colors.glass.border};
          border-radius: 20px;
          padding: 2rem 1.5rem;
          display: flex;
          align-items: center;
          gap: 1.5rem;
          backdrop-filter: blur(10px);
          box-shadow: ${shadows.md};
          position: relative;
          overflow: hidden;
          opacity: 0;
          transform: translateY(30px);
          transition: all 500ms ${animations.easing.smooth};
        }

        .metric-card.visible {
          opacity: 1;
          transform: translateY(0);
        }

        .metric-card:hover {
          transform: translateY(-5px);
          box-shadow: ${shadows.lg};
          border-color: ${colors.primary}30;
        }

        .metric-icon {
          font-size: 2.5rem;
          flex-shrink: 0;
          ${animationClasses.pulse}
        }

        .metric-content {
          flex: 1;
          text-align: left;
        }

        .metric-value-container {
          display: flex;
          align-items: baseline;
          gap: 0.75rem;
          margin-bottom: 0.5rem;
        }

        .metric-value {
          font-size: 1.8rem;
          font-weight: 800;
          line-height: 1;
          font-family: 'Inter', -apple-system, sans-serif;
          letter-spacing: -0.02em;
        }

        .metric-trend {
          font-size: 0.8rem;
          font-weight: 600;
          padding: 0.2rem 0.5rem;
          border-radius: 12px;
          font-family: 'Monaco', 'Menlo', monospace;
        }

        .metric-trend.positive {
          background: ${colors.accent}20;
          color: ${colors.accent};
        }

        .metric-trend.negative {
          background: ${colors.primary}20;
          color: ${colors.primary};
        }

        .metric-label {
          color: ${colors.neutralDark};
          font-size: 0.9rem;
          font-weight: 500;
          opacity: 0.8;
        }

        .metric-pulse {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          border-radius: 20px;
          opacity: 0;
          ${animationClasses.pulse}
          animation-duration: 3s;
        }

        .metric-card:hover .metric-pulse {
          opacity: 1;
        }

        .community-highlight {
          background: ${gradients.accent};
          color: white;
          padding: 1.5rem 2rem;
          border-radius: 16px;
          box-shadow: ${shadows.accent};
          opacity: 0;
          transform: translateY(20px);
          transition: all 600ms ${animations.easing.smooth};
          position: relative;
          overflow: hidden;
        }

        .community-highlight.visible {
          opacity: 1;
          transform: translateY(0);
        }

        .community-highlight::before {
          content: '';
          position: absolute;
          top: 0;
          left: -100%;
          width: 100%;
          height: 100%;
          background: linear-gradient(
            90deg,
            transparent,
            rgba(255, 255, 255, 0.2),
            transparent
          );
          ${animationClasses.shimmer}
        }

        .highlight-content {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 1rem;
          position: relative;
          z-index: 2;
        }

        .highlight-icon {
          font-size: 1.5rem;
        }

        .highlight-text {
          font-size: 1rem;
          font-weight: 500;
        }

        .highlight-text strong {
          font-weight: 700;
        }

        ${animations.keyframes.pulse}
        ${animations.keyframes.shimmer}

        @media (max-width: 768px) {
          .trust-indicators {
            padding: 2rem 1rem;
          }
          
          .trust-title {
            font-size: 1.6rem;
          }
          
          .metrics-grid {
            grid-template-columns: 1fr;
            gap: 1rem;
          }
          
          .metric-card {
            padding: 1.5rem;
            flex-direction: column;
            text-align: center;
            gap: 1rem;
          }
          
          .metric-content {
            text-align: center;
          }
          
          .metric-value-container {
            justify-content: center;
          }
          
          .community-highlight {
            padding: 1.25rem 1.5rem;
          }
          
          .highlight-content {
            flex-direction: column;
            gap: 0.75rem;
          }
        }
      `}</style>
    </div>
  )
}