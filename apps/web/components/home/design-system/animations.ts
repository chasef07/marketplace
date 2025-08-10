// SnapNest Design System - Animation Utilities

export const animations = {
  // Duration presets
  duration: {
    fast: '200ms',
    normal: '300ms',
    slow: '500ms',
    slower: '700ms'
  },
  
  // Easing functions
  easing: {
    smooth: 'cubic-bezier(0.4, 0, 0.2, 1)',
    bounce: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
    gentle: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)'
  },
  
  // Keyframe animations
  keyframes: {
    fadeIn: `
      @keyframes fadeIn {
        from { opacity: 0; transform: translateY(20px); }
        to { opacity: 1; transform: translateY(0); }
      }
    `,
    slideInLeft: `
      @keyframes slideInLeft {
        from { opacity: 0; transform: translateX(-30px); }
        to { opacity: 1; transform: translateX(0); }
      }
    `,
    slideInRight: `
      @keyframes slideInRight {
        from { opacity: 0; transform: translateX(30px); }
        to { opacity: 1; transform: translateX(0); }
      }
    `,
    pulse: `
      @keyframes pulse {
        0%, 100% { transform: scale(1); opacity: 1; }
        50% { transform: scale(1.05); opacity: 0.8; }
      }
    `,
    float: `
      @keyframes float {
        0%, 100% { transform: translateY(0px) rotate(0deg); }
        33% { transform: translateY(-10px) rotate(1deg); }
        66% { transform: translateY(5px) rotate(-1deg); }
      }
    `,
    drift: `
      @keyframes drift {
        0%, 100% { transform: translate(0, 0) rotate(0deg); }
        25% { transform: translate(20px, -10px) rotate(2deg); }
        50% { transform: translate(-15px, 20px) rotate(-1deg); }
        75% { transform: translate(10px, 5px) rotate(1deg); }
      }
    `,
    scanLine: `
      @keyframes scanLine {
        0% { transform: translateX(-100%); opacity: 0; }
        50% { opacity: 1; }
        100% { transform: translateX(100%); opacity: 0; }
      }
    `,
    shimmer: `
      @keyframes shimmer {
        0% { background-position: -200% 0; }
        100% { background-position: 200% 0; }
      }
    `,
    typewriter: `
      @keyframes typewriter {
        from { width: 0; }
        to { width: 100%; }
      }
    `,
    blink: `
      @keyframes blink {
        0%, 50% { opacity: 1; }
        51%, 100% { opacity: 0; }
      }
    `,
    scaleIn: `
      @keyframes scaleIn {
        from { 
          opacity: 0; 
          transform: scale(0.9); 
        }
        to { 
          opacity: 1; 
          transform: scale(1); 
        }
      }
    `,
    bounceIn: `
      @keyframes bounceIn {
        0% { opacity: 0; transform: scale(0.3); }
        50% { opacity: 1; transform: scale(1.1); }
        100% { opacity: 1; transform: scale(1); }
      }
    `,
    ticker: `
      @keyframes ticker {
        0% { transform: translateX(100%); }
        100% { transform: translateX(-100%); }
      }
    `,
    gradientShift: `
      @keyframes gradientShift {
        0%, 100% { background-position: 0% 50%; }
        50% { background-position: 100% 50%; }
      }
    `
  }
} as const

// Animation classes for easy application
export const animationClasses = {
  fadeIn: `
    animation: fadeIn 500ms ${animations.easing.smooth} both;
  `,
  slideInLeft: `
    animation: slideInLeft 400ms ${animations.easing.smooth} both;
  `,
  slideInRight: `
    animation: slideInRight 400ms ${animations.easing.smooth} both;
  `,
  pulse: `
    animation: pulse 2s ${animations.easing.gentle} infinite;
  `,
  float: `
    animation: float 6s ${animations.easing.gentle} infinite;
  `,
  drift: `
    animation: drift 20s ${animations.easing.gentle} infinite;
  `,
  scanLine: `
    animation: scanLine 1.5s ${animations.easing.smooth} infinite;
  `,
  shimmer: `
    animation: shimmer 2s ${animations.easing.smooth} infinite;
  `,
  scaleIn: `
    animation: scaleIn 300ms ${animations.easing.bounce} both;
  `,
  bounceIn: `
    animation: bounceIn 500ms ${animations.easing.bounce} both;
  `,
  ticker: `
    animation: ticker 30s linear infinite;
  `,
  gradientShift: `
    animation: gradientShift 8s ${animations.easing.gentle} infinite;
  `
} as const

// Staggered animation delays
export const staggerDelays = {
  item1: '0ms',
  item2: '100ms',
  item3: '200ms',
  item4: '300ms',
  item5: '400ms'
} as const