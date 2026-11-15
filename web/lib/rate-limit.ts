/**
 * Fixed-window, per-key rate limiter kept in memory.
 *
 * Best effort only: on serverless hosting every instance has its own Map, so the effective limit is
 * `limit × instances` and a cold start resets it. It exists to stop a single client from hammering the
 * third-party geocoders behind `/api/geo/*`, not as a hard quota.
 */
export type RateLimitResult = { ok: true } | { ok: false; retryAfterSeconds: number };

export type RateLimiterOptions = {
  /** Requests allowed per window and key. */
  limit: number;
  windowMs: number;
  /** Upper bound of tracked keys; when reached, expired entries are pruned and, if still full, the oldest go. */
  maxKeys?: number;
  /** Injectable clock for tests. */
  now?: () => number;
};

type Entry = { count: number; resetAt: number };

export function createRateLimiter({ limit, windowMs, maxKeys = 10_000, now = Date.now }: RateLimiterOptions) {
  const entries = new Map<string, Entry>();
  let nextPruneAt = 0;

  function prune(time: number) {
    for (const [key, entry] of entries) if (entry.resetAt <= time) entries.delete(key);
    // Still full after pruning: drop the oldest insertions (Map keeps insertion order).
    for (const key of entries.keys()) {
      if (entries.size < maxKeys) break;
      entries.delete(key);
    }
    nextPruneAt = time + windowMs;
  }

  function check(key: string): RateLimitResult {
    const time = now();
    if (time >= nextPruneAt || entries.size >= maxKeys) prune(time);

    const entry = entries.get(key);
    if (!entry || entry.resetAt <= time) {
      entries.delete(key);
      entries.set(key, { count: 1, resetAt: time + windowMs });
      return { ok: true };
    }
    if (entry.count < limit) {
      entry.count++;
      return { ok: true };
    }
    return { ok: false, retryAfterSeconds: Math.max(1, Math.ceil((entry.resetAt - time) / 1000)) };
  }

  return { check, size: () => entries.size };
}
