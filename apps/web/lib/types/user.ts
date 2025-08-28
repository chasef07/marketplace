// Shared User interface to avoid duplication across components
export interface User {
  id: string;
  username: string;
  email: string;
  seller_personality: string;
  buyer_personality: string;
  is_active: boolean;
  created_at: string;
  last_login?: string;
}

// Minimal User interface for components that don't need full user data
export interface MinimalUser {
  id: string;
  username: string;
  email: string;
  seller_personality?: string;
}