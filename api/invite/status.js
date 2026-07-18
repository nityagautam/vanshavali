import { getActiveToken, isConsumed } from '../_lib/inviteStore.js';
import { requireAdminSession } from '../_lib/requireSession.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }
  if (!requireAdminSession(req)) {
    res.status(401).json({ error: 'Admin access required.' });
    return;
  }

  const token = await getActiveToken();
  if (!token) {
    res.status(200).json({ active: false });
    return;
  }

  const consumed = await isConsumed(token);
  res.status(200).json({ active: true, token, consumed });
}
