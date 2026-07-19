import crypto from 'node:crypto';
import { serializeCookie, isSecureRequest } from '../_lib/cookies.js';
import { createSessionToken, SESSION_COOKIE } from '../_lib/session.js';
import { rateLimit } from '../_lib/rateLimit.js';

export default function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const { allowed, retryAfterSeconds } = rateLimit(req, {
    limit: 8, windowMs: 5 * 60 * 1000, keyPrefix: 'password-login',
  });
  if (!allowed) {
    res.setHeader('Retry-After', String(retryAfterSeconds));
    res.status(429).json({ error: 'Too many attempts. Please try again shortly.' });
    return;
  }

  const passwordHash = process.env.PASSWORD_HASH;
  if (!passwordHash) {
    res.status(500).json({ error: 'Password login is not configured.' });
    return;
  }

  const password = req.body?.password;
  if (!password) {
    res.status(400).json({ error: 'Password required.' });
    return;
  }

  const inputHash = crypto.createHash('sha256').update(password).digest('hex');
  const inputBuf  = Buffer.from(inputHash);
  const storedBuf = Buffer.from(passwordHash);
  const match = inputBuf.length === storedBuf.length && crypto.timingSafeEqual(inputBuf, storedBuf);

  if (!match) {
    res.status(401).json({ error: 'Incorrect password.' });
    return;
  }

  const { token, maxAge } = createSessionToken({ method: 'password' });
  res.setHeader('Set-Cookie', serializeCookie(SESSION_COOKIE, token, {
    maxAge,
    secure: isSecureRequest(req),
  }));
  res.status(200).json({ ok: true });
}
