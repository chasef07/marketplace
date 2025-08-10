'use client'

import { useEffect, useState } from 'react'
import { colors, gradients } from './design-system/colors'
import { animations, animationClasses } from './design-system/animations'

interface FloatingShape {
  id: string
  type: 'circle' | 'hexagon' | 'square'
  size: number
  x: number
  y: number
  delay: number
  duration: number
  color: string
}

export function AnimatedBackground() {
  const [shapes, setShapes] = useState<FloatingShape[]>([])

  useEffect(() => {
    // Generate floating shapes
    const generateShapes = (): FloatingShape[] => {
      const shapeTypes: ('circle' | 'hexagon' | 'square')[] = ['circle', 'hexagon', 'square']
      const colorOptions = [
        colors.primary + '15',
        colors.secondary + '20', 
        colors.accent + '12',
        colors.primaryLight + '18',
        colors.secondaryLight + '15'
      ]

      return Array.from({ length: 12 }, (_, i) => ({
        id: `shape-${i}`,
        type: shapeTypes[Math.floor(Math.random() * shapeTypes.length)],
        size: Math.random() * 80 + 40, // 40-120px
        x: Math.random() * 100, // 0-100%
        y: Math.random() * 100, // 0-100%
        delay: Math.random() * 20, // 0-20s delay
        duration: Math.random() * 15 + 15, // 15-30s duration
        color: colorOptions[Math.floor(Math.random() * colorOptions.length)]
      }))
    }

    setShapes(generateShapes())
  }, [])

  const getShapeClipPath = (type: string) => {
    switch (type) {
      case 'hexagon':
        return 'polygon(30% 0%, 70% 0%, 100% 50%, 70% 100%, 30% 100%, 0% 50%)'
      case 'square':
        return 'polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)'
      default:
        return 'circle(50%)'
    }
  }

  return (
    <div className="animated-background">
      {/* Base gradient mesh */}
      <div className="gradient-mesh"></div>
      
      {/* Grid pattern overlay */}
      <div className="grid-pattern"></div>
      
      {/* Floating shapes */}
      <div className="floating-shapes">
        {shapes.map((shape) => (
          <div
            key={shape.id}
            className="floating-shape"
            style={{
              width: `${shape.size}px`,
              height: `${shape.size}px`,
              left: `${shape.x}%`,
              top: `${shape.y}%`,
              backgroundColor: shape.color,
              clipPath: getShapeClipPath(shape.type),
              animationDelay: `${shape.delay}s`,
              animationDuration: `${shape.duration}s`
            }}
          />
        ))}
      </div>

      {/* Parallax layers */}
      <div className="parallax-layer layer-1"></div>
      <div className="parallax-layer layer-2"></div>
      <div className="parallax-layer layer-3"></div>

      <style jsx>{`
        .animated-background {
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          z-index: -1;
          overflow: hidden;
          pointer-events: none;
        }

        .gradient-mesh {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: ${gradients.background};
          background-size: 400% 400%;
          ${animationClasses.gradientShift}
        }

        .gradient-mesh::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: ${gradients.mesh};
          opacity: 0.6;
          ${animationClasses.gradientShift}
          animation-duration: 12s;
          animation-direction: reverse;
        }

        .grid-pattern {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          opacity: 0.03;
          background-image: 
            linear-gradient(${colors.neutralDark} 1px, transparent 1px),
            linear-gradient(90deg, ${colors.neutralDark} 1px, transparent 1px);
          background-size: 60px 60px;
          background-position: 0 0, 0 0;
          animation: gridMove 60s linear infinite;
        }

        @keyframes gridMove {
          0% { transform: translate(0, 0); }
          100% { transform: translate(60px, 60px); }
        }

        .floating-shapes {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
        }

        .floating-shape {
          position: absolute;
          ${animationClasses.drift}
          opacity: 0.8;
          transition: opacity 2s ${animations.easing.gentle};
        }

        .floating-shape:hover {
          opacity: 1;
        }

        .parallax-layer {
          position: absolute;
          width: 120%;
          height: 120%;
          border-radius: 50%;
          filter: blur(40px);
          opacity: 0.1;
        }

        .layer-1 {
          top: -10%;
          left: -10%;
          background: radial-gradient(circle, ${colors.primary} 0%, transparent 70%);
          ${animationClasses.float}
          animation-duration: 20s;
        }

        .layer-2 {
          top: 20%;
          right: -10%;
          background: radial-gradient(circle, ${colors.secondary} 0%, transparent 70%);
          ${animationClasses.float}
          animation-duration: 25s;
          animation-delay: -5s;
        }

        .layer-3 {
          bottom: -10%;
          left: 10%;
          background: radial-gradient(circle, ${colors.accent} 0%, transparent 70%);
          ${animationClasses.float}
          animation-duration: 30s;
          animation-delay: -10s;
        }

        ${animations.keyframes.drift}
        ${animations.keyframes.float}
        ${animations.keyframes.gradientShift}

        @media (max-width: 768px) {
          .floating-shapes {
            display: none; /* Reduce complexity on mobile */
          }
          
          .grid-pattern {
            opacity: 0.02;
            background-size: 40px 40px;
          }
          
          .parallax-layer {
            filter: blur(20px);
            opacity: 0.08;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .gradient-mesh,
          .gradient-mesh::before,
          .floating-shape,
          .parallax-layer,
          .grid-pattern {
            animation: none !important;
          }
          
          .floating-shapes {
            display: none;
          }
        }
      `}</style>
    </div>
  )
}