import { verifySessionToken, SESSION_COOKIE } from './session.js';

export function requireSession(req) {
  return verifySessionToken(req.cookies?.[SESSION_COOKIE]);
}

// Every write to family data (add, edit, reorder, photo upload) and invite
// management requires an admin session. Invite-redeemed sessions are
// login-only (view access) — only password or Google logins count as admin.
export function requireAdminSession(req) {
  const session = requireSession(req);
  if (!session || session.method === 'invite') return null;
  return session;
}
