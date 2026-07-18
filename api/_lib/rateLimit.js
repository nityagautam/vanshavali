// In-memory only — resets on cold start and isn't shared across regions or
// instances. Good enough to blunt basic automated abuse; revisit with a
// shared store (e.g. Upstash Redis) once a real datastore is in place.
const buckets = new Map();

function getClientIp(req) {
  const fwd = req.headers['x-forwarded-for'];
  if (fwd) return fwd.split(',')[0].trim();
  return req.socket?.remoteAddress || 'unknown';
}

export function rateLimit(req, { limit, windowMs, keyPrefix = '' }) {
  const key = `${keyPrefix}:${getClientIp(req)}`;
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || now > bucket.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true };
  }

  if (bucket.count >= limit) {
    return { allowed: false, retryAfterSeconds: Math.ceil((bucket.resetAt - now) / 1000) };
  }

  bucket.count += 1;
  return { allowed: true };
}
