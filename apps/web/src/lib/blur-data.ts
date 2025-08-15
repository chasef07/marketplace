// Enhanced image blur placeholder data URLs for better loading experience
export const BLUR_DATA_URL = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAhEAACAQMDBQAAAAAAAAAAAAABAgMABAUGIWGRkqGx0f/EABUBAQEAAAAAAAAAAAAAAAAAAAMF/8QAGhEAAgIDAAAAAAAAAAAAAAAAAAECEgMRkf/aAAwDAQACEQMRAD8AltJagyeH0AthI5xdrLcNM91BF5pX2HaH9bcfaSXWGaRmknyxxkYHWvSY2uamiCEhcEVQlUfLBlCd1ZPG4mF9eLgz1NmFl7HYW6PYixAhxY/JpPY1NwBj32zGOHNJWTbPY2zdDwCfMnmYqUKQU/Q=='

// Optimized blur placeholders for different image types
export const BLUR_PLACEHOLDERS = {
  furniture: 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAAIAAoDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAb/xAAhEAACAQMDBQAAAAAAAAAAAAABAgMABAUGIWGRkqGx0f/EABUBAQEAAAAAAAAAAAAAAAAAAAMF/8QAGhEAAgIDAAAAAAAAAAAAAAAAAAECEgMRkf/aAAwDAQACEQMRAD8AltJagyeH0AthI5xdrLcNM91BF5pX2HaH9bcfaSXWGaRmknyxxkYHWvSY2uamiCEhcEVQlUfLBlCd1ZPG4mF9eLgz1NmFl7HYW6PYixAhxY/JpPY1NwBj32zGOHNJWTbPY2zdDwCfMnmYqUKQU/Q==',
  profile: 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAAIAAoDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAhEAACAQMDBQAAAAAAAAAAAAABAgMABAUGIWGRkqGx0f/EABUBAQEAAAAAAAAAAAAAAAAAAAMF/8QAGhEAAgIDAAAAAAAAAAAAAAAAAAECEgMRkf/aAAwDAQACEQMRAD8AltJagyeH0AthI5xdrLcNM91BF5pX2HaH9bcfaSXWGaRmknyxxkYHWvSY2uamiCEhcEVQlUfLBlCd1ZPG4mF9eLgz1NmFl7HYW6PYixAhxY/JpPY1NwBj32zGOHNJWTbPY2zdDwCfMnmYqUKQU/Q==',
  general: 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAhEAACAQMDBQAAAAAAAAAAAAABAgMABAUGIWGRkqGx0f/EABUBAQEAAAAAAAAAAAAAAAAAAAMF/8QAGhEAAgIDAAAAAAAAAAAAAAAAAAECEgMRkf/aAAwDAQACEQMRAD8AltJagyeH0AthI5xdrLcNM91BF5pX2HaH9bcfaSXWGaRmknyxxkYHWvSY2uamiCEhcEVQlUfLBlCd1ZPG4mF9eLgz1NmFl7HYW6PYixAhxY/JpPY1NwBj32zGOHNJWTbPY2zdDwCfMnmYqUKQU/Q=='
} as const

// Generate blur data URL with client-side canvas (for runtime generation)
export const generateBlurDataURL = (width = 10, height = 10, colors = ['#f3f4f6', '#e5e7eb']) => {
  if (typeof document === 'undefined') {
    // Server-side fallback
    return BLUR_PLACEHOLDERS.general
  }

  try {
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d')
    
    if (ctx) {
      // Create a subtle gradient pattern
      const gradient = ctx.createLinearGradient(0, 0, width, height)
      gradient.addColorStop(0, colors[0])
      gradient.addColorStop(1, colors[1])
      
      ctx.fillStyle = gradient
      ctx.fillRect(0, 0, width, height)
      
      return canvas.toDataURL('image/jpeg', 0.1) // Low quality for small size
    }
  } catch (error) {
    console.warn('Failed to generate blur placeholder:', error)
  }
  
  return BLUR_PLACEHOLDERS.general
}

// Generate furniture-specific blur placeholder
export const generateFurnitureBlur = () => {
  return generateBlurDataURL(10, 10, ['#f5f1eb', '#e8ddd4']) // Warm furniture tones
}

// Furniture-specific blur placeholders
export const FURNITURE_BLUR_DATA_URL = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAAIAAoDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAb/xAAhEAACAQMDBQAAAAAAAAAAAAABAgMABAUGIWGRkqGx0f/EABUBAQEAAAAAAAAAAAAAAAAAAAMF/8QAGhEAAgIDAAAAAAAAAAAAAAAAAAECEgMRkf/aAAwDAQACEQMRAD8AltJagyeH0AthI5xdrLcNM91BF5pX2HaH9bcfaSXWGaRmknyxxkYHWvSY2uamiCEhcEVQlUfLBlCd1ZPG4mF9eLgz1NmFl7HYW6PYixAhxY/JpPY1NwBj32zGOHNJWTbPY2zdDwCfMnmYqUKQU/Q=='