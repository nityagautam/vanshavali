import { getFamilyData, upsertPeople } from '../_lib/db.js';
import { requireAdminSession } from '../_lib/requireSession.js';
import { personSchema } from '../_lib/familySchema.js';
import { rateLimit } from '../_lib/rateLimit.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  if (!requireAdminSession(req)) {
    res.status(401).json({ error: 'Admin access required.' });
    return;
  }

  const { allowed, retryAfterSeconds } = rateLimit(req, {
    limit: 20, windowMs: 5 * 60 * 1000, keyPrefix: 'family-edit',
  });
  if (!allowed) {
    res.setHeader('Retry-After', String(retryAfterSeconds));
    res.status(429).json({ error: 'Too many changes — please slow down.' });
    return;
  }

  const id = req.body?.id;
  if (!id) {
    res.status(400).json({ error: 'id is required.' });
    return;
  }

  const current = await getFamilyData();
  const existing = current.people.find(p => p.id === id);
  if (!existing) {
    res.status(404).json({ error: `No member with id "${id}" exists.` });
    return;
  }

  // id is immutable — the body's copy (if any) is ignored, never trusted.
  const merged = { ...existing, ...req.body, id };
  const parsed = personSchema.safeParse(merged);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues.map(i => i.message).join('; ') });
    return;
  }
  const updatedPerson = parsed.data;

  if (updatedPerson.parentId === id) {
    res.status(400).json({ error: 'A member cannot be their own parent.' });
    return;
  }
  if (updatedPerson.parentId && !current.people.some(p => p.id === updatedPerson.parentId)) {
    res.status(400).json({ error: `parentId "${updatedPerson.parentId}" does not exist.` });
    return;
  }
  if (updatedPerson.motherId && !current.people.some(p => p.id === updatedPerson.motherId)) {
    res.status(400).json({ error: `motherId "${updatedPerson.motherId}" does not exist.` });
    return;
  }
  for (const sid of updatedPerson.spouseIds || []) {
    if (sid === id) {
      res.status(400).json({ error: 'A member cannot be their own spouse.' });
      return;
    }
    if (!current.people.some(p => p.id === sid)) {
      res.status(400).json({ error: `spouseId "${sid}" does not exist.` });
      return;
    }
  }

  // Keep spouseIds bidirectional: mirror additions/removals onto the other side.
  const oldSpouseIds = new Set(existing.spouseIds || []);
  const newSpouseIds = new Set(updatedPerson.spouseIds || []);
  const added   = [...newSpouseIds].filter(s => !oldSpouseIds.has(s));
  const removed = [...oldSpouseIds].filter(s => !newSpouseIds.has(s));

  const changedSpouses = current.people
    .filter(p => added.includes(p.id) || removed.includes(p.id))
    .map(p => {
      if (added.includes(p.id) && !p.spouseIds?.includes(id)) {
        return { ...p, spouseIds: [...(p.spouseIds || []), id] };
      }
      if (removed.includes(p.id) && p.spouseIds?.includes(id)) {
        return { ...p, spouseIds: p.spouseIds.filter(s => s !== id) };
      }
      return null;
    })
    .filter(Boolean);

  await upsertPeople([updatedPerson, ...changedSpouses]);

  const people = current.people.map(p => {
    if (p.id === id) return updatedPerson;
    return changedSpouses.find(s => s.id === p.id) || p;
  });

  res.status(200).json({ ok: true, people });
}
