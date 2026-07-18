// SHA-256 hash of the family password. Plaintext never stored here.
const PASSWORD_HASH = '3f3e200366b0657986a8a4bffd2a7e88665ccf49a689d58b9f73b9d450da2cd0';

export async function checkPassword(input) {
  const encoded    = new TextEncoder().encode(input);
  const hashBuffer = await window.crypto.subtle.digest('SHA-256', encoded);
  const hashHex    = Array.from(new Uint8Array(hashBuffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
  return hashHex === PASSWORD_HASH;
}

export function isAuthenticated() {
  return sessionStorage.getItem('vv-auth') === 'true';
}

export function setAuthenticated() {
  sessionStorage.setItem('vv-auth', 'true');
}

export function clearAuth() {
  sessionStorage.removeItem('vv-auth');
}
