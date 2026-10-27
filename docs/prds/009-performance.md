# PRD 009 — Performance

- **Status:** Quick group (A, B, D, F, G) implemented 2026-10-27 — results below; C, E, H, I pending
- **Owner:** Ashutosh Mishra
- **Method:** production build (`vite preview`) in headless Chrome 155 driven over CDP; phone = 390px, 4× CPU throttle, ~1.6 Mbps / 150 ms network; desktop = 1280px, no throttle; live API/headers via `curl`. Cache disabled for load tests.

## Baseline (before any fix)

| Metric | Phone (4× CPU, slow net) | Desktop |
|---|---|---|
| First Contentful Paint | 652 ms | 420 ms |
| Largest Contentful Paint | **5,216 ms** | 1,432 ms |
| Longest main-thread block (first render) | **2,526 ms** | 471 ms |
| Total long-task time | 3,292 ms | 1,712 ms |
| CLS | 0.058 | 0.076 |
| Data transferred | 619 KB | **8,979 KB** (images 8,552 KB) |
| DOM nodes / `<img>` | 5,344 / 254 | 5,336 / 254 |
| Select a card (to next paint) | **317 ms** | 32 ms |
| Zoom step / search keystroke | 76 ms / 66 ms | 14 ms / 20 ms |
| Pan frame (median / worst) | 17 ms / 397 ms | 17 ms / 250 ms |

Bundle: one script, 577 KB raw / **158 KB gzip** (react-dom 40, app code 28, `family.json` 15, `jose` 16, `@vercel/blob` 7, react-router 12); CSS 74 KB / 14 KB gzip; fonts 183–255 KB over 6–8 requests.
API: `GET /api/family` 18 KB (brotli), 460–720 ms TTFB, `x-vercel-cache: MISS` every time.

## After the quick group (A print-on-demand, B memoisation + selection store, D lazy avatars, F cache headers, G code-splitting)

| Metric | Phone before → after | Desktop before → after |
|---|---|---|
| Largest Contentful Paint | 5,216 → **1,924 ms** | 1,432 → 1,344 ms |
| Longest main-thread block | 2,526 → **418 ms** | 471 → 877 ms (one render + one layout pass; see E) |
| Script time at load | 1,780 → **161 ms** | 330 → 294 ms |
| Data transferred at load | 619 → **327 KB** | 8,979 → **405 KB** (images now load lazily) |
| Requests at load | 40 → 15 | 45 → 19 |
| DOM nodes | 5,344 → **3,200** | 5,336 → 3,192 |
| Main script (gzip) | 158 → **126 KB** (+32 KB form, +2 KB About, lazy) | same |
| Select a card | 317 → **34 ms** | 32 → 30 ms |
| Search keystroke / zoom step | 66 / 76 → **18 / 17 ms** | 20 / 14 → 17 / 14 ms |
| Pan frame worst | 397 → **19 ms** | 250 → 19 ms |

Notes: print output unchanged (26 pages in the headless PDF check; 25 before, +1 for new About text). Selecting a card now costs ~5 ms of script on desktop. The desktop "longest block" is a single React render (~360 ms) plus one full tree layout (~180 ms) — the target of fix E. Image bytes are deferred, not yet reduced: the 7 MB of oversized Blob photos still download as they scroll into view (fix C).

## Findings, ranked by impact

1. **Images are the biggest cost: 8.5 MB on desktop.** The 15 uploaded Blob photos total 7.0 MB (one is 3.97 MB, one 1.45 MB) and 13 local photos 1.4 MB (up to 270 KB) — all shown at 36–60 px. Uploads are stored at full camera resolution. All 254 avatar `<img>` load eagerly.
2. **40% of the DOM is the hidden print report.** `PrintView` renders 2,109 of 5,310 nodes with `display:none`, and is rebuilt on every `App` render.
3. **No memoisation anywhere.** Zero `React.memo`; `handleSelect` is a new function every render, so selecting a card, zooming or typing a search character re-renders all 344 cards (selection costs 317 ms on the phone profile).
4. **First render builds the whole tree at once** (344 cards, ~3,070 nodes): a 2.5 s main-thread block and 5.2 s LCP on the phone profile.
5. **Caching headers are off for static assets.** Hashed `/assets/*.js` and `/photos/*` are served `max-age=0, must-revalidate`, so every visit re-validates them. The API is never cached at the CDN.
6. **Bundle includes code only the admin form needs.** `jose` (16 KB gz) + `@vercel/blob` client (7 KB gz) load for everyone; `AboutPage` and the print code also load eagerly.
7. **Fonts:** three families, several weights, 183–255 KB; Google Fonts is a render-blocking stylesheet from a third-party origin.

## Proposed fixes

| # | Fix | Expected effect | Risk |
|---|---|---|---|
| A | Render `PrintView` only when printing (`beforeprint` + the Print Data button) | −40% DOM, faster first render and every re-render | Low; test print |
| B | `React.memo` on `TreeNode`/`PersonCard`, stable `onSelect`, memoised `FamilyTree` | Select/zoom/search re-render only what changed (317 ms → target < 50 ms on phone) | Low |
| C | Resize + recompress on upload (max ~1024 px, JPEG ~0.82, strips EXIF); one-time script to downscale the 28 existing photos (needs DB writes to new Blob URLs, preserving `#focus`) | Images 8.5 MB → ~1.5 MB | Medium (writes production data; needs your OK) |
| D | `loading="lazy"` + `decoding="async"` + width/height on avatars | Off-screen photos not fetched or decoded | Low |
| E | Progressive tree render: first paint of the top generations, deeper ones added in idle chunks | LCP and first long task drop sharply | Medium |
| F | `vercel.json` headers: `/assets/*` immutable; `/photos/*` 1 day + stale-while-revalidate | Repeat visits skip revalidation | Low |
| G | Lazy-load Add/Edit form (+ `jose`, blob client), About page and print code | ~25–30 KB gz off the critical path | Low |
| H | Fonts: drop unused weights, preload, self-host/subset | −60–100 KB, no third-party blocking | Low |
| I | API: short CDN cache (`s-maxage=10, stale-while-revalidate`) with cache bypass after writes | −400–700 ms on repeat loads | Medium (stale reads after edits) |

## Targets after fixes
Phone profile: LCP < 2.5 s, longest task < 200 ms, select card < 50 ms. Desktop first load < 2 MB. Re-run the same script and fill in an "after" column here.
