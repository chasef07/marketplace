import { NextResponse } from 'next/server'

export async function GET() {
  // Pre-defined search suggestions for furniture marketplace
  const suggestions = [
    "Modern dining table",
    "Vintage leather couch", 
    "Wooden bookshelf",
    "Office desk chair",
    "Bedroom dresser",
    "Coffee table glass",
    "Antique cabinet",
    "Comfortable armchair",
    "Storage ottoman",
    "Bar stools set",
    "Nightstand with drawers",
    "Outdoor furniture",
    "Mid-century modern",
    "Scandinavian style",
    "Rustic farmhouse",
    "Industrial design"
  ]

  return NextResponse.json({
    suggestions: suggestions.slice(0, 8) // Return 8 random suggestions
  })
}