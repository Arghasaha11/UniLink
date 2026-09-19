const buckets = new Map();

const DEFAULT_OPTIONS = { windowMs: 15 * 60 * 1000, max: 10 };

// Hard upper bound on retained buckets. Without it a client that rotates the
// client key can grow the map without limit (the prune below only removes
// expired buckets, so live keys would accumulate forever).
const MAX_BUCKETS = 10_000;

const IPV4_PATTERN = /^(\d{1,3}\.){3}\d{1,3}$/;

function looksLikeIp(value) {
  if (value.includes(":")) {
    return true; // IPv6 form
  }
  return (
    IPV4_PATTERN.test(value) &&
    value
      .split(".")
      .every((part) => part.length <= 3 && Number(part) <= 255)
  );
}

function clientKey(request) {
  // Forwarded headers are only trustworthy when the app runs behind the proxy
  // that sets them (e.g. Vercel). When hosting directly, clients can spoof
  // x-forwarded-for, so configure your proxy to strip it or pass a custom
  // clientKey in the rateLimit options.
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0].trim();
    if (looksLikeIp(first)) {
      return first;
    }
  }
  const realIp = request.headers.get("x-real-ip");
  if (realIp && looksLikeIp(realIp.trim())) {
    return realIp.trim();
  }
  return "unknown";
}

function evictExpired(now) {
  if (buckets.size <= MAX_BUCKETS) {
    return;
  }
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) {
      buckets.delete(key);
    }
  }
  // If pruning expired buckets is not enough (e.g. a flood of fresh keys),
  // evict the oldest entries until we are back under the cap.
  while (buckets.size > MAX_BUCKETS) {
    const oldest = buckets.keys().next();
    if (oldest.done) {
      break;
    }
    buckets.delete(oldest.value);
  }
}

export function rateLimit(request, options = {}) {
  const { windowMs, max } = { ...DEFAULT_OPTIONS, ...options };
  const key = clientKey(request);
  const now = Date.now();

  evictExpired(now);

  let bucket = buckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    bucket = { count: 1, resetAt: now + windowMs };
    buckets.set(key, bucket);
    return null;
  }

  bucket.count += 1;
  if (bucket.count > max) {
    return { retryAfter: Math.ceil((bucket.resetAt - now) / 1000) };
  }
  return null;
}