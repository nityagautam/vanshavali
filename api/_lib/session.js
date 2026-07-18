import crypto from 'node:crypto';

export const SESSION_COOKIE  = 'vv_session';
export const SESSION_MAX_AGE = 60 * 60 * 24 * 30; // 30 days, in seconds

function sign(body) {
  const secret = process.env.SESSION_SECRET;
  if (!secret) throw new Error('SESSION_SECRET is not set');
  return crypto.createHmac('sha256', secret).update(body).digest('base64url');
}

export function createSessionToken(data) {
  const body = Buffer.from(JSON.stringify({ ...data, exp: Date.now() + SESSION_MAX_AGE * 1000 })).toString('base64url');
  return `${body}.${sign(body)}`;
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
