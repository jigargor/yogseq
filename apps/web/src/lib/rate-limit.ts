/**
 * Best-effort in-memory token bucket rate limiter.
 *
 * State lives in module scope, so it is per server instance / Cloudflare
 * Worker isolate: it slows down casual abuse but is NOT a hard guarantee.
 * Put a Cloudflare Rate Limiting rule in front of the app for real enforcement.
 */

export interface RateLimitConfig {
  /** Maximum burst size (bucket capacity). */
  capacity: number;
  /** Tokens added back per second. */
  refillPerSecond: number;
}

export interface RateLimitResult {
  ok: boolean;
  remaining: number;
  /** Seconds until at least one token is available (0 when ok). */
  retryAfterSeconds: number;
}

interface Bucket {
  tokens: number;
  updatedAt: number;
}

export const RATE_LIMITS = {
  /** Saving sequences / studio poses. */
  save: { capacity: 30, refillPerSecond: 0.5 },
  /** Publishing share links and forking shared sequences. */
  share: { capacity: 10, refillPerSecond: 0.1 },
} as const satisfies Record<string, RateLimitConfig>;

export type RateLimitName = keyof typeof RATE_LIMITS;

const MAX_BUCKETS = 5_000;
const buckets = new Map<string, Bucket>();

export function consumeToken(
  key: string,
  config: RateLimitConfig,
  now: number = Date.now(),
): RateLimitResult {
  const existing = buckets.get(key);
  const elapsedSeconds = existing ? Math.max(0, (now - existing.updatedAt) / 1000) : 0;
  const tokens = Math.min(
    config.capacity,
    (existing?.tokens ?? config.capacity) + elapsedSeconds * config.refillPerSecond,
  );

  if (tokens < 1) {
    buckets.set(key, { tokens, updatedAt: now });
    return {
      ok: false,
      remaining: 0,
      retryAfterSeconds: Math.ceil((1 - tokens) / config.refillPerSecond),
    };
  }

  if (buckets.size >= MAX_BUCKETS) pruneBuckets(now);
  buckets.set(key, { tokens: tokens - 1, updatedAt: now });
  return { ok: true, remaining: Math.floor(tokens - 1), retryAfterSeconds: 0 };
}

function pruneBuckets(now: number): void {
  for (const [key, bucket] of buckets) {
    // Anything idle for 10 minutes has fully refilled for every preset.
    if (now - bucket.updatedAt > 10 * 60 * 1000) buckets.delete(key);
  }
  if (buckets.size >= MAX_BUCKETS) buckets.clear();
}

export function getClientIp(headers: Headers): string {
  return (
    headers.get("cf-connecting-ip") ??
    headers.get("x-real-ip") ??
    headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    "unknown"
  );
}

/** Convenience: consume a token from a named preset, keyed by client IP. */
export function rateLimitByIp(name: RateLimitName, headers: Headers): RateLimitResult {
  return consumeToken(`${name}:${getClientIp(headers)}`, RATE_LIMITS[name]);
}
