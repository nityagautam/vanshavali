/**
 * export-db-to-family-json.js
 *
 * Refreshes the bundled snapshot src/data/family.json from the live Postgres
 * `people` table, so the repo carries a current backup of live edits.
 * - `meta` is left exactly as it is (it is hand-edited and never written by
 *   the app).
 * - `people` is replaced with the live rows in live sibling order
 *   (ORDER BY sort_order). The read-only `sortOrder` field is dropped.
 * - Existing records keep their current key order, so the git diff only shows
 *   real changes.
 * - Fields in KEEP_IF_LIVE_EMPTY keep the snapshot's value when the live row
 *   has none. `dom` (marriage date) was erased from live rows by an edit-path
 *   bug (personSchema stripped it; fixed in api/_lib/familySchema.js), so the
 *   backup must not copy that loss.
 * Read-only against the database. Safe to re-run.
 *
 * Usage: node --env-file=.env.local scripts/export-db-to-family-json.js
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { getFamilyData } from '../api/_lib/db.js';

const FILE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../src/data/family.json');
const CANONICAL = ['id', 'name', 'gender', 'born', 'died', 'dom', 'alive', 'parentId', 'motherId',
  'spouseIds', 'occupation', 'location', 'bio', 'photo', 'tags'];

const KEEP_IF_LIVE_EMPTY = ['dom'];
const isEmpty = v => v === undefined || v === null || v === '';

function shape(person, existing, kept) {
  const { sortOrder, ...fields } = person; // eslint-disable-line no-unused-vars
  for (const key of KEEP_IF_LIVE_EMPTY) {
    if (isEmpty(fields[key]) && existing && !isEmpty(existing[key])) {
      fields[key] = existing[key];
      kept?.push(`${person.id}.${key}`);
    }
  }
  const order = existing ? Object.keys(existing) : CANONICAL;
  const out = {};
  for (const key of order) {
    if (fields[key] !== undefined) out[key] = fields[key];
    else if (existing && key in existing) out[key] = null; // live omits empty dom; keep the key
  }
  for (const key of Object.keys(fields)) if (!(key in out) && fields[key] !== undefined) out[key] = fields[key];
  return out;
}

async function main() {
  const current = JSON.parse(fs.readFileSync(FILE, 'utf8'));
  const existingById = Object.fromEntries(current.people.map(p => [p.id, p]));
  const { people } = await getFamilyData();

  const kept = [];
  const next = { ...current, people: people.map(p => shape(p, existingById[p.id], kept)) };

  const liveIds = new Set(people.map(p => p.id));
  const added = people.filter(p => !existingById[p.id]).map(p => p.id);
  const removed = current.people.filter(p => !liveIds.has(p.id)).map(p => p.id);
  const changed = people.filter(p => existingById[p.id]
    && JSON.stringify(shape(p, existingById[p.id])) !== JSON.stringify(existingById[p.id])).map(p => p.id);

  fs.writeFileSync(FILE, JSON.stringify(next, null, 2) + '\n');

  console.log('Done.');
  console.log(`  people written : ${next.people.length}`);
  console.log(`  added          : ${added.length ? added.join(', ') : 'none'}`);
  console.log(`  removed        : ${removed.length ? removed.join(', ') : 'none'}`);
  console.log(`  changed        : ${changed.length}`);
  console.log(`  kept from old snapshot (missing live): ${kept.length ? kept.join(', ') : 'none'}`);
}

main().catch(err => { console.error(err); process.exit(1); });
