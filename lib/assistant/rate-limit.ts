const MINUTE_MS = 60_000;
const DAY_MS = 24 * 60 * MINUTE_MS;

export const RATE_LIMITS = [
  { windowMs: MINUTE_MS, max: 10 },
  { windowMs: DAY_MS, max: 100 },
] as const;

export type RateLimitResult = { ok: true } | { ok: false; retryAfterSeconds: number };

/**
 * Sliding-window limiter held in process memory. Good enough for the single-instance demo;
 * a multi-instance deploy needs a shared store (Redis or the database) instead.
 */
export function createRateLimiter(limits: readonly { windowMs: number; max: number }[] = RATE_LIMITS) {
  const longest = Math.max(...limits.map((limit) => limit.windowMs));
  const hits = new Map<string, number[]>();

  return function check(key: string, now = Date.now()): RateLimitResult {
    const recent = (hits.get(key) ?? []).filter((at) => now - at < longest);

    for (const { windowMs, max } of limits) {
      const inWindow = recent.filter((at) => now - at < windowMs);
      if (inWindow.length >= max) {
        hits.set(key, recent);
        return { ok: false, retryAfterSeconds: Math.ceil((inWindow[0] + windowMs - now) / 1000) };
      }
    }

    recent.push(now);
    hits.set(key, recent);
    return { ok: true };
  };
}
