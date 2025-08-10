// SnapNest Design System - Color Palette
export const colors = {
  // Primary Palette - Trust & Warmth Combination
  primary: '#4A6FA5',        // Muted Blue - Trust, reliability, AI/tech
  secondary: '#E89A5C',      // Warm Terracotta - Community, warmth, home
  accent: '#7CB342',         // Fresh Green - Growth, sustainability, success
  
  // Neutral Colors
  neutralDark: '#2C3E50',    // Charcoal Blue
  neutralLight: '#FAF7F2',   // Warm Off-White
  background: '#F5F0E8',     // Soft Cream
  
  // Semantic Colors
  success: '#7CB342',        // Green - same as accent
  sold: '#9B9B9B',          // Gray - inactive states
  alert: '#F4B942',         // Golden Yellow - new/alert states
  
  // Extended palette for gradients and variations
  primaryLight: '#6B8BC4',
  primaryDark: '#3A5A89',
  secondaryLight: '#EFAB7A',
  secondaryDark: '#D8894A',
  accentLight: '#95D065',
  accentDark: '#659F32',
  
  // Background variations
  backgroundGradient: {
    from: '#F5F0E8',
    via: '#FAF7F2',
    to: '#E8DDD4'
  },
  
  // Glass morphism
  glass: {
    background: 'rgba(250, 247, 242, 0.9)',
    border: 'rgba(74, 111, 165, 0.1)',
    shadow: 'rgba(74, 111, 165, 0.1)'
  }
} as const

// CSS Custom Properties for runtime usage
export const cssVariables = `
  :root {
    --color-primary: ${colors.primary};
    --color-secondary: ${colors.secondary};
    --color-accent: ${colors.accent};
    --color-neutral-dark: ${colors.neutralDark};
    --color-neutral-light: ${colors.neutralLight};
    --color-background: ${colors.background};
    --color-success: ${colors.success};
    --color-sold: ${colors.sold};
    --color-alert: ${colors.alert};
    --color-primary-light: ${colors.primaryLight};
    --color-primary-dark: ${colors.primaryDark};
    --color-secondary-light: ${colors.secondaryLight};
    --color-secondary-dark: ${colors.secondaryDark};
    --color-accent-light: ${colors.accentLight};
    --color-accent-dark: ${colors.accentDark};
  }
`

// Gradient presets
export const gradients = {
  primary: `linear-gradient(135deg, ${colors.primary} 0%, ${colors.primaryLight} 100%)`,
  secondary: `linear-gradient(135deg, ${colors.secondary} 0%, ${colors.secondaryLight} 100%)`,
  accent: `linear-gradient(135deg, ${colors.accent} 0%, ${colors.accentLight} 100%)`,
  background: `linear-gradient(135deg, ${colors.backgroundGradient.from} 0%, ${colors.backgroundGradient.via} 50%, ${colors.backgroundGradient.to} 100%)`,
  mesh: `
    radial-gradient(circle at 25% 25%, ${colors.secondary}20 0%, transparent 50%),
    radial-gradient(circle at 75% 75%, ${colors.primary}15 0%, transparent 50%),
    radial-gradient(circle at 50% 10%, ${colors.accent}10 0%, transparent 40%)
  `
} as const

// Shadows
export const shadows = {
  sm: `0 2px 8px ${colors.glass.shadow}`,
  md: `0 4px 20px ${colors.glass.shadow}`,
  lg: `0 8px 32px ${colors.glass.shadow}`,
  xl: `0 12px 48px ${colors.glass.shadow}`,
  accent: `0 4px 20px ${colors.accent}30`,
  primary: `0 4px 20px ${colors.primary}30`
} as const