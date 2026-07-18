// Local dev serves over plain http://localhost — browsers vary on whether
// they honor the Secure attribute there, so only require it when the
// request actually arrived over HTTPS (always true on deployed Vercel).
export function isSecureRequest(req) {
  const host = req.headers.host || '';
  return !host.startsWith('localhost') && !host.startsWith('127.0.0.1');
}

export function serializeCookie(name, value, options = {}) {
  const parts = [`${name}=${value}`];
  parts.push(`Path=${options.path || '/'}`);
  parts.push(`Max-Age=${options.maxAge ?? 0}`);
  if (options.httpOnly !== false) parts.push('HttpOnly');
  if (options.secure) parts.push('Secure');
  parts.push(`SameSite=${options.sameSite || 'Lax'}`);
  return parts.join('; ');
}
