// New Supabase-based API client
import { createClient } from './supabase'
import type { Session } from '@supabase/supabase-js'

export interface ImageData {
  filename: string
  order: number
  is_primary: boolean
}

export interface AIAnalysisResult {
  success: boolean
  analysis: {
    furniture_type: string
    style: string
    condition_score: number
    condition_notes: string
    material: string
    brand: string
    color: string
    estimated_dimensions: string
    key_features: string[]
  }
  pricing: {
    suggested_starting_price: number
    suggested_min_price: number
    quick_sale_price: number
    market_price: number
    premium_price: number
    pricing_explanation: string
  }
  listing: {
    title: string
    description: string
    furniture_type: string
  }
  image_filename?: string // Backward compatibility
  images?: ImageData[] // New multiple images
}

export interface CreateListingData {
  name: string
  description: string
  furniture_type: string
  starting_price: number
  condition: string
  image_filename?: string // Backward compatibility
  images?: ImageData[] // New multiple images support
  style?: string
  material?: string
  brand?: string
  color?: string
  dimensions?: string
}

export interface Item {
  id: number
  seller_id: string
  name: string
  description: string
  furniture_type: string
  starting_price: number
  condition: string
  image_filename?: string // Backward compatibility
  images?: ImageData[] // New multiple images support
  is_available: boolean
  views_count: number
  style?: string
  dimensions?: string
  material?: string
  brand?: string
  color?: string
  created_at: string
  updated_at: string
  seller?: {
    id: string
    username: string
    email: string
    zip_code?: string
  }
}

export interface PaginationInfo {
  page: number
  limit: number
  total: number
  total_pages: number
  has_next: boolean
  has_prev: boolean
}

export interface PaginatedResponse<T> {
  items: T[]
  pagination: PaginationInfo
}

export interface Offer {
  id: number
  negotiation_id: number
  offer_type: 'buyer' | 'seller'
  price: number
  message?: string
  round_number: number
  is_counter_offer: boolean
  created_at: string
  buyer_id?: string
  seller_id?: string
}


export interface Negotiation {
  id: number
  item_id: number
  buyer_id: string
  seller_id: string
  status: 'active' | 'deal_pending' | 'completed' | 'cancelled'
  current_round: number
  max_rounds: number
  created_at: string
  updated_at: string
}

// Chat interfaces
export interface ChatMessage {
  id: number
  conversation_id: number
  role: 'user' | 'assistant' | 'system'
  content: string
  function_calls?: any
  function_results?: any
  metadata: Record<string, any>
  created_at: string
}

export interface Conversation {
  id: number
  seller_id: string
  title: string
  created_at: string
  updated_at: string
  last_message_at: string
}

export interface ChatResponse {
  message: string
  conversation_id: number
  function_executed?: string
  function_results?: any
}

export interface ChatHistoryResponse {
  messages: ChatMessage[]
  conversation_id: string | null
  conversation?: Conversation
}

export class SupabaseApiClient {
  private _supabase = createClient()

  // Expose supabase client for direct access when needed (e.g., password reset)
  get supabase() {
    return this._supabase
  }

  // Helper method to get authenticated headers
  async getAuthHeaders(includeContentType: boolean = false): Promise<Record<string, string>> {
    const { data: { session } } = await this._supabase.auth.getSession()
    
    const headers: Record<string, string> = {}
    
    if (includeContentType) {
      headers['Content-Type'] = 'application/json'
    }
    
    if (session?.access_token) {
      headers.Authorization = `Bearer ${session.access_token}`
    }
    
    return headers
  }

  async uploadAndAnalyzeImage(file: File): Promise<AIAnalysisResult> {
    const formData = new FormData()
    formData.append('image', file)

    const response = await fetch('/api/ai/analyze-image', {
      method: 'POST',
      body: formData
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error || 'Image analysis failed')
    }

    return response.json()
  }

  async uploadAndAnalyzeImages(files: File[]): Promise<AIAnalysisResult> {
    if (files.length === 0) {
      throw new Error('No images provided')
    }
    
    if (files.length > 3) {
      throw new Error('Maximum 3 images allowed')
    }

    const formData = new FormData()
    files.forEach((file, index) => {
      formData.append(`image${index}`, file)
    })

    const response = await fetch('/api/ai/analyze-images', {
      method: 'POST',
      body: formData
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error || 'Images analysis failed')
    }

    return response.json()
  }

  async createListing(data: CreateListingData) {
    const headers = await this.getAuthHeaders(true)

    const response = await fetch('/api/items', {
      method: 'POST',
      headers,
      body: JSON.stringify(data)
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error || 'Listing creation failed')
    }

    return response.json()
  }

  async getMarketplaceItems(page: number = 1, limit: number = 12): Promise<PaginatedResponse<Item>> {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString()
    })
    
    const response = await fetch(`/api/items?${params}`)
    
    if (!response.ok) {
      throw new Error('Failed to fetch marketplace items')
    }
    
    return response.json()
  }

  async getItem(itemId: number) {
    const response = await fetch(`/api/items/${itemId}`)
    
    if (!response.ok) {
      throw new Error('Failed to fetch item details')
    }
    
    return response.json()
  }

  async updateItem(itemId: number, updates: {
    description?: string;
    condition?: string;
    starting_price?: number;
    is_available?: boolean;
  }) {
    const headers = await this.getAuthHeaders(true)
    
    const response = await fetch(`/api/items/${itemId}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify(updates)
    })
    
    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error || 'Failed to update item')
    }
    
    return response.json()
  }

  async deleteItem(itemId: number) {
    const headers = await this.getAuthHeaders()
    
    const response = await fetch(`/api/items/${itemId}`, {
      method: 'DELETE',
      headers
    })
    
    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error || 'Failed to delete item')
    }
    
    return response.json()
  }

  private _lastUserFetch = 0
  private _getUserCache: any = null
  private _consecutiveAuthErrors = 0
  private _authCircuitBreakerUntil = 0
  private readonly MAX_AUTH_ERRORS = 3
  private readonly CIRCUIT_BREAKER_DURATION = 60000 // 1 minute
  
  async getCurrentUser() {
    const now = Date.now()
    
    // Circuit breaker - stop making requests if we've had too many errors
    if (now < this._authCircuitBreakerUntil) {
      return null
    }
    
    // Prevent rapid successive calls that could create infinite loops
    if (now - this._lastUserFetch < 2000) {
      return this._getUserCache
    }
    
    this._lastUserFetch = now
    
    try {
      const headers = await this.getAuthHeaders()
      const response = await fetch('/api/auth/me', { headers })
      
      if (!response.ok) {
        this._getUserCache = null
        this._consecutiveAuthErrors++
        
        // If we've had too many consecutive errors, activate circuit breaker
        if (this._consecutiveAuthErrors >= this.MAX_AUTH_ERRORS) {
          this._authCircuitBreakerUntil = now + this.CIRCUIT_BREAKER_DURATION
        }
        
        if (response.status === 404) {
          // Profile not found, might be a timing issue with new user creation
          throw new Error('User profile not found')
        }
        return null // Not logged in
      }
      
      // Reset error counter on successful response
      this._consecutiveAuthErrors = 0
      
      const data = await response.json()
      const userData = data.user || data
      this._getUserCache = userData
      return userData
    } catch (error) {
      this._getUserCache = null
      this._consecutiveAuthErrors++
      
      // Activate circuit breaker on network errors too
      if (this._consecutiveAuthErrors >= this.MAX_AUTH_ERRORS) {
        this._authCircuitBreakerUntil = now + this.CIRCUIT_BREAKER_DURATION
      }
      
      throw error
    }
  }

  async getMyItems() {
    const headers = await this.getAuthHeaders()
    const response = await fetch('/api/items/my-items', { headers })
    
    if (!response.ok) {
      throw new Error('Failed to fetch your items')
    }
    
    return response.json()
  }

  async getMyNegotiations() {
    const headers = await this.getAuthHeaders()
    const response = await fetch('/api/negotiations/my-negotiations', { headers })
    
    if (!response.ok) {
      throw new Error('Failed to fetch negotiations')
    }
    
    return response.json()
  }

  async acceptOffer(negotiationId: number) {
    const headers = await this.getAuthHeaders()
    const response = await fetch(`/api/negotiations/${negotiationId}/accept`, {
      method: 'POST',
      headers
    })
    
    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error || 'Failed to accept offer')
    }
    
    return response.json()
  }

  async counterOffer(negotiationId: number, price: number, message: string = '') {
    const headers = await this.getAuthHeaders(true)
    const response = await fetch(`/api/negotiations/${negotiationId}/counter`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        price: price,
        message: message
      })
    })
    
    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error || 'Failed to create counter offer')
    }
    
    return response.json()
  }

  async declineOffer(negotiationId: number, reason: string = 'Thanks for your interest, but I can\'t accept this offer.') {
    const headers = await this.getAuthHeaders(true)
    const response = await fetch(`/api/negotiations/${negotiationId}/decline`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        reason: reason
      })
    })
    
    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error || 'Failed to decline offer')
    }
    
    return response.json()
  }

  async createOffer(itemId: number, price: number, message: string = '') {
    const headers = await this.getAuthHeaders(true)
    const response = await fetch(`/api/negotiations/items/${itemId}/offers`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        price: price,
        message: message
      })
    })
    
    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error || 'Failed to create offer')
    }
    
    return response.json()
  }




  // Get offers for a specific negotiation
  async getNegotiationOffers(negotiationId: number) {
    const headers = await this.getAuthHeaders()
    const response = await fetch(`/api/negotiations/${negotiationId}/offers`, {
      method: 'GET',
      headers
    })

    if (!response.ok) {
      throw new Error(`Failed to fetch negotiation offers: ${response.statusText}`)
    }

    return response.json()
  }

  // Authentication methods using Supabase Auth directly
  async signUp(email: string, password: string, username: string, zipCode?: string) {
    const { data, error } = await this._supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          username: username,
          zip_code: zipCode
        }
      }
    })

    if (error) throw error
    return data
  }

  async signIn(email: string, password: string) {
    const { data, error } = await this._supabase.auth.signInWithPassword({
      email,
      password
    })

    if (error) throw error
    return data
  }

  async signOut() {
    // Clear internal cache and circuit breaker state
    this._getUserCache = null
    this._lastUserFetch = 0
    this._consecutiveAuthErrors = 0
    this._authCircuitBreakerUntil = 0
    
    // Sign out from Supabase with explicit scope
    const { error } = await this._supabase.auth.signOut({ scope: 'global' })
    if (error) {
      throw error
    }
    
    // Wait a moment for the signOut to complete and let the periodic check handle the state update
    await new Promise(resolve => setTimeout(resolve, 1000))
  }

  async getSession() {
    const { data: { session }, error } = await this._supabase.auth.getSession()
    if (error) throw error
    return session
  }

  onAuthStateChange(callback: (session: Session | null) => void) {
    return this._supabase.auth.onAuthStateChange((_event, session) => {
      callback(session)
    })
  }

  // Chat methods
  async sendChatMessage(message: string, conversationId?: number): Promise<ChatResponse> {
    const headers = await this.getAuthHeaders(true)
    
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        message,
        conversation_id: conversationId
      })
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error || 'Failed to send chat message')
    }

    return response.json()
  }

  async getChatHistory(conversationId?: number, limit?: number): Promise<ChatHistoryResponse> {
    const headers = await this.getAuthHeaders()
    const params = new URLSearchParams()
    if (conversationId) params.append('conversation_id', conversationId.toString())
    if (limit) params.append('limit', limit.toString())

    const response = await fetch(`/api/chat/history?${params.toString()}`, {
      headers
    })
    
    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error || 'Failed to fetch chat history')
    }
    
    return response.json()
  }
}

export const apiClient = new SupabaseApiClient()