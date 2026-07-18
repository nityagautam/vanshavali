import crypto from 'node:crypto';
import { setActiveToken } from '../_lib/inviteStore.js';
import { requireAdminSession } from '../_lib/requireSession.js';
import { rateLimit } from '../_lib/rateLimit.js';

export default async function handler(req, res) {
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
