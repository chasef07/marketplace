/*
 * Simple Glass Overlay Chat Interface - Integration Example
 * 
 * This is the simplified version with just a click-to-expand icon
 * in the bottom right corner. No drag functionality or complex keyboard shortcuts.
 */

'use client'

import React from 'react'
import { SimpleGlassOverlayProvider } from './SimpleGlassOverlayProvider'

// Simple integration in your main layout
export function AppWithSimpleGlassOverlay({ children }: { children: React.ReactNode }) {
  return (
    <SimpleGlassOverlayProvider>
      {children}
      {/* Simple glass overlay will appear in bottom-right for authenticated users */}
    </SimpleGlassOverlayProvider>
  )
}

// Usage in app/layout.tsx:
/*
import { AppWithSimpleGlassOverlay } from '@/components/glass-overlay-chat/simple-integration'

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>
        <AppWithSimpleGlassOverlay>
          {children}
        </AppWithSimpleGlassOverlay>
      </body>
    </html>
  )
}
*/

export default AppWithSimpleGlassOverlay