/**
 * sort-placeholder-spouses.js
 *
 * Reorders family.json so every placeholder spouse sits immediately
 * after their real partner in the people array.
 *
 * Algorithm:
 *   1. Separate people into real and placeholder buckets.
 *   2. Walk real people in their current order.
 *   3. After each real person, append any placeholder spouses they reference.
 *   4. Any unplaced placeholders (edge cases) go at the end.
 */

import fs   from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_PATH = path.join(__dirname, '../src/data/family.json');

const data   = JSON.parse(fs.readFileSync(DATA_PATH, 'utf8'));
const people = data.people;

const pMap        = Object.fromEntries(people.map(p => [p.id, p]));
const isPlaceholder = p => p.tags?.includes('placeholder');

const placed      = new Set();
const reordered   = [];

people.forEach(person => {
  if (isPlaceholder(person)) return; // handled inline below

  reordered.push(person);
  placed.add(person.id);

  // Insert any placeholder spouses right after this person
  (person.spouseIds || []).forEach(sid => {
    const spouse = pMap[sid];
    if (spouse && isPlaceholder(spouse) && !placed.has(sid)) {
      reordered.push(spouse);
      placed.add(sid);
    }
  });
});

// Append any placeholders not yet placed (shouldn't happen, but safety net)
let orphans = 0;
people.forEach(p => {
  if (!placed.has(p.id)) {
    reordered.push(p);
    placed.add(p.id);
    orphans++;
  }
});

data.people = reordered;
fs.writeFileSync(DATA_PATH, JSON.stringify(data, null, 2), 'utf8');

console.log(`Done.`);
console.log(`  Total people  : ${reordered.length}`);
console.log(`  Orphan entries: ${orphans} (should be 0)`);
