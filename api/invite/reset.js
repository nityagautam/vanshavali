import { getActiveToken, clearConsumed } from '../_lib/inviteStore.js';
import { requireAdminSession } from '../_lib/requireSession.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }
  if (!requireAdminSession(req)) {
    res.status(401).json({ error: 'Admin access required.' });
    return;
  }

  const token = await getActiveToken();
  if (!token) {
    res.status(404).json({ error: 'No invite link exists yet — generate one first.' });
    return;
  }

  await clearConsumed(token);
  res.status(200).json({ token, consumed: false });
}
