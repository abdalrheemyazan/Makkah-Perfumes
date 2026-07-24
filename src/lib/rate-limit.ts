import 'server-only';
import { headers } from 'next/headers';

/**
 * Fixed-window rate limiter.
 *
 * The in-memory driver is correct for a single Node process, which is what
 * `next start` runs. It is NOT correct behind multiple instances — set
 * RATE_LIMIT_DRIVER=redis and supply REDIS_URL before scaling out.
 * See docs/DEPLOYMENT.md.
 */

type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

// Bound the map so a flood of unique keys cannot grow it without limit.
const MAX_BUCKETS = 10_000;

export type RateLimitResult = {
  ok: boolean;
  remaining: number;
  retryAfterSeconds: number;
};

export function rateLimit(
  key: string,
  { limit, windowSeconds }: { limit: number; windowSeconds: number },
): RateLimitResult {
  const now = Date.now();
  const windowMs = windowSeconds * 1000;

  if (buckets.size > MAX_BUCKETS) {
    for (const [bucketKey, bucket] of buckets) {
      if (bucket.resetAt <= now) buckets.delete(bucketKey);
    }
  }

  const existing = buckets.get(key);
  if (!existing || existing.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, remaining: limit - 1, retryAfterSeconds: 0 };
  }

  existing.count += 1;
  if (existing.count > limit) {
    return {
      ok: false,
      remaining: 0,
      retryAfterSeconds: Math.ceil((existing.resetAt - now) / 1000),
    };
  }

  return { ok: true, remaining: limit - existing.count, retryAfterSeconds: 0 };
}

/**
 * Best-effort client IP. Behind a proxy this reads the forwarded header; the
 * proxy must be trusted for this to be meaningful.
 */
export async function clientIp(): Promise<string> {
  const store = await headers();
  const forwarded = store.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0]!.trim();
  return store.get('x-real-ip') ?? 'unknown';
}

/** Rate limits the current request by IP, returning a Hebrew error when tripped. */
export async function limitByIp(
  scope: string,
  options: { limit: number; windowSeconds: number },
): Promise<{ ok: true } | { ok: false; errorHe: string }> {
  const ip = await clientIp();
  const result = rateLimit(`${scope}:${ip}`, options);
  if (result.ok) return { ok: true };
  return {
    ok: false,
    errorHe: `יותר מדי בקשות. נסו שוב בעוד ${result.retryAfterSeconds} שניות.`,
  };
}
