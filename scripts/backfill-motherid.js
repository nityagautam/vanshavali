/**
 * backfill-motherid.js
 *
 * For every person in family.json where `motherId` key does NOT exist:
 *   - Has parentId + father has spouseIds[0]  → motherId = spouseIds[0]
 *   - Has parentId + father has no spouseIds  → motherId = null
 *   - No parentId (root nodes)                → motherId = null
 *
 * People who already have `motherId` (even null) are untouched.
 */

import fs   from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const DATA_PATH = path.join(__dirname, '../src/data/family.json');

const raw  = fs.readFileSync(DATA_PATH, 'utf8');
const data = JSON.parse(raw);

const personMap = Object.fromEntries(data.people.map(p => [p.id, p]));

let added = 0;
let skipped = 0;

data.people = data.people.map(person => {
  // Already has the key — skip
  if ('motherId' in person) {
    skipped++;
    return person;
  }

  let motherId = null;

  if (person.parentId) {
    const father = personMap[person.parentId];
    if (father && Array.isArray(father.spouseIds) && father.spouseIds.length > 0) {
      motherId = father.spouseIds[0];
    }
  }

  added++;
  return { ...person, motherId };
});

fs.writeFileSync(DATA_PATH, JSON.stringify(data, null, 2), 'utf8');

console.log(`Done.`);
console.log(`  motherId added : ${added}`);
console.log(`  already had it : ${skipped}`);
