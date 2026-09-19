const buckets = new Map();

const DEFAULT_OPTIONS = { windowMs: 15 * 60 * 1000, max: 10 };

function clientKey(request) {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }
  return request.headers.get("x-real-ip") || "unknown";
}

export function rateLimit(request, options = {}) {
  const { windowMs, max } = { ...DEFAULT_OPTIONS, ...options };
  const key = clientKey(request);
  const now = Date.now();

  if (buckets.size > 10000) {
    for (const [bucketKey, bucket] of buckets) {
      if (bucket.resetAt <= now) {
        buckets.delete(bucketKey);
      }
    }
  }

  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return null;
  }

  bucket.count += 1;
  if (bucket.count > max) {
    return { retryAfter: Math.ceil((bucket.resetAt - now) / 1000) };
  }
  return null;
}