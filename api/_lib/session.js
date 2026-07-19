import crypto from 'node:crypto';

export const SESSION_COOKIE = 'vv_session';

// How long a session lasts depends on how it was created — Google is a
// verified, allowlisted identity so it gets the longer window; password and
// invite are both shared/temporary-style access, so both get a short one.
const SESSION_MAX_AGE_BY_METHOD = {
  google:   60 * 60 * 24 * 7, // 7 days
  password: 60 * 60 * 24 * 1, // 1 day
  invite:   60 * 60 * 24 * 1, // 1 day
};
const DEFAULT_SESSION_MAX_AGE = SESSION_MAX_AGE_BY_METHOD.password;

function sign(body) {
  const secret = process.env.SESSION_SECRET;
  if (!secret) throw new Error('SESSION_SECRET is not set');
  return crypto.createHmac('sha256', secret).update(body).digest('base64url');
}

// Returns { token, maxAge } — maxAge is derived from data.method so the
// cookie's Max-Age and the token's own embedded expiry always agree.
export function createSessionToken(data) {
  const maxAge = SESSION_MAX_AGE_BY_METHOD[data.method] ?? DEFAULT_SESSION_MAX_AGE;
  const body = Buffer.from(JSON.stringify({ ...data, exp: Date.now() + maxAge * 1000 })).toString('base64url');
  return { token: `${body}.${sign(body)}`, maxAge };
}

export function verifySessionToken(token) {
  if (!token || !process.env.SESSION_SECRET) return null;
  const [body, sig] = token.split('.');
  if (!body || !sig) return null;

  const expected = sign(body);
  const sigBuf = Buffer.from(sig);
  const expectedBuf = Buffer.from(expected);
  if (sigBuf.length !== expectedBuf.length || !crypto.timingSafeEqual(sigBuf, expectedBuf)) {
    return null;
  }

  try {
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
    if (typeof payload.exp !== 'number' || Date.now() > payload.exp) return null;
    return payload;
  } catch {
    return null;
  }
}
