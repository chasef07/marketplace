'use client'

import { colors, gradients } from './design-system/colors'
import { animations } from './design-system/animations'

interface Step {
  id: string
  number: string
  title: string
  mainText: string
  subText: string
  icon: React.ReactElement
  color: string
  bgColor: string
}

const steps: Step[] = [
  {
    id: 'snap',
    number: '1',
    title: 'Snap',
    mainText: 'Photo = Instant listing',
    subText: 'AI identifies, prices, and describes your item automatically',
    icon: (
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M9 2L7.17 4H4C2.9 4 2 4.9 2 6V18C2 19.1 2.9 20 4 20H20C21.1 20 22 19.1 22 18V6C22 4.9 21.1 4 20 4H16.83L15 2H9ZM12 17C9.24 17 7 14.76 7 12S9.24 7 12 7S17 9.24 17 12S14.76 17 12 17ZM12 9C10.34 9 9 10.34 9 12S10.34 15 12 15S15 13.66 15 12S13.66 9 12 9Z" fill="currentColor"/>
        <circle cx="12" cy="12" r="2" fill="currentColor"/>
      </svg>
    ),
    color: colors.primary,
    bgColor: colors.primary + '15'
  },
  {
    id: 'list',
    number: '2', 
    title: 'List',
    mainText: 'Live in your neighborhood',
    subText: 'Reaches buyers within 5 miles who are actively looking',
    icon: (
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" fill="currentColor"/>
        <circle cx="12" cy="9" r="1.5" fill="currentColor"/>
        <circle cx="8" cy="20" r="2" fill="currentColor" opacity="0.6"/>
        <circle cx="16" cy="18" r="1.5" fill="currentColor" opacity="0.4"/>
        <circle cx="6" cy="16" r="1" fill="currentColor" opacity="0.3"/>
      </svg>
    ),
    color: colors.secondary,
    bgColor: colors.secondary + '15'
  },
  {
    id: 'sell',
    number: '3',
    title: 'Sell', 
    mainText: 'AI agent handles everything',
    subText: 'Your AI assistant responds to inquiries, negotiates offers, and manages counteroffers 24/7',
    icon: (
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 2C13.1 2 14 2.9 14 4C14 5.1 13.1 6 12 6C10.9 6 10 5.1 10 4C10 2.9 10.9 2 12 2ZM21 9V7L15 1H9V3H7.5C6.11 3 5 4.11 5 5.5V9.5C5 10.61 5.89 11.5 7 11.5H11V15L9 17V21H11V18.5L12.5 17H15V21H17V17L15 15V11.5H19C20.11 11.5 21 10.61 21 9.5V9Z" fill="currentColor"/>
        <circle cx="12" cy="8" r="1.5" fill="currentColor"/>
        <path d="M8 14L10 16L16 10" stroke="currentColor" strokeWidth="2" fill="none" opacity="0.8"/>
        <circle cx="18" cy="6" r="3" fill="currentColor" opacity="0.2"/>
        <path d="M16.5 5.5L17.5 6.5L19.5 4.5" stroke="currentColor" strokeWidth="1" fill="none"/>
      </svg>
    ),
    color: colors.accent,
    bgColor: colors.accent + '15'
  }
]

export function HowItWorks() {
  return (
    <section className="how-it-works">
      <div className="container">
        {/* Section Header */}
        <div className="section-header">
          <h2 className="section-title">How It Works</h2>
          <p className="section-subtitle">
            From photo to sale in three simple steps
          </p>
        </div>

        {/* Simple Steps */}
        <div className="steps-container">
          <div className="step-card">
            <h3>1. Snap</h3>
            <h4>Photo = Instant listing</h4>
            <p>AI identifies, prices, and describes your item automatically</p>
          </div>
          
          <div className="step-card">
            <h3>2. List</h3>
            <h4>Live in your neighborhood</h4>
            <p>Reaches buyers within 5 miles who are actively looking</p>
          </div>
          
          <div className="step-card">
            <h3>3. Sell</h3>
            <h4>AI agent handles everything</h4>
            <p>Your AI assistant responds to inquiries, negotiates offers, and manages counteroffers 24/7</p>
          </div>
        </div>
      </div>

      <style jsx>{`
        .how-it-works {
          padding: 4rem 0;
          background: linear-gradient(
            135deg,
            ${colors.background} 0%,
            ${colors.neutralLight} 50%,
            ${colors.background} 100%
          );
          position: relative;
          overflow: hidden;
          min-height: 600px;
          border: 2px solid red;
        }

        .how-it-works::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: ${gradients.mesh};
          opacity: 0.1;
          pointer-events: none;
        }

        .container {
          max-width: 1200px;
          margin: 0 auto;
          padding: 0 2rem;
          position: relative;
          z-index: 2;
        }

        .section-header {
          text-align: center;
          margin-bottom: 3rem;
          opacity: 0;
          transform: translateY(30px);
          transition: all 600ms ${animations.easing.smooth};
        }

        .section-header.visible {
          opacity: 1;
          transform: translateY(0);
        }

        .section-title {
          font-size: 2.5rem;
          font-weight: 800;
          color: ${colors.neutralDark};
          margin-bottom: 1rem;
          font-family: 'Inter', -apple-system, sans-serif;
          letter-spacing: -0.02em;
          background: ${gradients.primary};
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .section-subtitle {
          font-size: 1.1rem;
          color: ${colors.primary};
          opacity: 0.8;
          font-weight: 500;
        }

        .steps-container {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 2rem;
          margin-bottom: 3rem;
        }

        .step-card {
          background: white;
          border: 2px solid ${colors.primary};
          border-radius: 12px;
          padding: 2rem;
          text-align: center;
          box-shadow: 0 4px 12px rgba(0,0,0,0.1);
        }

        .step-card h3 {
          color: ${colors.primary};
          font-size: 1.5rem;
          margin-bottom: 1rem;
        }

        .step-card h4 {
          color: ${colors.neutralDark};
          font-size: 1.2rem;
          margin-bottom: 0.5rem;
        }

        .step-card p {
          color: ${colors.neutralDark};
          font-size: 0.9rem;
          opacity: 0.8;
        }


        @media (max-width: 768px) {
          .steps-container {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </section>
  )
}