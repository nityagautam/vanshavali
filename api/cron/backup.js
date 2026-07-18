import { put } from '@vercel/blob';
import { getFamilyData } from '../_lib/db.js';

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
    contentType: 'application/json',
    addRandomSuffix: false,
  });

  res.status(200).json({ ok: true, pathname, peopleCount: data.people.length });
}
