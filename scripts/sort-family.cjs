/**
 * sort-family.cjs
 *
 * Produces src/data/ordered-family.json as a NESTED tree structure for review:
 *
 *   [
 *     {
 *       "id": "greatgrandfather",
 *       "name": "...",
 *       "children": [
 *         { "id": "wife-id", "name": "...", "_role": "spouse" },   ← wife first
 *         {
 *           "id": "shri-shivdas",
 *           "children": [
 *             { "id": "wife-of-shivdas", "_role": "spouse" },
 *             { "id": "shri-ganesh", "children": [...] },
 *             ...
 *           ]
 *         },
 *         ...
 *       ]
 *     }
 *   ]
 *
 * Wives/spouses appear as the first child(ren) of each person node.
 * Children preserve their original family.json order (no sorting).
 * For review only — this format is NOT used by the app.
 *
 * Usage: node scripts/sort-family.cjs
 */

const fs   = require('fs');
const path = require('path');

const SRC  = path.join(__dirname, '../src/data/family.json');
const DEST = path.join(__dirname, '../src/data/ordered-family.json');

const data      = JSON.parse(fs.readFileSync(SRC, 'utf8'));
const people    = data.people;
const personMap = Object.fromEntries(people.map(p => [p.id, p]));

// Build children map: parentId → [child, ...] in original order
const childrenMap = {};
people.forEach(p => {
  if (p.parentId) {
    if (!childrenMap[p.parentId]) childrenMap[p.parentId] = [];
    childrenMap[p.parentId].push(p);
  }
});

const emitted = new Set();

function buildSpouseNode(person) {
  emitted.add(person.id);
  const { spouseIds: _s, parentId: _p, motherId: _m, ...rest } = person;
  return { ...rest, _role: 'spouse' };
}

function buildNode(person) {
  if (emitted.has(person.id)) return null;
  emitted.add(person.id);

  // Spouses first (real before placeholders), then real children
  const spouseNodes = (person.spouseIds || [])
    .map(id => personMap[id])
    .filter(s => s && !emitted.has(s.id))
    .sort((a, b) => {
      const aph = a.tags?.includes('placeholder') ? 1 : 0;
      const bph = b.tags?.includes('placeholder') ? 1 : 0;
      return aph - bph;
    })
    .map(buildSpouseNode);

  const childNodes = (childrenMap[person.id] || [])
    .map(buildNode)
    .filter(Boolean);

  const allChildren = [...spouseNodes, ...childNodes];

  const { spouseIds: _s, parentId: _p, motherId: _m, ...rest } = person;
  return {
    ...rest,
    ...(person.parentId ? { parentId: person.parentId } : {}),
    ...(person.motherId ? { motherId: person.motherId } : {}),
    ...(allChildren.length ? { children: allChildren } : {}),
  };
}

// True root(s): no parentId, not a placeholder, tagged root/legendary
const trueRoots = people.filter(p =>
  !p.parentId &&
  !p.tags?.includes('placeholder') &&
  (p.tags?.some(t => ['root', 'legendary', 'GreatGrandfather'].includes(t)) ||
   p.id === 'greatgrandfather')
);

// Other root-level real people not already captured as spouses of trueRoots
const spouseOfRoot = new Set(trueRoots.flatMap(r => r.spouseIds || []));
const otherRoots = people.filter(p =>
  !p.parentId &&
  !p.tags?.includes('placeholder') &&
  !trueRoots.find(r => r.id === p.id) &&
  !spouseOfRoot.has(p.id)
);

const tree = [...trueRoots, ...otherRoots].map(buildNode).filter(Boolean);

// Count nodes recursively
let totalNodes = 0;
function countNodes(nodes) {
  nodes.forEach(n => { totalNodes++; if (n.children) countNodes(n.children); });
}
countNodes(tree);

fs.writeFileSync(DEST, JSON.stringify(tree, null, 2), 'utf8');

console.log(`✓ Written to ${path.relative(process.cwd(), DEST)}`);
console.log(`  Total nodes in tree: ${totalNodes} (original: ${people.length})`);
