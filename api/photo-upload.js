import { handleUpload } from '@vercel/blob/client';
import { requireSession } from './_lib/requireSession.js';
import { rateLimit } from './_lib/rateLimit.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  if (!requireSession(req)) {
    res.status(401).json({ error: 'Login required.' });
    return;
  }

  const { allowed, retryAfterSeconds } = rateLimit(req, {
    limit: 20, windowMs: 5 * 60 * 1000, keyPrefix: 'photo-upload',
  });
  if (!allowed) {
    res.setHeader('Retry-After', String(retryAfterSeconds));
    res.status(429).json({ error: 'Too many uploads — please slow down.' });
    return;
  }

  try {
    const jsonResponse = await handleUpload({
      body: req.body,
      request: req,
      onBeforeGenerateToken: async () => ({
        allowedContentTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
        addRandomSuffix: true,
        maximumSizeInBytes: 8 * 1024 * 1024, // 8 MB
      }),
    });
    res.status(200).json(jsonResponse);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
}
