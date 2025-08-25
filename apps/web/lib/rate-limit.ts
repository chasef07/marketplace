import { NextRequest, NextResponse } from 'next/server'

// Mock rate limiting for development
export const ratelimit = {
  api: {
    async limit(identifier: string) {
      // Mock rate limit - always allow in development
      return {
        success: true,
        pending: Promise.resolve(),
        limit: 100,
        remaining: 99,
        reset: Date.now() + 60000
      }
    }
  },
  
  auth: {
    async limit(identifier: string) {
      return {
        success: true,
        pending: Promise.resolve(),
        limit: 10,
        remaining: 9,
        reset: Date.now() + 60000
      }
    }
  },

  upload: {
    async limit(identifier: string) {
      return {
        success: true,
        pending: Promise.resolve(),
        limit: 20,
        remaining: 19,
        reset: Date.now() + 60000
      }
    }
  }
}

export async function withRateLimit<T>(
  request: NextRequest,
  limiter: typeof ratelimit.api,
  handler: () => Promise<T>
): Promise<T | NextResponse> {
  try {
    // Get identifier from IP or user agent
    const identifier = request.ip ?? request.headers.get('user-agent') ?? 'anonymous'
    
    // Check rate limit
    const result = await limiter.limit(identifier)
    
    if (!result.success) {
      return NextResponse.json(
        { error: 'Rate limit exceeded' },
        { 
          status: 429,
          headers: {
            'X-RateLimit-Limit': result.limit.toString(),
            'X-RateLimit-Remaining': result.remaining.toString(),
            'X-RateLimit-Reset': result.reset.toString()
          }
        }
      )
    }
    
    // Execute the handler
    return await handler()
  } catch (error) {
    console.error('Rate limit error:', error)
    // If rate limiting fails, allow the request to proceed
    return await handler()
  }
}

export default ratelimit