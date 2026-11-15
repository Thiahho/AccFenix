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
});
