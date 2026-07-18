/**
 * migrate-to-postgres.js
 *
 * One-time migration: creates the `people` table in Neon Postgres and seeds
 * it from src/data/family.json (the bundled build-time snapshot). Safe to
 * re-run — it recreates the table contents from the JSON file each time.
 *
 * Usage: node --env-file=.env.local scripts/migrate-to-postgres.js
 */

import { neon } from '@neondatabase/serverless';
import familyData from '../src/data/family.json' with { type: 'json' };

const sql = neon(process.env.DATABASE_URL);

async function main() {
  await sql`DROP TABLE IF EXISTS people`;
  await sql`
    CREATE TABLE people (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      gender TEXT,
      born TEXT,
      died TEXT,
      dom TEXT,
      alive BOOLEAN,
      parent_id TEXT,
      mother_id TEXT,
      spouse_ids JSONB NOT NULL DEFAULT '[]',
      occupation TEXT,
      location TEXT,
      bio TEXT,
      photo TEXT,
      tags JSONB NOT NULL DEFAULT '[]',
      sort_order NUMERIC NOT NULL
    )
  `;

  await sql`DELETE FROM people`;

  for (let i = 0; i < familyData.people.length; i++) {
    const p = familyData.people[i];
    await sql`
      INSERT INTO people (id, name, gender, born, died, dom, alive, parent_id, mother_id, spouse_ids, occupation, location, bio, photo, tags, sort_order)
      VALUES (${p.id}, ${p.name}, ${p.gender}, ${p.born ?? null}, ${p.died ?? null}, ${p.dom ?? null}, ${p.alive ?? null}, ${p.parentId ?? null}, ${p.motherId ?? null}, ${JSON.stringify(p.spouseIds || [])}, ${p.occupation ?? null}, ${p.location ?? null}, ${p.bio ?? null}, ${p.photo ?? null}, ${JSON.stringify(p.tags || [])}, ${i})
    `;
  }

  const [{ count }] = await sql`SELECT COUNT(*)::int AS count FROM people`;
  console.log(`Migrated ${count} people into Postgres.`);
}

main().catch(err => { console.error(err); process.exit(1); });
