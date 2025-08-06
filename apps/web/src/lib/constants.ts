// AI Personalities from your Flask app
export const SELLER_PERSONALITIES = [
  { id: 'aggressive', name: 'Aggressive', emoji: '🔥', description: 'Holds firm on prices, emphasizes value' },
  { id: 'flexible', name: 'Flexible', emoji: '🤝', description: 'Willing to negotiate, balanced approach' },
  { id: 'quick_sale', name: 'Quick Sale', emoji: '⚡', description: 'Motivated to sell fast, flexible on price' },
  { id: 'premium', name: 'Premium', emoji: '💎', description: 'Focuses on quality and craftsmanship' },
] as const

export const BUYER_PERSONALITIES = [
  { id: 'bargain_hunter', name: 'Bargain Hunter', emoji: '💰', description: 'Aggressive about getting the best deals' },
  { id: 'fair', name: 'Fair', emoji: '⚖️', description: 'Balanced negotiator seeking win-win deals' },
  { id: 'quick', name: 'Quick', emoji: '🚀', description: 'Ready to buy fast at reasonable prices' },
  { id: 'premium', name: 'Premium', emoji: '👑', description: 'Values quality, willing to pay more' },
  { id: 'student', name: 'Student', emoji: '🎓', description: 'Budget-conscious but polite' },
] as const

export const FURNITURE_TYPES = [
  'Chair', 'Table', 'Sofa', 'Bed', 'Dresser', 'Bookshelf', 'Desk', 'Cabinet'
] as const