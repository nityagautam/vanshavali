import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.KV_REST_API_URL,
  token: process.env.KV_REST_API_TOKEN,
});

const ACTIVE_KEY = 'vv:invite:active';
const consumedKey = (token) => `vv:invite:consumed:${token}`;

export async function getActiveToken() {
  return redis.get(ACTIVE_KEY);
}

export async function isConsumed(token) {
  return (await redis.get(consumedKey(token))) != null;
}

export async function setActiveToken(token) {
  await redis.set(ACTIVE_KEY, token);
}

export async function clearConsumed(token) {
  await redis.del(consumedKey(token));
}

// Atomic — true only for the first caller to consume a given token, even
// under concurrent requests. This is what Blob's read-modify-write couldn't
// guarantee.
export async function tryConsume(token) {
  const result = await redis.set(consumedKey(token), '1', { nx: true });
  return result === 'OK';
}
