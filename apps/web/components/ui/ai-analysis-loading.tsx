'use client'

import { useState, useEffect, useMemo } from 'react'
import { colors, gradients } from '../home/design-system/colors'

interface AIAnalysisLoadingProps {
  progress: number
  message?: string
}

export function AIAnalysisLoading({ progress, message = "Analyzing your furniture..." }: AIAnalysisLoadingProps) {
  const [currentStep, setCurrentStep] = useState(0)
  const [scanLine, setScanLine] = useState(0)

  const steps = useMemo(() => [
    { icon: "📸", text: "Processing image", progress: 0 },
    { icon: "🔍", text: "Identifying furniture", progress: 25 },
    { icon: "🎨", text: "Analyzing style & material", progress: 50 },
    { icon: "💰", text: "Calculating market price", progress: 75 },
    { icon: "📝", text: "Generating description", progress: 90 }
  ], [])

  useEffect(() => {
    // Update current step based on progress
    const step = steps.findIndex(step => progress < step.progress + 20)
    setCurrentStep(step === -1 ? steps.length - 1 : Math.max(0, step))
  }, [progress, steps])

  useEffect(() => {
    // Animate scan line
    const interval = setInterval(() => {
      setScanLine(prev => (prev + 1) % 100)
    }, 50)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="ai-analysis-container">
      <div className="brain-container">
        {/* AI Brain Animation */}
        <div className="ai-brain">
          <div className="brain-core">
            <div className="neural-pulse pulse-1" />
            <div className="neural-pulse pulse-2" />
            <div className="neural-pulse pulse-3" />
            <div className="brain-icon">🧠</div>
          </div>
          
          {/* Scanning Line Effect */}
          <div 
            className="scan-line"
            style={{ top: `${scanLine}%` }}
          />
          
          {/* Neural Network Lines */}
          <div className="neural-network">
            {[...Array(6)].map((_, i) => (
              <div key={i} className={`neural-line line-${i}`} />
            ))}
          </div>
        </div>
      </div>

      {/* Main Message */}
      <div className="analysis-message">
        <h3 className="message-text">{message}</h3>
        <div className="ai-badge">
          <div className="ai-badge-icon">✨</div>
          <span>GPT-4 Vision AI</span>
        </div>
      </div>

      {/* Progress Steps */}
      <div className="steps-container">
        {steps.map((step, index) => (
          <div 
            key={index}
            className={`step-item ${index <= currentStep ? 'active' : ''} ${index < currentStep ? 'completed' : ''}`}
          >
            <div className="step-icon">{step.icon}</div>
            <div className="step-text">{step.text}</div>
            {index <= currentStep && (
              <div className="step-check">✓</div>
            )}
          </div>
        ))}
      </div>

      {/* Progress Bar */}
      <div className="progress-section">
        <div className="progress-bar-container">
          <div className="progress-track">
            <div 
              className="progress-fill"
              style={{ width: `${Math.min(progress, 100)}%` }}
            >
              <div className="progress-glow" />
            </div>
          </div>
          <div className="progress-percentage">
            {Math.round(Math.min(progress, 100))}%
          </div>
        </div>
        
        {/* Fun Facts */}
        <div className="fun-fact">
          <div className="fact-icon">💡</div>
          <div className="fact-text">
            AI can identify furniture styles, materials, and estimate prices in seconds!
          </div>
        </div>
      </div>

      <style jsx>{`
        .ai-analysis-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 2rem;
          background: ${colors.glass.background};
          border-radius: 20px;
          backdrop-filter: blur(10px);
          border: 1px solid ${colors.glass.border};
          max-width: 500px;
          width: 100%;
          position: relative;
          overflow: hidden;
        }

        .ai-analysis-container::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: linear-gradient(45deg, ${colors.primary}10, ${colors.secondary}10, ${colors.accent}10);
          opacity: 0.5;
          animation: gradient-shift 6s ease-in-out infinite;
        }

        .brain-container {
          position: relative;
          z-index: 2;
          margin-bottom: 2rem;
        }

        .ai-brain {
          width: 120px;
          height: 120px;
          position: relative;
          border: 3px solid ${colors.primary}30;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          background: radial-gradient(circle, ${colors.primary}05 0%, transparent 70%);
          overflow: hidden;
        }

        .brain-core {
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .brain-icon {
          font-size: 2.5rem;
          z-index: 3;
          animation: float 3s ease-in-out infinite;
        }

        .neural-pulse {
          position: absolute;
          width: 100%;
          height: 100%;
          border: 2px solid ${colors.primary};
          border-radius: 50%;
          opacity: 0.7;
          animation: neural-pulse 2s ease-out infinite;
        }

        .pulse-1 {
          animation-delay: 0s;
        }

        .pulse-2 {
          animation-delay: 0.7s;
        }

        .pulse-3 {
          animation-delay: 1.4s;
        }

        .scan-line {
          position: absolute;
          left: 0;
          right: 0;
          height: 2px;
          background: linear-gradient(90deg, transparent, ${colors.accent}, transparent);
          opacity: 0.8;
          animation: scan 2s linear infinite;
        }

        .neural-network {
          position: absolute;
          width: 100%;
          height: 100%;
        }

        .neural-line {
          position: absolute;
          background: ${colors.secondary}40;
          opacity: 0.6;
          animation: neural-activity 3s ease-in-out infinite;
        }

        .line-0 { top: 20%; left: 10%; width: 30px; height: 1px; transform: rotate(45deg); animation-delay: 0.5s; }
        .line-1 { top: 60%; left: 60%; width: 25px; height: 1px; transform: rotate(-30deg); animation-delay: 1s; }
        .line-2 { top: 40%; right: 15%; width: 20px; height: 1px; transform: rotate(60deg); animation-delay: 1.5s; }
        .line-3 { bottom: 30%; left: 20%; width: 28px; height: 1px; transform: rotate(-45deg); animation-delay: 2s; }
        .line-4 { bottom: 20%; right: 25%; width: 22px; height: 1px; transform: rotate(30deg); animation-delay: 2.5s; }
        .line-5 { top: 30%; left: 50%; width: 18px; height: 1px; transform: rotate(15deg); animation-delay: 0.2s; }

        .analysis-message {
          text-align: center;
          margin-bottom: 2rem;
          z-index: 2;
          position: relative;
        }

        .message-text {
          font-size: 1.3rem;
          font-weight: 700;
          color: ${colors.neutralDark};
          margin-bottom: 1rem;
          background: ${gradients.primary};
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .ai-badge {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.5rem 1rem;
          background: ${colors.accent}15;
          border: 1px solid ${colors.accent}30;
          border-radius: 50px;
          color: ${colors.accent};
          font-size: 0.85rem;
          font-weight: 600;
        }

        .ai-badge-icon {
          animation: sparkle 2s ease-in-out infinite;
        }

        .steps-container {
          display: flex;
          flex-direction: column;
          gap: 1rem;
          width: 100%;
          margin-bottom: 2rem;
          z-index: 2;
          position: relative;
        }

        .step-item {
          display: flex;
          align-items: center;
          gap: 1rem;
          padding: 0.75rem 1rem;
          border-radius: 12px;
          background: ${colors.glass.background};
          border: 1px solid ${colors.glass.border};
          transition: all 300ms ease;
          position: relative;
          opacity: 0.5;
        }

        .step-item.active {
          opacity: 1;
          background: ${colors.primary}10;
          border-color: ${colors.primary}30;
          transform: translateX(8px);
        }

        .step-item.completed {
          opacity: 0.8;
          background: ${colors.accent}10;
          border-color: ${colors.accent}30;
        }

        .step-icon {
          font-size: 1.2rem;
          flex-shrink: 0;
        }

        .step-text {
          flex-grow: 1;
          font-size: 0.9rem;
          font-weight: 500;
          color: ${colors.neutralDark};
        }

        .step-check {
          color: ${colors.accent};
          font-weight: bold;
          font-size: 1rem;
        }

        .progress-section {
          width: 100%;
          z-index: 2;
          position: relative;
        }

        .progress-bar-container {
          display: flex;
          align-items: center;
          gap: 1rem;
          margin-bottom: 1.5rem;
        }

        .progress-track {
          flex-grow: 1;
          height: 12px;
          background: ${colors.primary}20;
          border-radius: 6px;
          overflow: hidden;
          position: relative;
        }

        .progress-fill {
          height: 100%;
          background: ${gradients.primary};
          border-radius: 6px;
          transition: width 500ms ease;
          position: relative;
          overflow: hidden;
        }

        .progress-glow {
          position: absolute;
          top: 0;
          right: -20px;
          bottom: 0;
          width: 20px;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.6), transparent);
          animation: progress-glow 2s ease-in-out infinite;
        }

        .progress-percentage {
          font-size: 1rem;
          font-weight: 700;
          color: ${colors.primary};
          font-family: 'Monaco', 'Menlo', monospace;
          min-width: 45px;
          text-align: right;
        }

        .fun-fact {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 1rem;
          background: ${colors.secondary}10;
          border: 1px solid ${colors.secondary}20;
          border-radius: 12px;
          font-size: 0.85rem;
          color: ${colors.neutralDark};
        }

        .fact-icon {
          font-size: 1.1rem;
          flex-shrink: 0;
        }

        .fact-text {
          opacity: 0.9;
        }

        @keyframes neural-pulse {
          0% { transform: scale(0.8); opacity: 0.7; }
          50% { transform: scale(1.2); opacity: 0.3; }
          100% { transform: scale(1.5); opacity: 0; }
        }

        @keyframes float {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-5px) rotate(5deg); }
        }

        @keyframes scan {
          0% { top: 0%; opacity: 0; }
          50% { opacity: 1; }
          100% { top: 100%; opacity: 0; }
        }

        @keyframes neural-activity {
          0%, 100% { opacity: 0.3; transform: scale(1); }
          50% { opacity: 0.8; transform: scale(1.1); }
        }

        @keyframes sparkle {
          0%, 100% { transform: rotate(0deg) scale(1); }
          50% { transform: rotate(180deg) scale(1.2); }
        }

        @keyframes progress-glow {
          0%, 100% { transform: translateX(-20px); opacity: 0; }
          50% { transform: translateX(10px); opacity: 1; }
        }

        @keyframes gradient-shift {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }

        @media (max-width: 768px) {
          .ai-analysis-container {
            padding: 1.5rem;
            max-width: 90%;
          }

          .ai-brain {
            width: 100px;
            height: 100px;
          }

          .brain-icon {
            font-size: 2rem;
          }

          .message-text {
            font-size: 1.1rem;
          }

          .step-item {
            padding: 0.6rem 0.8rem;
          }

          .step-text {
            font-size: 0.85rem;
          }
        }
      `}</style>
    </div>
  )
}