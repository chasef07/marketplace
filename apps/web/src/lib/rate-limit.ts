import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

// Check if Redis environment variables are available
const hasRedisConfig = process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN;

// Create Redis instance only if config is available
const redis = hasRedisConfig ? Redis.fromEnv() : null;

// Create different rate limiters for different endpoints
export const ratelimit = {
  // General API endpoints - 30 requests per minute
  api: redis ? new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(30, "1 m"),
    analytics: true,
    prefix: "@upstash/ratelimit/api",
  }) : null,
  
  // Search endpoints - 20 requests per minute (more expensive operations)
  search: redis ? new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(20, "1 m"),
    analytics: true,
    prefix: "@upstash/ratelimit/search",
  }) : null,
  
  // Image analysis - 5 requests per minute (very expensive AI operations)
  imageAnalysis: redis ? new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(5, "1 m"),
    analytics: true,
    prefix: "@upstash/ratelimit/image",
  }) : null,
  
  // Chat API - 10 requests per minute (AI operations)
  chat: redis ? new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(10, "1 m"),
    analytics: true,
    prefix: "@upstash/ratelimit/chat",
  }) : null,
  
  // Authentication endpoints - 5 requests per minute (prevent brute force)
  auth: redis ? new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(5, "1 m"),
    analytics: true,
    prefix: "@upstash/ratelimit/auth",
  }) : null,
};

// Helper function to get client IP
export function getClientIP(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  const realIP = request.headers.get("x-real-ip");
  
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  
  if (realIP) {
    return realIP;
  }
  
  return "unknown";
}

// Middleware wrapper for rate limiting
export async function withRateLimit(
  request: Request,
  limiter: unknown,
  handler: () => Promise<Response>
): Promise<Response> {
  // If no Redis config available, skip rate limiting in development
  if (!limiter || !hasRedisConfig) {
    console.warn('Rate limiting disabled: Redis not configured');
    return handler();
  }

  try {
    const ip = getClientIP(request);
    const result = await (limiter as any).limit(ip);
    const { success, limit, reset, remaining } = result;

    if (!success) {
      return new Response(
        JSON.stringify({ 
          error: "Too many requests", 
          limit, 
          reset: new Date(reset).toISOString() 
        }),
        { 
          status: 429,
          headers: {
            "Content-Type": "application/json",
            "X-RateLimit-Limit": limit.toString(),
            "X-RateLimit-Remaining": remaining.toString(),
            "X-RateLimit-Reset": new Date(reset).toISOString(),
          }
        }
      );
    }

    const response = await handler();
    
    // Add rate limit headers to successful responses
    response.headers.set("X-RateLimit-Limit", limit.toString());
    response.headers.set("X-RateLimit-Remaining", remaining.toString());
    response.headers.set("X-RateLimit-Reset", new Date(reset).toISOString());
    
    return response;
  } catch (error) {
    console.error('Rate limiting error:', error);
    // Fall back to handling without rate limiting if Redis fails
    return handler();
  }
}