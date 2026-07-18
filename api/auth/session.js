import { verifySessionToken, SESSION_COOKIE } from '../_lib/session.js';

export default function handler(req, res) {
  const payload = verifySessionToken(req.cookies?.[SESSION_COOKIE]);

  if (!payload) {
    res.status(200).json({ authenticated: false });
    return;
  }

  res.status(200).json({
    authenticated: true,
    email: payload.email,
    name: payload.name,
    picture: payload.picture,
    isAdmin: payload.method !== 'invite',
  });
}
