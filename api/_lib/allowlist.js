export function isAllowedEmail(email) {
  const allowed = (process.env.ALLOWED_EMAILS || '')
    .split(',')
    .map(e => e.trim().toLowerCase())
    .filter(Boolean);
  return allowed.includes(String(email || '').toLowerCase());
}
