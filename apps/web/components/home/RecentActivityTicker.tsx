'use client'

import { useEffect, useState } from 'react'
import { colors, gradients } from './design-system/colors'
import { animations, animationClasses } from './design-system/animations'

interface Activity {
  id: string
  type: 'listing' | 'sale' | 'analysis'
  icon: string
  text: string
  time: string
  location: string
}

const mockActivities: Activity[] = [
  {
    id: '1',
    type: 'sale',
    icon: '🎉',
    text: 'Vintage armchair sold for $280',
    time: '2 min ago',
    location: 'Downtown'
  },
  {
    id: '2', 
    type: 'listing',
    icon: '📸',
    text: 'New modern coffee table listed',
    time: '5 min ago',
    location: 'Midtown'
  },
  {
    id: '3',
    type: 'analysis',
    icon: '🤖',
    text: 'AI analyzed ceramic vase set',
    time: '8 min ago',
    location: 'Westside'
  },
  {
    id: '4',
    type: 'sale',
    icon: '✨',
    text: 'Floor lamp found new home',
    time: '12 min ago',
    location: 'Eastwood'
  },
  {
    id: '5',
    type: 'listing',
    icon: '🪑',
    text: 'Dining set ready for new family',
    time: '15 min ago',
    location: 'Uptown'
  },
  {
    id: '6',
    type: 'analysis',
    icon: '🔍',
    text: 'Antique dresser priced at $450',
    time: '18 min ago',
    location: 'Old Town'
  },
  {
    id: '7',
    type: 'sale',
    icon: '🏡',
    text: 'Bookshelf moving to new study',
    time: '22 min ago',
    location: 'Riverside'
  },
  {
    id: '8',
    type: 'listing',
    icon: '💡',
    text: 'Designer lamp seeking bright future',
    time: '25 min ago',
    location: 'Hillcrest'
  }
]

export function RecentActivityTicker() {
  const [currentActivities, setCurrentActivities] = useState(mockActivities)
  const [isPaused, setIsPaused] = useState(false)

  useEffect(() => {
    if (isPaused) return

    const interval = setInterval(() => {
      // Simulate new activity
      const newActivity: Activity = {
        id: `activity-${Date.now()}`,
        type: ['listing', 'sale', 'analysis'][Math.floor(Math.random() * 3)] as Activity['type'],
        icon: ['🎉', '📸', '🤖', '✨', '🪑', '🔍', '🏡', '💡'][Math.floor(Math.random() * 8)],
        text: [
          'Vintage chair found loving home',
          'Mid-century table analyzed',
          'Modern sofa ready for pickup',
          'Antique mirror priced perfectly',
          'Designer lamp sold instantly',
          'Ceramic vases analyzed by AI',
          'Oak bookshelf moving homes',
          'Retro armchair listed today'
        ][Math.floor(Math.random() * 8)],
        time: 'just now',
        location: ['Downtown', 'Midtown', 'Westside', 'Eastwood', 'Uptown', 'Old Town', 'Riverside', 'Hillcrest'][Math.floor(Math.random() * 8)]
      }

      setCurrentActivities(prev => [newActivity, ...prev.slice(0, 7)])
    }, 8000) // New activity every 8 seconds

    return () => clearInterval(interval)
  }, [isPaused])

  const getActivityColor = (type: Activity['type']) => {
    switch (type) {
      case 'sale':
        return colors.accent
      case 'listing':
        return colors.primary
      case 'analysis':
        return colors.secondary
      default:
        return colors.neutralDark
    }
  }

  return (
    <div className="activity-ticker">
      <div className="ticker-header">
        <div className="ticker-title">
          <span className="live-indicator"></span>
          Live Activity
        </div>
        <div className="ticker-subtitle">
          Real-time furniture marketplace activity in your area
        </div>
      </div>

      <div 
        className="ticker-container"
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
      >
        <div className={`ticker-track ${isPaused ? 'paused' : ''}`}>
          {/* Duplicate activities for seamless loop */}
          {[...currentActivities, ...currentActivities].map((activity, index) => (
            <div 
              key={`${activity.id}-${index}`}
              className="activity-item"
              style={{ '--activity-color': getActivityColor(activity.type) } as React.CSSProperties}
            >
              <div className="activity-icon">{activity.icon}</div>
              <div className="activity-content">
                <span className="activity-text">{activity.text}</span>
                <div className="activity-meta">
                  <span className="activity-time">{activity.time}</span>
                  <span className="activity-location">📍 {activity.location}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="ticker-controls">
        <button 
          className={`control-btn ${isPaused ? 'active' : ''}`}
          onClick={() => setIsPaused(!isPaused)}
        >
          {isPaused ? '▶️' : '⏸️'}
        </button>
      </div>

      <style jsx>{`
        .activity-ticker {
          background: ${colors.neutralDark};
          color: ${colors.neutralLight};
          border-top: 3px solid ${colors.primary};
          padding: 1.5rem 0;
          overflow: hidden;
          position: relative;
        }

        .activity-ticker::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 3px;
          background: ${gradients.primary};
          ${animationClasses.shimmer}
        }

        .ticker-header {
          max-width: 1200px;
          margin: 0 auto;
          padding: 0 2rem;
          text-align: center;
          margin-bottom: 1rem;
        }

        .ticker-title {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          font-size: 1.1rem;
          font-weight: 700;
          margin-bottom: 0.25rem;
          color: ${colors.neutralLight};
        }

        .live-indicator {
          width: 8px;
          height: 8px;
          background: ${colors.accent};
          border-radius: 50%;
          ${animationClasses.pulse}
        }

        .ticker-subtitle {
          font-size: 0.8rem;
          color: ${colors.neutralLight};
          opacity: 0.7;
        }

        .ticker-container {
          position: relative;
          overflow: hidden;
          height: 80px;
          mask-image: linear-gradient(
            to right,
            transparent,
            black 100px,
            black calc(100% - 100px),
            transparent
          );
        }

        .ticker-track {
          display: flex;
          gap: 2rem;
          ${animationClasses.ticker}
          animation-play-state: running;
        }

        .ticker-track.paused {
          animation-play-state: paused;
        }

        .activity-item {
          display: flex;
          align-items: center;
          gap: 1rem;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-left: 3px solid var(--activity-color);
          border-radius: 12px;
          padding: 1rem 1.5rem;
          min-width: 300px;
          flex-shrink: 0;
          backdrop-filter: blur(10px);
          transition: all 300ms ${animations.easing.smooth};
        }

        .activity-item:hover {
          background: rgba(255, 255, 255, 0.1);
          transform: translateY(-2px);
        }

        .activity-icon {
          font-size: 1.5rem;
          flex-shrink: 0;
        }

        .activity-content {
          flex: 1;
          min-width: 0;
        }

        .activity-text {
          font-size: 0.9rem;
          font-weight: 600;
          color: ${colors.neutralLight};
          display: block;
          margin-bottom: 0.25rem;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .activity-meta {
          display: flex;
          gap: 1rem;
          font-size: 0.75rem;
          opacity: 0.7;
        }

        .activity-time {
          color: var(--activity-color);
          font-weight: 600;
        }

        .activity-location {
          color: ${colors.neutralLight};
        }

        .ticker-controls {
          position: absolute;
          top: 1rem;
          right: 2rem;
          z-index: 10;
        }

        .control-btn {
          background: rgba(255, 255, 255, 0.1);
          border: 1px solid rgba(255, 255, 255, 0.2);
          border-radius: 8px;
          padding: 0.5rem;
          color: ${colors.neutralLight};
          cursor: pointer;
          transition: all 300ms ${animations.easing.smooth};
          backdrop-filter: blur(10px);
        }

        .control-btn:hover {
          background: rgba(255, 255, 255, 0.2);
        }

        .control-btn.active {
          background: ${colors.primary};
          border-color: ${colors.primary};
        }

        ${animations.keyframes.ticker}
        ${animations.keyframes.pulse}
        ${animations.keyframes.shimmer}

        @media (max-width: 768px) {
          .ticker-header {
            padding: 0 1rem;
          }
          
          .ticker-controls {
            right: 1rem;
          }
          
          .activity-item {
            min-width: 250px;
            padding: 0.75rem 1rem;
          }
          
          .activity-meta {
            flex-direction: column;
            gap: 0.25rem;
          }
          
          .ticker-container {
            height: 90px;
          }
        }
      `}</style>
    </div>
  )
}