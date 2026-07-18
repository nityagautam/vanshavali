export async function fetchFamilyData() {
  const res = await fetch('/api/family');
  if (!res.ok) throw new Error('Failed to load family data');
  return res.json();
}

export async function addFamilyMember(person) {
  const res = await fetch('/api/family', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ person }),
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
