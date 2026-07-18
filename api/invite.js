import crypto from 'node:crypto';
import { getActiveToken, setActiveToken, tryConsume, clearConsumed, isConsumed } from './_lib/inviteStore.js';
import { createSessionToken, SESSION_COOKIE, SESSION_MAX_AGE } from './_lib/session.js';
import { serializeCookie, isSecureRequest } from './_lib/cookies.js';
import { requireAdminSession } from './_lib/requireSession.js';
import { rateLimit } from './_lib/rateLimit.js';

// Consolidated dispatcher for the invite/* routes — Vercel Hobby caps a
// deployment at 12 Serverless Functions, so /api/invite/status|generate|
// reset|consume are rewritten (see vercel.json) into this single function,
// keyed by ?action=. Frontend paths in src/utils/inviteApi.js are unchanged.
export default async function handler(req, res) {
  const { action } = req.query;

  switch (action) {
    case 'status': return status(req, res);
    case 'generate': return generate(req, res);
    case 'reset': return reset(req, res);
    case 'consume': return consume(req, res);
    default:
      res.status(404).json({ error: 'Unknown invite action.' });
  }
}

async function status(req, res) {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }
  if (!requireAdminSession(req)) {
    res.status(401).json({ error: 'Admin access required.' });
    return;
  }

  const token = await getActiveToken();
  if (!token) {
    res.status(200).json({ active: false });
    return;
  }

  const consumed = await isConsumed(token);
  res.status(200).json({ active: true, token, consumed });
}

async function generate(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }
  if (!requireAdminSession(req)) {
    res.status(401).json({ error: 'Admin access required.' });
    return;
  }

  const { allowed, retryAfterSeconds } = rateLimit(req, {
    limit: 10, windowMs: 5 * 60 * 1000, keyPrefix: 'invite-generate',
  });
  if (!allowed) {
    res.setHeader('Retry-After', String(retryAfterSeconds));
    res.status(429).json({ error: 'Too many requests — please slow down.' });
    return;
  }

  const token = crypto.randomBytes(16).toString('hex');
  await setActiveToken(token);

  res.status(200).json({ token, consumed: false });
}

async function reset(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }
  if (!requireAdminSession(req)) {
    res.status(401).json({ error: 'Admin access required.' });
    return;
  }

  const token = await getActiveToken();
  if (!token) {
    res.status(404).json({ error: 'No invite link exists yet — generate one first.' });
    return;
  }

  await clearConsumed(token);
  res.status(200).json({ token, consumed: false });
}

async function consume(req, res) {
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
