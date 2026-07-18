import { neon } from '@neondatabase/serverless';
import seedData from '../../src/data/family.json' with { type: 'json' };

function normalizeArray(val) {
  if (Array.isArray(val)) return val;
  if (typeof val === 'string') {
    try { return JSON.parse(val); } catch { return []; }
  }
  return [];
}

function rowToPerson(row) {
  const person = {
    id: row.id,
    name: row.name,
    gender: row.gender,
    born: row.born,
    died: row.died,
    alive: row.alive,
    parentId: row.parent_id,
    motherId: row.mother_id,
    spouseIds: normalizeArray(row.spouse_ids),
    occupation: row.occupation,
    location: row.location,
    bio: row.bio,
    photo: row.photo,
    tags: normalizeArray(row.tags),
  };
  if (row.dom) person.dom = row.dom;
  return person;
}

// meta is edited by hand in family.json + redeploy (per project convention),
// never through the app — only `people` is backed by the live datastore.
export async function getFamilyData() {
  const sql = neon(process.env.DATABASE_URL);
  const rows = await sql`SELECT * FROM people ORDER BY sort_order`;
  return { meta: seedData.meta, people: rows.map(rowToPerson) };
}

// Upserts only the given (changed) people — callers pass just the handful
// of rows that actually changed (the edited/added person plus any spouses
// whose spouseIds got mirrored), not the whole dataset. A full delete+
// reinsert of ~340 rows per write took 10+ seconds over Neon's HTTP driver;
// this keeps writes to 1-3 round trips.
//
// sort_order preserves the original family.json ordering (siblings in
// birth order, generations grouped) — ORDER BY id would otherwise scatter
// it alphabetically. New rows get appended after the current max; existing
// rows keep their sort_order untouched (the ON CONFLICT clause never sets
// it, so Postgres just leaves the stored value alone).
export async function upsertPeople(people) {
  if (!people.length) return;
  const sql = neon(process.env.DATABASE_URL);

  const [{ max }] = await sql`SELECT COALESCE(MAX(sort_order), -1) AS max FROM people`;
  let nextOrder = Number(max) + 1;

  const queries = people.map(p => sql`
    INSERT INTO people (id, name, gender, born, died, dom, alive, parent_id, mother_id, spouse_ids, occupation, location, bio, photo, tags, sort_order)
    VALUES (${p.id}, ${p.name}, ${p.gender}, ${p.born ?? null}, ${p.died ?? null}, ${p.dom ?? null}, ${p.alive ?? null}, ${p.parentId ?? null}, ${p.motherId ?? null}, ${JSON.stringify(p.spouseIds || [])}, ${p.occupation ?? null}, ${p.location ?? null}, ${p.bio ?? null}, ${p.photo ?? null}, ${JSON.stringify(p.tags || [])}, ${nextOrder++})
    ON CONFLICT (id) DO UPDATE SET
      name = EXCLUDED.name, gender = EXCLUDED.gender, born = EXCLUDED.born,
      died = EXCLUDED.died, dom = EXCLUDED.dom, alive = EXCLUDED.alive,
      parent_id = EXCLUDED.parent_id, mother_id = EXCLUDED.mother_id,
      spouse_ids = EXCLUDED.spouse_ids, occupation = EXCLUDED.occupation,
      location = EXCLUDED.location, bio = EXCLUDED.bio, photo = EXCLUDED.photo,
      tags = EXCLUDED.tags
  `);

  if (queries.length === 1) await queries[0];
  else await sql.transaction(queries);
}
