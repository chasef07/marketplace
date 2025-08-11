// Glass Overlay Chat Interface - Main exports

// Simple version (recommended for initial implementation)
export { SimpleGlassOverlay } from './SimpleGlassOverlay'
export { SimpleGlassOverlayProvider, useSimpleGlassOverlayContext } from './SimpleGlassOverlayProvider'
export { SimpleChatInterface } from './SimpleChatInterface'

// Full-featured version (with drag & keyboard navigation)
export { GlassOverlay } from './GlassOverlay'
export { ChatInterface } from './ChatInterface'
export { GlassOverlayProvider, useGlassOverlayContext } from './GlassOverlayProvider'

// Shared components
export { MessageBubble } from './MessageBubble'
export { StatusIndicator } from './StatusIndicator' 
export { QuickActions } from './QuickActions'

// Hooks
export { useMarketplaceChat } from './hooks/useMarketplaceChat'
export { useGlassOverlay } from './hooks/useGlassOverlay'
export { useSimpleOverlay } from './hooks/useSimpleOverlay'

// Integration examples
export { AppWithSimpleGlassOverlay } from './simple-integration'

// Types
export type {
  Position,
  GlassOverlayState,
  ChatUIMessage,
  QuickActionItem,
  OverlayPreferences
} from './types'

// Default export (simple version)
export { default } from './SimpleGlassOverlay'