/**
 * add-placeholder-spouses.js
 *
 * For every person who has children but no spouseIds:
 *   1. Creates a placeholder spouse (opposite gender, name "अज्ञात")
 *   2. Links bidirectionally: parent.spouseIds = [ph.id], ph.spouseIds = [parent.id]
 *   3. If parent is male, updates children's motherId (null only) → ph.id
 *   4. Guarantees unique IDs — appends -2, -3 … on collision
 */

import fs   from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_PATH = path.join(__dirname, '../src/data/family.json');

const data   = JSON.parse(fs.readFileSync(DATA_PATH, 'utf8'));
const people = data.people;

// ── Build lookup maps ─────────────────────────────────────────────────────────
const personMap  = Object.fromEntries(people.map(p => [p.id, p]));
const childrenOf = {};
people.forEach(p => {
  if (p.parentId) (childrenOf[p.parentId] = childrenOf[p.parentId] || []).push(p);
});

// Track ALL existing IDs (including ones we generate this run) to avoid dupes
const existingIds = new Set(people.map(p => p.id));

function uniqueId(base) {
  if (!existingIds.has(base)) { existingIds.add(base); return base; }
  let n = 2;
  while (existingIds.has(`${base}-${n}`)) n++;
  const id = `${base}-${n}`;
  existingIds.add(id);
  return id;
}

// ── Find candidates ───────────────────────────────────────────────────────────
const candidates = people.filter(p =>
  !p.tags?.includes('placeholder') &&
  (childrenOf[p.id]?.length > 0) &&
  (!p.spouseIds || p.spouseIds.length === 0)
);

// ── Process ───────────────────────────────────────────────────────────────────
const placeholders = [];
let motherIdUpdates = 0;

candidates.forEach(parent => {
  const phGender = parent.gender === 'male' ? 'female' : 'male';
  const phName   = phGender === 'female' ? 'श्रीमती (अज्ञात)' : 'श्री (अज्ञात)';
  const baseId   = `ph-spouse-${parent.id}`;
  const phId     = uniqueId(baseId);

  const placeholder = {
    id:        phId,
    name:      phName,
    gender:    phGender,
    alive:     null,
    born:      null,
    died:      null,
    dom:       null,
    parentId:  null,
    motherId:  null,
    spouseIds: [parent.id],
    occupation: null,
    location:  null,
    bio:       null,
    tags:      ['placeholder'],
    photo:     null,
  };

  placeholders.push(placeholder);

  // Link parent → placeholder
  parent.spouseIds = [phId];

  // Update children's motherId (null → phId) only when parent is male
  if (parent.gender === 'male') {
    (childrenOf[parent.id] || []).forEach(child => {
      if (child.motherId === null || child.motherId === undefined) {
        child.motherId = phId;
        motherIdUpdates++;
      }
    });
  }
});

// ── Append placeholders and write ─────────────────────────────────────────────
data.people = [...people, ...placeholders];

fs.writeFileSync(DATA_PATH, JSON.stringify(data, null, 2), 'utf8');

console.log(`Done.`);
console.log(`  Placeholder spouses added : ${placeholders.length}`);
console.log(`  Children motherId updated : ${motherIdUpdates}`);
console.log(`  Total people now          : ${data.people.length}`);
