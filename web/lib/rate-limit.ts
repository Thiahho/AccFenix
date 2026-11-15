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
  /**
   * Upper bound of tracked keys. Expired entries are pruned at most once per window; when a new key arrives and the
   * Map is still full, the oldest 10% of keys are evicted in one batch so inserts stay amortized O(1).
   */
  maxKeys?: number;
  /** Injectable clock for tests. */
  now?: () => number;
};

type Entry = { count: number; resetAt: number };

export function createRateLimiter({ limit, windowMs, maxKeys = 10_000, now = Date.now }: RateLimiterOptions) {
  const entries = new Map<string, Entry>();
  const evictBatch = Math.max(1, Math.ceil(maxKeys / 10));
  let nextPruneAt = 0;

  /** Drops expired entries; scheduled at most once per window so a full Map does not cost O(n) per request. */
  function pruneExpired(time: number) {
    for (const [key, entry] of entries) if (entry.resetAt <= time) entries.delete(key);
    nextPruneAt = time + windowMs;
  }

  /** Drops the oldest insertions in one batch (Map keeps insertion order, and a window reset re-inserts the key). */
  function evictOldest() {
    let remaining = evictBatch;
    for (const key of entries.keys()) {
      if (remaining-- <= 0) break;
      entries.delete(key);
    }
  }

  function check(key: string): RateLimitResult {
    const time = now();
    if (time >= nextPruneAt) pruneExpired(time);

    const entry = entries.get(key);
    if (!entry || entry.resetAt <= time) {
      entries.delete(key);
      if (entries.size >= maxKeys) evictOldest();
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
