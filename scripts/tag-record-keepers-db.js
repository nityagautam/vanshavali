/**
 * tag-record-keepers-db.js
 *
 * Adds the reserved `record-keeper` tag (PRD 007) to the live Postgres
 * `people` table for the members who preserved and carried this Vanshavali
 * forward. Idempotent — people who already have the tag are skipped.
 * (The same tag can be set through Edit Member in the app.)
 *
 * Usage: node --env-file=.env.local scripts/tag-record-keepers-db.js
 */

import { getFamilyData, upsertPeople } from '../api/_lib/db.js';

const IDS = ['lakshman-prasad', 'yagya-narayan', 'keshari-prasad'];
const TAG = 'record-keeper';

async function main() {
  const { people } = await getFamilyData();
  const byId = Object.fromEntries(people.map(p => [p.id, p]));

  const missing = IDS.filter(id => !byId[id]);
  const changed = IDS
    .map(id => byId[id])
    .filter(p => p && !(p.tags || []).includes(TAG))
    .map(p => ({ ...p, tags: [...(p.tags || []), TAG] }));

  if (changed.length) await upsertPeople(changed);

  console.log('Done.');
  console.log(`  tagged   : ${changed.map(p => p.id).join(', ') || 'none (already tagged)'}`);
  if (missing.length) console.log(`  not found: ${missing.join(', ')}`);
}

main().catch(err => { console.error(err); process.exit(1); });
