// Progressive tree rendering (PRD 009, fix E).
//
// Drawing all 344 cards in one React commit is a ~400 ms main-thread block on
// a mid-range phone. Instead the top generations render immediately and each
// deeper node registers here to render its children later, a small batch per
// idle slice, shallowest generation first. Anything that needs a card that
// may not exist yet (search, deep links, Fit, jump-to-person) calls
// revealAll() to finish the job immediately.

const BATCH = 24; // nodes revealed per slice

let queue = [];
let handle = null;
let seq = 0;

const later = cb => (typeof requestIdleCallback === 'function'
  ? requestIdleCallback(cb, { timeout: 80 })
  : setTimeout(cb, 16));

function run() {
  handle = null;
  queue.sort((a, b) => a.depth - b.depth || a.seq - b.seq);
  queue.splice(0, BATCH).forEach(item => item.reveal());
  if (queue.length) handle = later(run);
}

/** Schedule `reveal` for this node; returns an unregister function. */
export function registerReveal(depth, reveal) {
  const item = { depth, seq: seq++, reveal };
  queue.push(item);
  if (!handle) handle = later(run);
  return () => { queue = queue.filter(i => i !== item); };
}

/** Render every pending branch now. */
export function revealAll() {
  const all = queue;
  queue = [];
  all.forEach(item => item.reveal());
}

export const hasPendingReveal = () => queue.length > 0;
