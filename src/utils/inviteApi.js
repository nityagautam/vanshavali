async function parse(res) {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Request failed.');
  return data;
}

export function getInviteStatus() {
  return fetch('/api/invite/status', { credentials: 'include' }).then(parse);
}

export function generateInvite() {
  return fetch('/api/invite/generate', { method: 'POST', credentials: 'include' }).then(parse);
}

export function resetInvite() {
  return fetch('/api/invite/reset', { method: 'POST', credentials: 'include' }).then(parse);
}

export function consumeInvite(token) {
  return fetch('/api/invite/consume', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ token }),
  }).then(parse);
}
