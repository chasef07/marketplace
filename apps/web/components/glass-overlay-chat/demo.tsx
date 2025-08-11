'use client'

import React from 'react'
import { GlassOverlayProvider } from './GlassOverlayProvider'

interface GlassOverlayDemoProps {
  children: React.ReactNode
}

export function GlassOverlayDemo({ children }: GlassOverlayDemoProps) {
  return (
    <GlassOverlayProvider autoShow={false}>
      {children}
      {/* The glass overlay will automatically render when authenticated */}
    </GlassOverlayProvider>
  )
}

// Example usage component
export function ExampleUsage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">
          Glass Overlay Chat Interface Demo
        </h1>
        
        <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4">Features</h2>
          <ul className="space-y-2 text-gray-700">
            <li>• <strong>Glass Morphism Design</strong> - iOS-inspired translucent appearance</li>
            <li>• <strong>Drag & Drop</strong> - Reposition anywhere on screen with smooth physics</li>
            <li>• <strong>Minimized/Expanded States</strong> - 60px bubble or 400x600px chat panel</li>
            <li>• <strong>Keyboard Navigation</strong> - Full accessibility support with arrow keys</li>
            <li>• <strong>Real-time Chat</strong> - Integrated with existing /api/chat endpoints</li>
            <li>• <strong>Quick Actions</strong> - Contextual marketplace shortcuts</li>
            <li>• <strong>Offline Support</strong> - Message queuing when connection lost</li>
            <li>• <strong>Notifications</strong> - Visual badges for new activity</li>
          </ul>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4">Keyboard Shortcuts</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <h3 className="font-medium mb-2">Global</h3>
              <ul className="space-y-1 text-gray-600">
                <li><kbd className="bg-gray-100 px-2 py-1 rounded">Cmd/Ctrl + K</kbd> - Toggle chat</li>
                <li><kbd className="bg-gray-100 px-2 py-1 rounded">Escape</kbd> - Close chat</li>
              </ul>
            </div>
            <div>
              <h3 className="font-medium mb-2">When Focused</h3>
              <ul className="space-y-1 text-gray-600">
                <li><kbd className="bg-gray-100 px-2 py-1 rounded">Arrow Keys</kbd> - Move position</li>
                <li><kbd className="bg-gray-100 px-2 py-1 rounded">Shift + Arrows</kbd> - Move faster</li>
                <li><kbd className="bg-gray-100 px-2 py-1 rounded">Space/Enter</kbd> - Expand/minimize</li>
              </ul>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Integration</h2>
          <p className="text-gray-700 mb-4">
            The glass overlay automatically appears for authenticated users. It integrates seamlessly with your existing marketplace data and provides contextual AI assistance.
          </p>
          <div className="bg-gray-50 rounded p-4 text-sm font-mono">
            <pre>{`import { GlassOverlayProvider } from '@/components/glass-overlay-chat'

function App() {
  return (
    <GlassOverlayProvider>
      <YourAppContent />
    </GlassOverlayProvider>
  )
}`}</pre>
          </div>
        </div>
      </div>
    </div>
  )
}

export default GlassOverlayDemo