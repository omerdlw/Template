
const stores = new Map();
const MAX_ENTRIES = 10000;

function cleanupStore(store) {
  const now = Date.now();
  for (const [key, record] of store.entries()) {
    if (record.resetTime <= now) {
      store.delete(key);
    }
  }
}

export function getClientIp(request) {
  if (!request) return "127.0.0.1";
  return (
    request.headers.get("cf-connecting-ip") ||
    request.headers.get("x-real-ip") ||
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    "127.0.0.1"
  );
}

export function checkRateLimit(key, { limit = 60, windowMs = 60000 } = {}) {
  const now = Date.now();
  let record = stores.get(key);

  if (!record || record.resetTime <= now) {
    if (stores.size >= MAX_ENTRIES) {
      cleanupStore(stores);
    }
    record = {
      count: 1,
      resetTime: now + windowMs,
    };
    stores.set(key, record);
    return {
      limit,
      remaining: Math.max(0, limit - 1),
      resetTime: record.resetTime,
      retryAfter: Math.ceil(windowMs / 1000),
      success: true,
    };
  }

  record.count += 1;
  const retryAfter = Math.max(1, Math.ceil((record.resetTime - now) / 1000));

  if (record.count > limit) {
    return {
      limit,
      remaining: 0,
      resetTime: record.resetTime,
      retryAfter,
      success: false,
    };
  }

  return {
    limit,
    remaining: Math.max(0, limit - record.count),
    resetTime: record.resetTime,
    retryAfter,
    success: true,
  };
}

export function createRateLimitExceededResponse(
  rateLimitResult,
  message = "Too many requests. Please try again later.",
) {
  return Response.json(
    { error: message },
    {
      status: 429,
      headers: {
        "Retry-After": String(rateLimitResult.retryAfter),
        "X-RateLimit-Limit": String(rateLimitResult.limit),
        "X-RateLimit-Remaining": String(rateLimitResult.remaining),
        "X-RateLimit-Reset": String(Math.ceil(rateLimitResult.resetTime / 1000)),
      },
    },
  );
}
