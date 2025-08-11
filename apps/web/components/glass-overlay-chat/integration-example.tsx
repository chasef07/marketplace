/*
 * Glass Overlay Chat Interface - Integration Example
 * 
 * This file shows how to integrate the glass overlay chat interface
 * into your existing Next.js application.
 */

'use client'

import React from 'react'
import { GlassOverlayProvider } from './GlassOverlayProvider'

// Example: Add to your main layout component
export function AppWithGlassOverlay({ children }: { children: React.ReactNode }) {
  return (
    <GlassOverlayProvider>
      {children}
      {/* The glass overlay will automatically appear for authenticated users */}
    </GlassOverlayProvider>
  )
}

// Example: Integration in app/layout.tsx
/*
import { AppWithGlassOverlay } from '@/components/glass-overlay-chat/integration-example'

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>
        <AppWithGlassOverlay>
          {children}
        </AppWithGlassOverlay>
      </body>
    </html>
  )
}
*/

// Example: Programmatic control from anywhere in your app
export function ExampleMarketplaceComponent() {
  const handleNewOffer = () => {
    // You can trigger notifications or show the overlay from anywhere
    // The context provider handles all the state management
    console.log('New offer received - glass overlay will show notification')
  }

  return (
    <div className="marketplace-content">
      {/* Your existing marketplace components */}
      <button 
        onClick={handleNewOffer}
        className="px-4 py-2 bg-blue-500 text-white rounded"
      >
        Simulate New Offer
      </button>
    </div>
  )
}

// Example: Custom hook usage
/*
import { useGlassOverlayContext } from '@/components/glass-overlay-chat'

function CustomComponent() {
  const { showOverlay, addNotification } = useGlassOverlayContext()
  
  const handleImportantEvent = () => {
    addNotification()
    showOverlay()
  }
  
  return <button onClick={handleImportantEvent}>Show Chat</button>
}
*/