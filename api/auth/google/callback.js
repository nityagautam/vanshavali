import { serializeCookie, isSecureRequest } from '../../_lib/cookies.js';
import { createSessionToken, SESSION_COOKIE, SESSION_MAX_AGE } from '../../_lib/session.js';
import { isAllowedEmail } from '../../_lib/allowlist.js';
import { rateLimit } from '../../_lib/rateLimit.js';

const TOKEN_URL    = 'https://oauth2.googleapis.com/token';
const STATE_COOKIE = 'g_oauth_state';

function decodeIdToken(idToken) {
  const payload = idToken.split('.')[1];
  return JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
}

export default async function handler(req, res) {
  const { allowed, retryAfterSeconds } = rateLimit(req, {
    limit: 15, windowMs: 5 * 60 * 1000, keyPrefix: 'google-callback',
  });
  if (!allowed) {
    res.setHeader('Retry-After', String(retryAfterSeconds));
    res.status(429).send('Too many attempts. Please try again shortly.');
    return;
  }

  const clientId     = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri  = process.env.GOOGLE_REDIRECT_URI;

  if (!clientId || !clientSecret || !redirectUri) {
    res.status(500).send('Google OAuth is not configured yet.');
    return;
  }

  const { code, state, error } = req.query;
  if (error) {
    res.redirect('/?googleLogin=denied');
    return;
  }

  const cookieState = req.cookies?.[STATE_COOKIE];
  if (!code || !state || !cookieState || state !== cookieState) {
    res.status(400).send('Invalid or expired OAuth state — please try signing in again.');
    return;
  }

  const tokenRes = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      code,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
    }),
  });

  if (!tokenRes.ok) {
    res.status(502).send('Failed to exchange Google authorization code.');
    return;
  }

  const { id_token } = await tokenRes.json();
  // id_token arrives directly from Google over this server-to-server call,
  // authenticated with our client secret — trusted without re-verifying the
  // JWT signature ourselves.
  const claims = decodeIdToken(id_token);

  if (!claims.email || claims.email_verified !== true || !isAllowedEmail(claims.email)) {
    res.redirect('/?googleLogin=denied');
    return;
  }

  const token = createSessionToken({ email: claims.email, name: claims.name, picture: claims.picture });
  const secure = isSecureRequest(req);

  res.setHeader('Set-Cookie', [
    serializeCookie(STATE_COOKIE, '', { maxAge: 0, secure }),
    serializeCookie(SESSION_COOKIE, token, { maxAge: SESSION_MAX_AGE, secure }),
  ]);

  res.redirect('/?googleLogin=success');
}
