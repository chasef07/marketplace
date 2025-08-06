// New Supabase-based API client
import { createClient } from './supabase'

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
  image_filename: string
}

export interface CreateListingData {
  name: string
  description: string
  furniture_type: string
  starting_price: number
  condition: string
  image_filename: string
  material?: string
  brand?: string
  color?: string
  dimensions?: string
}

export interface SearchQuery {
  query: string
  limit?: number
  offset?: number
}

export interface SearchResponse {
  success: boolean
  items: any[]
  total_count: number
  query_interpretation: string
}

export interface OfferAnalysisResponse {
  priority_offers: any[]
  fair_offers: any[]
  lowball_offers: any[]
  recommendations: string[]
  market_insights: {
    average_offer_percentage: number
    buyer_engagement_level: string
    pricing_strategy: string
  }
  analysis_metadata: {
    generated_at: string
    total_offers_analyzed: number
    total_buyers_analyzed: number
  }
  error?: string
}

export class SupabaseApiClient {
  private _supabase = createClient()

  // Expose supabase client for direct access when needed (e.g., password reset)
  get supabase() {
    return this._supabase
  }

  // Helper method to get authenticated headers
  private async getAuthHeaders(includeContentType: boolean = false): Promise<Record<string, string>> {
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

  async getMarketplaceItems() {
    const response = await fetch('/api/items')
    
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

  async getCurrentUser() {
    const headers = await this.getAuthHeaders()
    const response = await fetch('/api/auth/me', { headers })
    
    if (!response.ok) {
      if (response.status === 404) {
        // Profile not found, might be a timing issue with new user creation
        throw new Error('User profile not found')
      }
      return null // Not logged in
    }
    
    const data = await response.json()
    return data.user || data
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

  async aiSearch(searchQuery: SearchQuery): Promise<SearchResponse> {
    const response = await fetch('/api/ai/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(searchQuery)
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error || 'Search failed')
    }

    return response.json()
  }

  async getSearchSuggestions() {
    const response = await fetch('/api/ai/search/suggestions')

    if (!response.ok) {
      throw new Error('Failed to fetch search suggestions')
    }

    return response.json()
  }

  async getOfferAnalysis(itemId: number): Promise<OfferAnalysisResponse> {
    const response = await fetch(`/api/negotiations/items/${itemId}/offer-analysis`)
    
    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error || 'Failed to get offer analysis')
    }
    
    return response.json()
  }

  // For backward compatibility with components that expect this method
  async getNegotiationOffers(negotiationId: number) {
    // This method would need to be implemented if used
    // For now, we'll return the negotiation data from getMyNegotiations
    const negotiations = await this.getMyNegotiations()
    return negotiations.find((n: any) => n.id === negotiationId) || null
  }

  // Authentication methods using Supabase Auth directly
  async signUp(email: string, password: string, username: string) {
    const { data, error } = await this._supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          username: username
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
    const { error } = await this._supabase.auth.signOut()
    if (error) throw error
  }

  async getSession() {
    const { data: { session }, error } = await this._supabase.auth.getSession()
    if (error) throw error
    return session
  }

  onAuthStateChange(callback: (session: any) => void) {
    return this._supabase.auth.onAuthStateChange((_event, session) => {
      callback(session)
    })
  }
}

export const apiClient = new SupabaseApiClient()