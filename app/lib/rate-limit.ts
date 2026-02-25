/**
 * Distributed rate limiter using Upstash Redis.
 * Works correctly across Vercel serverless function instances
 * since state is stored in Redis rather than in-process memory.
 *
 * Required environment variables:
 *   UPSTASH_REDIS_REST_URL  – Upstash Redis REST endpoint
 *   UPSTASH_REDIS_REST_TOKEN – Upstash Redis REST token
 */

import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

// Lazy-init Redis so the module can be imported at build time
// without requiring env vars to be present.
let _redis: Redis | undefined;
function getRedis(): Redis {
  if (!_redis) {
    _redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL!,
      token: process.env.UPSTASH_REDIS_REST_TOKEN!,
    });
  }
  return _redis;
}

// ── Rate limiters ──────────────────────────────────────────────

let _authRateLimiter: Ratelimit | undefined;
/** 10 requests per 15 minutes for authentication endpoints */
function getAuthRateLimiter(): Ratelimit {
  if (!_authRateLimiter) {
    _authRateLimiter = new Ratelimit({
      redis: getRedis(),
      limiter: Ratelimit.slidingWindow(10, '15 m'),
      prefix: 'rl:auth',
      analytics: true,
    });
  }
  return _authRateLimiter;
}

let _apiRateLimiter: Ratelimit | undefined;
/** 60 requests per minute for API endpoints */
function getApiRateLimiter(): Ratelimit {
  if (!_apiRateLimiter) {
    _apiRateLimiter = new Ratelimit({
      redis: getRedis(),
      limiter: Ratelimit.slidingWindow(60, '1 m'),
      prefix: 'rl:api',
      analytics: true,
    });
  }
  return _apiRateLimiter;
}

let _globalRateLimiter: Ratelimit | undefined;
/** 100 requests per minute – global per IP */
function getGlobalRateLimiter(): Ratelimit {
  if (!_globalRateLimiter) {
    _globalRateLimiter = new Ratelimit({
      redis: getRedis(),
      limiter: Ratelimit.slidingWindow(100, '1 m'),
      prefix: 'rl:global',
      analytics: true,
    });
  }
  return _globalRateLimiter;
}

// ── Exported limiter objects ───────────────────────────────────
// Getter-based so the underlying Ratelimit is created on first
// access, not at module load time.
export const authRateLimiter = { get instance() { return getAuthRateLimiter(); } };
export const apiRateLimiter = { get instance() { return getApiRateLimiter(); } };
export const globalRateLimiter = { get instance() { return getGlobalRateLimiter(); } };

// ── Helpers ────────────────────────────────────────────────────

/**
 * Get client IP from a Request (works on Vercel + other platforms)
 */
export function getClientIP(req: Request): string {
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }

  const realIp = req.headers.get('x-real-ip');
  if (realIp) {
    return realIp;
  }

  return 'unknown';
}

/**
 * Rate limit helper for middleware.
 * Returns an object indicating whether the request is allowed and
 * standard rate-limit response headers.
 */
export async function rateLimit(
  req: Request,
  limiter: { instance: Ratelimit },
  key?: string
): Promise<{ allowed: boolean; headers?: Record<string, string> }> {
  const clientKey = key || getClientIP(req);

  const { success, limit, remaining, reset } = await limiter.instance.limit(clientKey);

  const headers = {
    'X-RateLimit-Limit': limit.toString(),
    'X-RateLimit-Remaining': remaining.toString(),
    'X-RateLimit-Reset': Math.ceil(reset / 1000).toString(),
  };

  return { allowed: success, headers };
}