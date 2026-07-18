import { put, list, del } from '@vercel/blob';
import { getFamilyData } from '../_lib/db.js';

const RETAIN_DAYS = 7;

export default async function handler(req, res) {
  const authHeader = req.headers.authorization;
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const data = await getFamilyData();
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const pathname = `backups/family-${timestamp}.json`;

  await put(pathname, JSON.stringify(data, null, 2), {
    access: 'public',
    contentType: 'application/json; charset=utf-8',
    addRandomSuffix: false,
  });

  // Rolling retention: keep the newest RETAIN_DAYS backups, prune the rest.
  // Count-based rather than date-based so a missed/late cron run doesn't
  // wipe out everything still within the window.
  const { blobs } = await list({ prefix: 'backups/' });
  const stale = blobs
    .sort((a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt))
    .slice(RETAIN_DAYS);
  await Promise.all(stale.map(b => del(b.url)));

  res.status(200).json({ ok: true, pathname, peopleCount: data.people.length, pruned: stale.length });
}
