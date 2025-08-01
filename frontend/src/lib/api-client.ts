// API client for connecting to FastAPI backend
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

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

export interface CreateAccountData {
  full_name: string
  email: string
  phone: string
  location: string
  username: string
  password: string
}

export interface CreateListingData {
  name: string
  description: string
  furniture_type: string
  starting_price: number
  min_price: number
  condition: string
  image_filename: string
}

export class ApiClient {
  private baseUrl: string
  private token: string | null = null
  
  constructor(baseUrl: string = API_URL) {
    this.baseUrl = baseUrl
    // Load token from localStorage if available
    if (typeof window !== 'undefined') {
      this.token = localStorage.getItem('auth_token')
    }
  }

  setToken(token: string) {
    this.token = token
    if (typeof window !== 'undefined') {
      localStorage.setItem('auth_token', token)
    }
  }

  clearToken() {
    this.token = null
    if (typeof window !== 'undefined') {
      localStorage.removeItem('auth_token')
    }
  }

  private getHeaders(): HeadersInit {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    }
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`
    }
    return headers
  }

  async get(endpoint: string) {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      headers: this.getHeaders()
    })
    if (!response.ok) {
      throw new Error(`API Error: ${response.statusText}`)
    }
    return response.json()
  }

  async post(endpoint: string, data: unknown) {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(data),
    })
    if (!response.ok) {
      throw new Error(`API Error: ${response.statusText}`)
    }
    return response.json()
  }

  async uploadAndAnalyzeImage(file: File): Promise<AIAnalysisResult> {
    const formData = new FormData()
    formData.append('image', file)

    const headers: HeadersInit = {}
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`
    }

    const response = await fetch(`${this.baseUrl}/api/items/analyze-image`, {
      method: 'POST',
      headers,
      body: formData
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error || 'Image analysis failed')
    }

    return response.json()
  }

  async createAccount(data: CreateAccountData) {
    const response = await fetch(`${this.baseUrl}/api/auth/register`, {
      method: 'POST',  
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        username: data.username,
        email: data.email,
        password: data.password,
        seller_personality: 'flexible', // Default personality
        buyer_personality: 'fair' // Default personality
      })
    })

    if (!response.ok) {
      let errorMessage = 'Account creation failed'
      try {
        const errorData = await response.json()
        // Handle different error response formats
        errorMessage = errorData.detail || errorData.error || errorData.message || 'Account creation failed'
      } catch (e) {
        // If JSON parsing fails, use status text
        errorMessage = `Account creation failed: ${response.status} ${response.statusText}`
      }
      throw new Error(errorMessage)
    }

    return response.json()
  }

  async loginUser(username: string, password: string) {
    const response = await fetch(`${this.baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        username,
        password
      })
    })

    if (!response.ok) {
      let errorMessage = 'Login failed'
      try {
        const errorData = await response.json()
        errorMessage = errorData.detail || errorData.error || errorData.message || 'Login failed'
      } catch (e) {
        errorMessage = `Login failed: ${response.status} ${response.statusText}`
      }
      throw new Error(errorMessage)
    }

    const data = await response.json()
    if (data.access_token) {
      this.setToken(data.access_token)
    }
    return data
  }

  async createListing(data: CreateListingData) {
    const response = await fetch(`${this.baseUrl}/api/items/`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({
        name: data.name,
        description: data.description,
        furniture_type: data.furniture_type,
        starting_price: data.starting_price,
        min_price: data.min_price,
        condition: data.condition,
        image_filename: data.image_filename
      })
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error || 'Listing creation failed')
    }

    return response.json()
  }

  async createAccountAndListing(accountData: CreateAccountData, listingData: CreateListingData) {
    try {
      // Step 1: Create account
      await this.createAccount(accountData)
      
      // Step 2: Login
      await this.loginUser(accountData.username, accountData.password)
      
      // Step 3: Create listing
      await this.createListing(listingData)
      
      return { success: true }
    } catch (error) {
      throw error
    }
  }

  async getMarketplaceItems() {
    const response = await fetch(`${this.baseUrl}/api/items/`, {
      headers: this.getHeaders()
    })
    
    if (!response.ok) {
      throw new Error('Failed to fetch marketplace items')
    }
    
    return response.json()
  }

  async getItem(itemId: number) {
    const response = await fetch(`${this.baseUrl}/api/items/${itemId}`, {
      headers: this.getHeaders()
    })
    
    if (!response.ok) {
      throw new Error('Failed to fetch item details')
    }
    
    return response.json()
  }

  async getCurrentUser() {
    const response = await fetch(`${this.baseUrl}/api/auth/me`, {
      headers: this.getHeaders()
    })
    
    if (!response.ok) {
      console.log('getCurrentUser failed:', response.status, response.statusText)
      return null // Not logged in
    }
    
    const data = await response.json()
    console.log('getCurrentUser response:', data)
    
    // Backend might return user directly or wrapped in { user: ... }
    return data.user || data
  }

  async logout() {
    const response = await fetch(`${this.baseUrl}/api/auth/logout`, {
      headers: this.getHeaders()
    })
    
    this.clearToken()
    return response.ok
  }

  async getMyItems() {
    const response = await this.get('/api/items/my-items')
    return response
  }

  async getMyNegotiations() {
    const response = await this.get('/api/negotiations/my-negotiations')
    return response
  }

  async acceptOffer(negotiationId: number) {
    const response = await this.post(`/api/negotiations/${negotiationId}/accept`, {})
    return response
  }

  async counterOffer(negotiationId: number, price: number, message: string = '') {
    const response = await this.post(`/api/negotiations/${negotiationId}/counter`, {
      price: price,
      message: message
    })
    return response
  }

  async getNegotiationOffers(negotiationId: number) {
    const response = await this.get(`/api/negotiations/${negotiationId}/offers`)
    return response
  }
}

export const apiClient = new ApiClient()