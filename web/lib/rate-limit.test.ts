import { describe, expect, it } from "vitest";
import { createRateLimiter } from "./rate-limit";

function setup(limit = 3, windowMs = 60_000, maxKeys?: number) {
  let time = 1_000_000;
  const limiter = createRateLimiter({ limit, windowMs, maxKeys, now: () => time });
  return { limiter, advance: (ms: number) => (time += ms) };
}

describe("createRateLimiter", () => {
  it("allows up to the limit and then rejects with Retry-After seconds", () => {
    const { limiter, advance } = setup();
    expect(limiter.check("a")).toEqual({ ok: true });
    expect(limiter.check("a")).toEqual({ ok: true });
    expect(limiter.check("a")).toEqual({ ok: true });
    advance(15_500);
    expect(limiter.check("a")).toEqual({ ok: false, retryAfterSeconds: 45 });
  });

  it("counts every key separately", () => {
    const { limiter } = setup(1);
    expect(limiter.check("a").ok).toBe(true);
    expect(limiter.check("b").ok).toBe(true);
    expect(limiter.check("a").ok).toBe(false);
  });

  it("starts a new window once the previous one expires", () => {
    const { limiter, advance } = setup(1);
    limiter.check("a");
    expect(limiter.check("a").ok).toBe(false);
    advance(60_000);
    expect(limiter.check("a").ok).toBe(true);
  });

  it("never reports less than one second to wait", () => {
    const { limiter, advance } = setup(1);
    limiter.check("a");
    advance(59_999);
    expect(limiter.check("a")).toEqual({ ok: false, retryAfterSeconds: 1 });
  });

  it("prunes expired keys and caps the number of tracked keys", () => {
    const { limiter, advance } = setup(1, 60_000, 3);
    limiter.check("a");
    limiter.check("b");
    limiter.check("c");
    limiter.check("d");
    expect(limiter.size()).toBeLessThanOrEqual(3);
    advance(60_000);
    limiter.check("e");
    expect(limiter.size()).toBe(1);
  });

  it("evicts the oldest 10% of keys in one batch when full", () => {
    const { limiter } = setup(1, 60_000, 20);
    for (let i = 0; i < 20; i++) limiter.check(`k${i}`);
    expect(limiter.size()).toBe(20);
    // A new key at the cap evicts k0 and k1 (10% of 20) at once, leaving room for the next one without evicting again.
    limiter.check("new1");
    expect(limiter.size()).toBe(19);
    limiter.check("new2");
    expect(limiter.size()).toBe(20);
    // Evicted keys start over; surviving ones are still limited.
    expect(limiter.check("k0").ok).toBe(true);
    expect(limiter.check("k5").ok).toBe(false);
  });

  it("does not evict when the incoming key is already tracked", () => {
    const { limiter } = setup(5, 60_000, 3);
    limiter.check("a");
    limiter.check("b");
    limiter.check("c");
    limiter.check("a");
    expect(limiter.size()).toBe(3);
    expect(limiter.check("b").ok).toBe(true);
  });
});
