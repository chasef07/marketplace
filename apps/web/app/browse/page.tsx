'use client'

import { BrowsePage } from "@/components/browse/browse-page"

export default function Browse() {
  // Provide default implementations for required props
  const handleCreateListing = () => {
    console.log('Create listing clicked')
  }

  const handleLogout = () => {
    console.log('Logout clicked')
  }

  return (
    <BrowsePage 
      user={null} // Will be handled by auth state in the component
      onCreateListing={handleCreateListing}
      onLogout={handleLogout}
    />
  )
}