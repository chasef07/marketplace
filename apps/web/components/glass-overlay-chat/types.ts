// Glass Overlay Chat Interface Types

export interface Position {
  x: number
  y: number
}

export interface GlassOverlayState {
  isVisible: boolean
  isExpanded: boolean
  isDragging: boolean
  position: Position
  autoHide: boolean
  notifications: number
}

export interface ChatUIMessage {
  id: string | number
  role: 'user' | 'assistant'
  content: string
  timestamp: string
  functionCalls?: any
  functionResults?: any
  metadata: Record<string, any>
}

export interface QuickActionItem {
  id: string
  label: string
  action: () => void
  icon?: React.ReactNode
  badge?: number
}

export interface OverlayPreferences {
  position: Position
  autoHide: boolean
  theme: 'light' | 'dark' | 'auto'
  notifications: boolean
}