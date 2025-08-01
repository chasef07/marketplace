// API client for connecting to Flask backend
const FLASK_API_URL = process.env.NEXT_PUBLIC_FLASK_API_URL || 'http://localhost:8000'

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
  
  constructor(baseUrl: string = FLASK_API_URL) {
    this.baseUrl = baseUrl
  }

  async get(endpoint: string) {
    const response = await fetch(`${this.baseUrl}${endpoint}`)
    if (!response.ok) {
      throw new Error(`API Error: ${response.statusText}`)
    }
    return response.json()
  }

  async post(endpoint: string, data: unknown) {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
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

    const response = await fetch(`${this.baseUrl}/api/analyze-image`, {
      method: 'POST',
      body: formData,
      credentials: 'include'
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error || 'Image analysis failed')
    }

    return response.json()
  }

  async createAccount(data: CreateAccountData) {
    const response = await fetch(`${this.baseUrl}/auth/register`, {
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
      }),
      credentials: 'include'
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error || 'Account creation failed')
    }

    return response.json()
  }

  async loginUser(username: string, password: string) {
    const response = await fetch(`${this.baseUrl}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        username,
        password
      }),
      credentials: 'include' // Important for session cookies
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error || 'Login failed')
    }

    return response.json()
  }

  async createListing(data: CreateListingData) {
    const response = await fetch(`${this.baseUrl}/api/create-listing`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: data.name,
        description: data.description,
        furniture_type: data.furniture_type,
        starting_price: data.starting_price,
        min_price: data.min_price,
        condition: data.condition,
        image_filename: data.image_filename
      }),
      credentials: 'include' // Important for session cookies
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
    const response = await fetch(`${this.baseUrl}/api/items`, {
      credentials: 'include'
    })
    
    if (!response.ok) {
      throw new Error('Failed to fetch marketplace items')
    }
    
    return response.json()
  }

  async getCurrentUser() {
    // Since the old auth system doesn't have a direct "get current user" endpoint,
    // we'll need to modify this to work with the existing system
    // For now, we'll check if we can access a protected endpoint
    const response = await fetch(`${this.baseUrl}/create-listing`, {
      method: 'GET',
      credentials: 'include'
    })
    
    if (!response.ok) {
      return null // Not logged in
    }
    
    // This is a workaround - we can't get full user info easily from old system
    // Return a basic user object for now
    return {
      id: 1, // placeholder
      username: 'user',
      email: 'user@example.com',
      full_name: 'User'
    }
  }

  async logout() {
    const response = await fetch(`${this.baseUrl}/auth/logout`, {
      credentials: 'include'
    })
    
    return response.ok
  }
}

export const apiClient = new ApiClient()