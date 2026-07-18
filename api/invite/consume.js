import { getActiveToken, tryConsume } from '../_lib/inviteStore.js';
import { createSessionToken, SESSION_COOKIE, SESSION_MAX_AGE } from '../_lib/session.js';
import { serializeCookie, isSecureRequest } from '../_lib/cookies.js';
import { rateLimit } from '../_lib/rateLimit.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const { allowed, retryAfterSeconds } = rateLimit(req, {
    limit: 10, windowMs: 5 * 60 * 1000, keyPrefix: 'invite-consume',
  });
  if (!allowed) {
    res.setHeader('Retry-After', String(retryAfterSeconds));
    res.status(429).json({ error: 'Too many attempts — please try again shortly.' });
    return;
  }

  const token = req.body?.token;
  if (!token) {
    res.status(400).json({ error: 'Invite token required.' });
    return;
  }

  const activeToken = await getActiveToken();
  if (!activeToken || activeToken !== token) {
    res.status(404).json({ error: 'This invite link is invalid.' });
    return;
  }

  const consumed = await tryConsume(token);
  if (!consumed) {
    res.status(410).json({ error: 'This invite link has already been used.' });
    return;
  }

  const sessionToken = createSessionToken({ method: 'invite' });
  res.setHeader('Set-Cookie', serializeCookie(SESSION_COOKIE, sessionToken, {
    maxAge: SESSION_MAX_AGE,
    secure: isSecureRequest(req),
  }));

  res.status(200).json({ ok: true });
}
