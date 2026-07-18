/**
 * backfill-motherid-db.js
 *
 * DB-targeting equivalent of backfill-motherid.js — operates on the live
 * Postgres `people` table instead of src/data/family.json. Postgres always
 * stores an explicit motherId (a real id or null); there's no "key missing"
 * state like sparse JSON has, so this treats `motherId IS NULL` as "needs
 * backfill" and computes it the same way the original script did:
 * father.spouseIds[0]. Safe to re-run.
 *
 * Usage: node --env-file=.env.local scripts/backfill-motherid-db.js
 */

import { getFamilyData, upsertPeople } from '../api/_lib/db.js';

async function main() {
  const { people } = await getFamilyData();
  const personMap = Object.fromEntries(people.map(p => [p.id, p]));

  const changed = [];
  for (const person of people) {
    if (person.motherId) continue; // already has a real mother id

    let motherId = null;
    if (person.parentId) {
      const father = personMap[person.parentId];
      if (father?.spouseIds?.length > 0) motherId = father.spouseIds[0];
    }

    if (motherId) changed.push({ ...person, motherId });
  }

  if (changed.length) await upsertPeople(changed);

  console.log('Done.');
  console.log(`  motherId backfilled : ${changed.length}`);
}

main().catch(err => { console.error(err); process.exit(1); });
