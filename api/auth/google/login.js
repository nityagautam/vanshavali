import crypto from 'node:crypto';
import { serializeCookie, isSecureRequest } from '../../_lib/cookies.js';
import { rateLimit } from '../../_lib/rateLimit.js';

const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const STATE_COOKIE    = 'g_oauth_state';
const STATE_MAX_AGE   = 600; // 10 minutes

export default function handler(req, res) {
  const { allowed, retryAfterSeconds } = rateLimit(req, {
    limit: 10, windowMs: 5 * 60 * 1000, keyPrefix: 'google-login',
  });
  if (!allowed) {
    res.setHeader('Retry-After', String(retryAfterSeconds));
    res.status(429).send('Too many login attempts. Please try again shortly.');
    return;
  }

  const clientId    = process.env.GOOGLE_CLIENT_ID;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI;

  if (!clientId || !redirectUri) {
    res.status(500).send('Google OAuth is not configured yet — set GOOGLE_CLIENT_ID and GOOGLE_REDIRECT_URI.');
    return;
  }

  const state = crypto.randomBytes(16).toString('hex');
  res.setHeader('Set-Cookie', serializeCookie(STATE_COOKIE, state, {
    maxAge: STATE_MAX_AGE,
    secure: isSecureRequest(req),
  }));

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'openid email profile',
    state,
    access_type: 'online',
    prompt: 'select_account',
  });

  res.redirect(`${GOOGLE_AUTH_URL}?${params.toString()}`);
}
