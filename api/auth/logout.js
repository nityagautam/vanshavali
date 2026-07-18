import { serializeCookie, isSecureRequest } from '../_lib/cookies.js';
import { SESSION_COOKIE } from '../_lib/session.js';

export default function handler(req, res) {
  res.setHeader('Set-Cookie', serializeCookie(SESSION_COOKIE, '', { maxAge: 0, secure: isSecureRequest(req) }));
  res.status(200).json({ ok: true });
}
