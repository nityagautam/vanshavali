/**
 * add-placeholder-spouses-db.js
 *
 * DB-targeting equivalent of add-placeholder-spouses.js — operates on the
 * live Postgres `people` table instead of src/data/family.json.
 *
 * For every person who has children but no spouseIds:
 *   1. Creates a placeholder spouse (opposite gender, name "अज्ञात")
 *   2. Links bidirectionally: parent.spouseIds = [ph.id], ph.spouseIds = [parent.id]
 *   3. If parent is male, updates children's motherId (null only) → ph.id
 *   4. Guarantees unique IDs — appends -2, -3 … on collision
 *
 * Usage: node --env-file=.env.local scripts/add-placeholder-spouses-db.js
 */

import { getFamilyData, upsertPeople } from '../api/_lib/db.js';

async function main() {
  const { people } = await getFamilyData();

  const childrenOf = {};
  people.forEach(p => {
    if (p.parentId) (childrenOf[p.parentId] = childrenOf[p.parentId] || []).push(p);
  });

  const existingIds = new Set(people.map(p => p.id));
  function uniqueId(base) {
    if (!existingIds.has(base)) { existingIds.add(base); return base; }
    let n = 2;
    while (existingIds.has(`${base}-${n}`)) n++;
    const id = `${base}-${n}`;
    existingIds.add(id);
    return id;
  }

  const candidates = people.filter(p =>
    !p.tags?.includes('placeholder') &&
    (childrenOf[p.id]?.length > 0) &&
    (!p.spouseIds || p.spouseIds.length === 0)
  );

  const placeholders = [];
  const updatedParents = [];
  const updatedChildren = [];

  candidates.forEach(parent => {
    const phGender = parent.gender === 'male' ? 'female' : 'male';
    const phName   = phGender === 'female' ? 'श्रीमती (अज्ञात)' : 'श्री (अज्ञात)';
    const baseId   = `ph-spouse-${parent.id}`;
    const phId     = uniqueId(baseId);

    placeholders.push({
      id: phId, name: phName, gender: phGender,
      alive: null, born: null, died: null, dom: null,
      parentId: null, motherId: null, spouseIds: [parent.id],
      occupation: null, location: null, bio: null, tags: ['placeholder'], photo: null,
    });

    updatedParents.push({ ...parent, spouseIds: [phId] });

    if (parent.gender === 'male') {
      (childrenOf[parent.id] || []).forEach(child => {
        if (child.motherId === null || child.motherId === undefined) {
          updatedChildren.push({ ...child, motherId: phId });
        }
      });
    }
  });

  const changed = [...placeholders, ...updatedParents, ...updatedChildren];
  if (changed.length) await upsertPeople(changed);

  console.log('Done.');
  console.log(`  Placeholder spouses added : ${placeholders.length}`);
  console.log(`  Children motherId updated : ${updatedChildren.length}`);
}

main().catch(err => { console.error(err); process.exit(1); });
