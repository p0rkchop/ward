/**
 * Simple in-memory rate limiter using sliding window algorithm.
 * Suitable for single-instance deployments.
 *
 * WARNING: On Vercel serverless, each function invocation may get its own
 * isolated memory space, making this rate limiter ineffective across
 * requests. For production-grade rate limiting, replace this with a
 * distributed store such as Upstash Redis (@upstash/ratelimit).
 */

interface RateLimitConfig {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Maximum requests per window
}

interface RateLimitStore {
  [key: string]: {
    timestamps: number[];
    count: number;
  };
}

class RateLimiter {
  private store: RateLimitStore = {};
  public readonly config: RateLimitConfig;
  private cleanupInterval: NodeJS.Timeout;

  constructor(config: RateLimitConfig) {
    this.config = config;
    // Clean up old entries every minute
    this.cleanupInterval = setInterval(() => this.cleanup(), 60000);
  }

  /**
   * Check if request is allowed
   * @param key - Identifier for rate limiting (IP, user ID, etc.)
   * @returns { allowed: boolean, remaining: number, resetTime: number }
   */
  check(key: string): { allowed: boolean; remaining: number; resetTime: number } {
    const now = Date.now();
    const windowStart = now - this.config.windowMs;

    // Get or create entry
    if (!this.store[key]) {
      this.store[key] = { timestamps: [], count: 0 };
    }

    const entry = this.store[key];

    // Remove timestamps outside the current window
    const validTimestamps = entry.timestamps.filter(ts => ts > windowStart);
    entry.timestamps = validTimestamps;
    entry.count = validTimestamps.length;

    // Check if under limit
    if (entry.count < this.config.maxRequests) {
      // Add current timestamp
      entry.timestamps.push(now);
      entry.count++;

      return {
        allowed: true,
        remaining: this.config.maxRequests - entry.count,
        resetTime: windowStart + this.config.windowMs,
      };
    } else {
      // Calculate oldest timestamp to know when window resets
      const oldestTimestamp = Math.min(...entry.timestamps);
      return {
        allowed: false,
        remaining: 0,
        resetTime: oldestTimestamp + this.config.windowMs,
      };
    }
  }

  /**
   * Clean up old entries to prevent memory leak
   */
  private cleanup(): void {
    const now = Date.now();
    const windowStart = now - this.config.windowMs;

    Object.keys(this.store).forEach(key => {
      const entry = this.store[key];
      const validTimestamps = entry.timestamps.filter(ts => ts > windowStart);

      if (validTimestamps.length === 0) {
        delete this.store[key];
      } else {
        entry.timestamps = validTimestamps;
        entry.count = validTimestamps.length;
      }
    });
  }

  /**
   * Destroy the rate limiter instance
   */
  destroy(): void {
    clearInterval(this.cleanupInterval);
    this.store = {};
  }
}

// Default rate limiters for different endpoints
export const authRateLimiter = new RateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 10, // 10 attempts per 15 minutes for auth
});

export const apiRateLimiter = new RateLimiter({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 60, // 60 requests per minute for API
});

export const globalRateLimiter = new RateLimiter({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 100, // 100 requests per minute globally per IP
});

/**
 * Get client IP from Next.js request
 */
export function getClientIP(req: Request): string {
  // Try to get IP from headers (X-Forwarded-For, X-Real-IP, etc.)
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }

  const realIp = req.headers.get('x-real-ip');
  if (realIp) {
    return realIp;
  }

  // Fallback to a default (should not happen in production)
  return 'unknown';
}

/**
 * Rate limit helper for middleware
 */
export async function rateLimit(
  req: Request,
  limiter: RateLimiter,
  key?: string
): Promise<{ allowed: boolean; headers?: Record<string, string> }> {
  const clientKey = key || getClientIP(req);
  const result = limiter.check(clientKey);

  const headers = {
    'X-RateLimit-Limit': limiter.config.maxRequests.toString(),
    'X-RateLimit-Remaining': result.remaining.toString(),
    'X-RateLimit-Reset': Math.ceil(result.resetTime / 1000).toString(), // Unix timestamp
  };

  if (!result.allowed) {
    return {
      allowed: false,
      headers,
    };
  }

  return {
    allowed: true,
    headers,
  };
}