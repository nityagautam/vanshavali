import { verifySessionToken, SESSION_COOKIE } from './session.js';

export function requireSession(req) {
  return verifySessionToken(req.cookies?.[SESSION_COOKIE]);
}

// Invite-redeemed sessions can edit family data but must not be able to
// manage (view/generate/reset) invite links themselves — only password or
// Google logins count as admin here.
export function requireAdminSession(req) {
  const session = requireSession(req);
  if (!session || session.method === 'invite') return null;
  return session;
}
