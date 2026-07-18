import { getFamilyData, upsertPeople } from './_lib/db.js';
import { requireSession } from './_lib/requireSession.js';
import { personSchema } from './_lib/familySchema.js';
import { rateLimit } from './_lib/rateLimit.js';

export default async function handler(req, res) {
  if (req.method === 'GET') {
    const data = await getFamilyData();
    res.status(200).json(data);
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  if (!requireSession(req)) {
    res.status(401).json({ error: 'Login required.' });
    return;
  }

  const { allowed, retryAfterSeconds } = rateLimit(req, {
    limit: 20, windowMs: 5 * 60 * 1000, keyPrefix: 'family-write',
  });
  if (!allowed) {
    res.setHeader('Retry-After', String(retryAfterSeconds));
    res.status(429).json({ error: 'Too many changes — please slow down.' });
    return;
  }

  const parsed = personSchema.safeParse(req.body?.person);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues.map(i => i.message).join('; ') });
    return;
  }
  const person = parsed.data;

  const current = await getFamilyData();

  if (current.people.some(p => p.id === person.id)) {
    res.status(400).json({ error: `A member with id "${person.id}" already exists.` });
    return;
  }
  if (person.parentId && !current.people.some(p => p.id === person.parentId)) {
    res.status(400).json({ error: `parentId "${person.parentId}" does not exist.` });
    return;
  }
  if (person.motherId && !current.people.some(p => p.id === person.motherId)) {
    res.status(400).json({ error: `motherId "${person.motherId}" does not exist.` });
    return;
  }
  for (const sid of person.spouseIds || []) {
    if (!current.people.some(p => p.id === sid)) {
      res.status(400).json({ error: `spouseId "${sid}" does not exist.` });
      return;
    }
  }

  const changedSpouses = [];
  for (const sid of person.spouseIds || []) {
    const spouse = current.people.find(p => p.id === sid);
    if (spouse && !spouse.spouseIds?.includes(person.id)) {
      changedSpouses.push({ ...spouse, spouseIds: [...(spouse.spouseIds || []), person.id] });
    }
  }

  await upsertPeople([person, ...changedSpouses]);

  const people = [
    ...current.people.map(p => changedSpouses.find(s => s.id === p.id) || p),
    person,
  ];

  res.status(200).json({ ok: true, people });
}
