/**
 * Utility for rotating greetings based on user login count or session
 */

const GREETINGS = [
  'Namaste',
  'Howdy',
  'Cheers',
  'Welcome',
  'G\'day',
  'Aloha'
] as const

/**
 * Get a rotating greeting that changes with each new login/session
 * Uses a combination of user ID and current date to rotate greetings
 */
export function getRotatingGreeting(userId: string): string {
  // Use current date to ensure greeting changes daily, plus user ID for variation
  const today = new Date().toDateString()
  const seedString = userId + today
  
  // Create a hash from the combined string
  const hash = seedString.split('').reduce((acc, char) => {
    return acc + char.charCodeAt(0)
  }, 0)
  
  const index = hash % GREETINGS.length
  return GREETINGS[index]
}

/**
 * Get a random greeting (alternative approach)
 */
export function getRandomGreeting(): string {
  const index = Math.floor(Math.random() * GREETINGS.length)
  return GREETINGS[index]
}