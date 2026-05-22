// SHA-256 hash of the family password. Plaintext never stored here.
const PASSWORD_HASH = 'e5aac6d94670b1f06946f65649e24b61b9898d9687fb2a70be4041cd98b8f58c';

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
