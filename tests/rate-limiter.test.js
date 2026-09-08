import test from "node:test";
import assert from "node:assert/strict";
import {
  checkRateLimit,
  getClientIp,
} from "../src/infrastructure/security/rate-limiter.js";

test("getClientIp extracts IP correctly from headers", () => {
  const req1 = {
    headers: new Map([["cf-connecting-ip", "203.0.113.195"]]),
  };
  req1.headers.get = (name) => req1.headers.get(name.toLowerCase());
  // Mock standard Request headers object
  const mockHeaders = (headerMap) => ({
    headers: {
      get: (name) => headerMap[name.toLowerCase()] || null,
    },
  });

  assert.equal(
    getClientIp(mockHeaders({ "cf-connecting-ip": "203.0.113.1" })),
    "203.0.113.1",
  );
  assert.equal(
    getClientIp(mockHeaders({ "x-real-ip": "198.51.100.2" })),
    "198.51.100.2",
  );
  assert.equal(
    getClientIp(mockHeaders({ "x-forwarded-for": "192.0.2.1, 10.0.0.1" })),
    "192.0.2.1",
  );
  assert.equal(getClientIp(null), "127.0.0.1");
});

test("checkRateLimit limits requests according to threshold", () => {
  const testKey = `test-ip-${Date.now()}`;

  // First 3 requests allowed with limit: 3
  const r1 = checkRateLimit(testKey, { limit: 3, windowMs: 1000 });
  assert.equal(r1.success, true);
  assert.equal(r1.remaining, 2);

  const r2 = checkRateLimit(testKey, { limit: 3, windowMs: 1000 });
  assert.equal(r2.success, true);
  assert.equal(r2.remaining, 1);

  const r3 = checkRateLimit(testKey, { limit: 3, windowMs: 1000 });
  assert.equal(r3.success, true);
  assert.equal(r3.remaining, 0);

  // 4th request exceeds limit
  const r4 = checkRateLimit(testKey, { limit: 3, windowMs: 1000 });
  assert.equal(r4.success, false);
  assert.equal(r4.remaining, 0);
  assert.ok(r4.retryAfter > 0);
});
