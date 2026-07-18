export async function fetchFamilyData() {
  const res = await fetch('/api/family');
  if (!res.ok) throw new Error('Failed to load family data');
  return res.json();
}

export async function addFamilyMember(person, insertAfterId) {
  const res = await fetch('/api/family', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ person, insertAfterId: insertAfterId || undefined }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Failed to save member.');
  return data; // { ok, people }
}

export async function editFamilyMember(payload) {
  const res = await fetch('/api/family/edit', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Failed to save changes.');
  return data; // { ok, people }
}

export async function moveSibling(id, direction) {
  const res = await fetch('/api/family/edit', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ id, move: direction }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Failed to reorder.');
  return data; // { ok, moved, people }
}
