import { describe, expect, it } from "vitest";
import { rateLimit } from "@/lib/rate-limit";

function makeRequest(ip) {
  return { headers: new Headers({ "x-forwarded-for": ip }) };
}

describe("rateLimit", () => {
  it("allows requests up to the limit", () => {
    const request = makeRequest("1.1.1.1");
    for (let i = 0; i < 5; i++) {
      expect(rateLimit(request, { windowMs: 60_000, max: 5 })).toBeNull();
    }
  });

  it("returns a retryAfter once the limit is exceeded", () => {
    const request = makeRequest("2.2.2.2");
    for (let i = 0; i < 5; i++) {
      rateLimit(request, { windowMs: 60_000, max: 5 });
    }
    const limited = rateLimit(request, { windowMs: 60_000, max: 5 });
    expect(limited).not.toBeNull();
    expect(limited.retryAfter).toBeGreaterThan(0);
    expect(limited.retryAfter).toBeLessThanOrEqual(60);
  });

  it("tracks different clients independently", () => {
    const a = makeRequest("3.3.3.3");
    const b = makeRequest("4.4.4.4");
    rateLimit(a, { windowMs: 60_000, max: 1 });
    expect(rateLimit(a, { windowMs: 60_000, max: 1 })).not.toBeNull();
    expect(rateLimit(b, { windowMs: 60_000, max: 1 })).toBeNull();
  });

  it("resets after the window elapses", () => {
    const request = makeRequest("5.5.5.5");
    rateLimit(request, { windowMs: -1, max: 1 });
    rateLimit(request, { windowMs: -1, max: 1 });
    expect(rateLimit(request, { windowMs: -1, max: 1 })).toBeNull();
  });
});