export async function login(password) {
  try {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ password }),
    });
    if (res.ok) return { ok: true };
    const data = await res.json().catch(() => ({}));
    return { ok: false, error: data.error || 'Incorrect password.' };
  } catch {
    return { ok: false, error: 'Could not reach the server. Please try again.' };
  }
}

export function isAuthenticated() {
  return sessionStorage.getItem('vv-auth') === 'true';
}

export function setAuthenticated() {
  sessionStorage.setItem('vv-auth', 'true');
}

export function clearAuth() {
  sessionStorage.removeItem('vv-auth');
  fetch('/api/auth/logout', { method: 'POST', credentials: 'include' }).catch(() => {});
}

// Checks the server-side session (HTTP-only cookie) — set by either
// password login or Google OAuth.
export async function checkSession() {
  try {
    const res = await fetch('/api/auth/session', { credentials: 'include' });
    if (!res.ok) return { authenticated: false };
    return await res.json();
  } catch {
    return { authenticated: false };
  }
}
