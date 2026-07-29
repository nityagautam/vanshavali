# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev       # Start dev server (Vite, http://localhost:5173)
npm run build     # Production build → dist/
npm run preview   # Preview production build locally
```

### Deploying to Vercel

```bash
vercel --prod     # Build and deploy to production (https://vanshavali-ten.vercel.app)
```

The project is linked to Vercel project `nitya-narayan-gautams-projects/vanshavali`. `vercel --prod` uploads the local working tree, runs `npm run build` on Vercel's servers, and promotes to production in one step — it is **not** triggered by pushing to GitHub (`origin/main` is source-of-truth history, but deploys are always a manual `vercel --prod` from the CLI). No separate local `npm run build` needed first.

No test suite or linter is configured.

### Vercel Hobby plan: 12-function cap

The project is on the Hobby plan, which caps a single deployment at **12 Serverless Functions**. Every file directly under `api/` (and its subdirectories) counts as one function, *except* files/folders under `api/_lib/` (underscore-prefixed, excluded from routing). Currently at **10/12** — check before adding a new `api/*.js` file:

```bash
find api -type f -name "*.js" | grep -v "/_lib/" | wc -l
```

If a new endpoint would push past 12, fold it into an existing file instead of adding one, dispatched by a body field or query param — see `api/invite.js` (four routes consolidated into one, aliased back to their original `/api/invite/status|generate|reset|consume` paths via `vercel.json` rewrites) and `api/family/edit.js` (normal field-edit vs. sibling-reorder dispatched via a `move` body field). This has already broken a deploy once (`deploy_failed: No more than 12 Serverless Functions...`) — don't reintroduce it.

### Data scripts

Two generations of scripts exist — JSON-file scripts operate on `src/data/family.json` (used only when regenerating the bundled seed data from `member-base.js`); `-db.js` scripts operate on the live Neon Postgres table and are what you actually want for any live data fix:

```bash
node scripts/backfill-motherid.js            # family.json: adds motherId to people missing the key
node scripts/add-placeholder-spouses.js      # family.json: adds placeholder spouse for parents with no spouseIds
node scripts/sort-placeholder-spouses.js     # family.json: reorders so each placeholder spouse sits right after their real partner
node scripts/sort-family.cjs                 # review-only: emits src/data/ordered-family.json as a nested tree (does NOT write family.json)

node --env-file=.env.local scripts/backfill-motherid-db.js           # same, against live Postgres
node --env-file=.env.local scripts/add-placeholder-spouses-db.js     # same, against live Postgres
node --env-file=.env.local scripts/migrate-to-postgres.js            # ⚠ DROPs and reseeds the whole `people` table from family.json — one-time bootstrap only, never rerun against a live-edited DB
```

Run the JSON pair in order (`backfill-motherid` → `add-placeholder-spouses`) after regenerating `family.json` from `member-base.js`. All are idempotent except `migrate-to-postgres.js`, which is destructive by design (see its docstring). To target production specifically rather than whatever `.env.local` points at: `vercel env pull .env.production.local --environment=production` first, then pass that file to `--env-file`.

## Architecture

**Vanshavali** is a React + Vite SPA for visualising and managing a Hindu family genealogy (वंशावली), backed by Vercel Serverless Functions, Neon Postgres, Upstash Redis, and Vercel Blob. Routing via `react-router-dom` (`BrowserRouter` in `main.jsx`), with a `vercel.json` rewrite so `/about` doesn't 404 and four rewrites aliasing the invite routes onto `api/invite.js` (see the function-cap note above).

### Data: bundled seed vs. live datastore

- **`src/data/family.json`** ships in the build as an instantly-rendered snapshot (`meta` + `people`), then `App.jsx` fetches `/api/family` on load and swaps `people` for whatever's actually live in Postgres. `meta` is **never** written by the app — it's hand-edited in `family.json` and shipped on the next `vercel --prod`, per the comment in `api/_lib/db.js`.
- **Neon Postgres `people` table** is the real source of truth for `people` once the app has loaded. Schema: same fields as the JSON shape (`id`, `name`, `gender`, `born`, `died`, `dom`, `alive`, `parent_id`, `mother_id`, `spouse_ids` JSONB, `occupation`, `location`, `bio`, `photo`, `tags` JSONB) plus `sort_order NUMERIC` — see "Ordering" below for why it's `NUMERIC` and not `INTEGER`.
- **`src/data/about.json`** — About page and print content, independently hand-edited, never touched by the app:
  - `description` / `descriptionHindi` — long-form dynasty description
  - `disclaimer` / `disclaimerHindi` — disclaimer text
  - `info` — object rendered as a table (gotra details, etc.)
  - `location` — object with `village`, `city`, `district`, `state`, `country`, `pin`

  `\n` in description/disclaimer values is respected everywhere — `white-space: pre-wrap` in UI, `<br>` conversion in Print Tree HTML.

Person fields not otherwise noted: `tags`: `"placeholder"` = auto-generated *unknown spouse* — a real person (they have children) whose life data is missing, so bio/occupation UI is suppressed and they're excluded from photo display. **Stats semantics**: placeholders *are* counted in the "Members" total (`people.length`, in both the main-page pill and About/Print census) since they were real members, but they're bucketed as **"Unknown"** rather than forced into Living/Deceased — so `Living + Deceased + Unknown === Members`, where Living/Deceased are computed only over non-placeholder people. The "Unknown" tile/row only renders when `unknownCount > 0`, so filling in a placeholder's real data (dropping the tag) auto-shifts them into Living/Deceased with no code change. `"root"` = legendary ancestor. **`alive` semantics**: `true` = living; anything else = deceased. **`photo`** paths are relative to site root (`/photos/foo.jpg`) or a full Blob/DiceBear URL — never `public/photos/foo.jpg`.

### Ordering (`sort_order`)

Sibling render order (who shows first under a given parent) is driven entirely by the `sort_order` column — `getFamilyData()` in `api/_lib/db.js` always does `ORDER BY sort_order`, and `FamilyTree.jsx` groups children by `parentId` while preserving that relative order. It's `NUMERIC`, not `INTEGER`, specifically so a new value can be inserted *between* two existing adjacent values (e.g. `5.5` between siblings `5` and `6`) without renumbering anyone else.

- **Adding a member**: `AddMemberForm`'s "Position" picker (add-only, not shown when editing) sends an optional `insertAfterId` — `''`/omitted = append as youngest (default), `'__first__'` (the `FIRST_SIBLING` sentinel, mirrored server-side as `INSERT_AS_FIRST_SIBLING`) = insert as eldest, or an existing sibling's id = insert immediately after them. `computeInsertSortOrder()` in `api/_lib/db.js` bisects between the two neighboring siblings.
- **Repositioning an existing member**: `DetailPanel`'s Move Up/Down buttons (admin-only, shown when the person has siblings) POST `{ id, move: 'up'|'down' }` to `api/family/edit.js`, which calls `moveSibling()` — a pairwise `sort_order` swap with the adjacent sibling, not a bisection. No-ops (`{ moved: false }`) at the first/last boundary rather than erroring; the UI disables the button in that case using the `sortOrder` field `getFamilyData()` returns on every person (read-only — stripped on any write path since `personSchema` in `api/_lib/familySchema.js` doesn't define it). The raw `sortOrder` value is only surfaced in `DetailPanel` when `isAdmin` — non-admins never see it.
- Editing a person's other fields never touches `sort_order` (`upsertPeople`'s `ON CONFLICT DO UPDATE` never sets it).
- `upsertPeople(people, { sortOrderOverrides })` accepts an optional `{ [id]: number }` map to place a *new* row somewhere other than the default append; existing rows always keep their stored value regardless.

### Auth

Server-side sessions (HTTP-only cookie), not client-side-only — `src/utils/auth.js` is now a thin wrapper around `api/auth/*`, not the source of truth:

- **Password login** — `api/auth/login.js` checks against `PASSWORD_HASH` (SHA-256, env var, plaintext never in code) and sets a signed session cookie via `api/_lib/session.js`. Always admin-level.
- **Google OAuth** — `api/auth/google/login.js` (redirect to Google) + `api/auth/google/callback.js` (exchange code, check `ALLOWED_EMAILS` via `api/_lib/allowlist.js`, set session cookie). Admin-level only if the email is allowlisted.
- **Invite links** — one-time links redeemed via `api/invite.js` (`?action=consume`, aliased from `/api/invite/consume`), backed by Upstash Redis (`api/_lib/inviteStore.js`, atomic `SET NX` to prevent double-redemption). Sets a session, but `method: 'invite'` — logged in, **not** admin.
- **`requireSession(req)`** (`api/_lib/requireSession.js`) — any valid session, used by `api/family.js`'s POST (add member: password, Google-admin, *or* invite-redeemed can all add members).
- **`requireAdminSession(req)`** — valid session *and* `method !== 'invite'`. Used by `api/family/edit.js` (edit/reorder), `api/invite.js`'s generate/reset/status actions, `api/photo-upload.js`.
- **Session expiry varies by login method** — `SESSION_MAX_AGE_BY_METHOD` in `api/_lib/session.js`: Google = 7 days, password & invite = 1 day (falling back to the password value for any unknown method). `createSessionToken({ method })` returns `{ token, maxAge }` and stamps `exp` into the token body from the same `maxAge`, so the cookie's `Max-Age` and the token's own embedded expiry always agree.
- Client state: `isLoggedIn` + `isAdmin` in `App.jsx`, `isLoggedIn` persisted to `sessionStorage` (`vv-auth`, clears on tab close); `isAdmin` is re-derived from `checkSession()` on load, not persisted independently.

### Photos & backups (Vercel Blob)

- **Uploads**: `AddMemberForm`'s photo field uses `@vercel/blob/client`'s `upload()`, which requests a token from `api/photo-upload.js` (admin-only) then uploads directly from the browser to Blob — the file body never transits the serverless function.
- **Nightly backup**: `api/cron/backup.js`, scheduled via `vercel.json`'s `crons` (`0 3 * * *`, Hobby's daily-only limit), auth'd by `CRON_SECRET` bearer token. Snapshots `getFamilyData()` to `backups/family-<timestamp>.json` in Blob (`access: 'public'`), then prunes down to the newest 7 (count-based, not date-based, so a missed run doesn't wipe backups still inside the window). `contentType` is explicitly `application/json; charset=utf-8` — omitting the charset previously made browsers viewing the raw URL misdecode the Devanagari text as Latin-1 (mojibake) even though the underlying UTF-8 bytes were always correct.

### Component tree

```
main.jsx (BrowserRouter)
└── App
    ├── PrintView          (hidden on screen; renders on window.print())
    ├── LoginModal         (Radix Dialog; triggered by FAB or any gated action when not logged in)
    ├── header             (inline JSX — lang toggle, theme toggle, About NavLink, UserBadge)
    ├── Routes
    │   ├── / → app-body
    │   │   ├── tree-section
    │   │   │   ├── toolbar (search, Ctrl/Cmd+K trigger, filters, depth, zoom, view-mode toggle)
    │   │   │   ├── OnboardingLegend      (dismissible first-visit card, localStorage-persisted)
    │   │   │   ├── FamilyTree (viewMode === 'tree')
    │   │   │   │   └── TreeNode (recursive)
    │   │   │   │       └── PersonCard (×1 primary + ×N spouses)
    │   │   │   │           └── Avatar
    │   │   │   ├── MobileTreeView (viewMode === 'list' — opt-in drill-down, not auto-switched by screen size)
    │   │   │   └── MiniMap
    │   │   ├── DetailPanel  (shown when a person is selected; Edit + Move Up/Down when isAdmin)
    │   │   │   └── Avatar
    │   │   ├── CommandPalette (Ctrl/Cmd+K jump-to-person)
    │   │   └── FloatingActions (FAB — all tools)
    │   │       ├── AddMemberForm  (Modal)
    │   │       └── InviteManager  (Modal, admin-only)
    │   └── /about → AboutPage
```

`Modal.jsx` is a shared Radix `Dialog` wrapper used by `AddMemberForm`'s FAB modal, `LoginModal`, and `InviteManager` — Radix renders `Dialog.Overlay`/`Dialog.Content` as siblings (not nested), so their CSS self-centers via `position: fixed` + `transform: translate(-50%,-50%)` rather than relying on a flex-centering wrapper.

### Routing

- `/` — tree view (full width, no sidebar)
- `/about` — About page with dynasty info, stats, description, location, disclaimer
- `vercel.json` rewrites `/about` to `index.html` (SPA support) plus the four invite-route aliases noted above

### Key logic

**Theme (light/dark):** `theme` state in `App.jsx` (`null` = follow system, `'light'`/`'dark'` = explicit override), persisted to `localStorage('vv-theme')`. `isDark = theme ? theme === 'dark' : systemDark` (system preference via `matchMedia`). Toggled via the header's Sun/Moon button; applies `data-theme` attribute on `<html>`. CSS: `@media (prefers-color-scheme: dark) :root:not([data-theme="light"])` for the system-follow case, `:root[data-theme="dark"]` for the explicit override — both must be kept in sync when adding new themed colors, or a color that's correct in one path silently breaks in the other (this exact bug happened with hardcoded card backgrounds).

**View mode (tree/list):** `viewMode` state (`'tree'` default, `'list'` = `MobileTreeView`'s tap-to-drill-down layout), persisted to `localStorage('vv-view-mode')`, toggled via a toolbar button next to zoom controls. Available at any width — not auto-switched by screen size (an earlier auto-detect-by-`matchMedia` approach was explicitly replaced with a manual toggle per user preference).

**Command palette (Ctrl/Cmd+K):** `CommandPalette.jsx`, opened via the `k`/`K` keydown handler in `App.jsx` or the toolbar's `.cmdk-trigger` button. Searches all people (not capped to 8 except in the empty-query "browse" state — active searches show up to 50 with a truncation footnote), selecting scrolls the tree to `[data-person-id]` via `CSS.escape()` + `scrollIntoView`.

**FloatingActions (FAB):** Fixed bottom-right. Main `⚙` button expands action buttons: Login/Logout · Add Member · Invite Link (hidden once a non-admin session confirms it can't manage invites) · Export JSON · Print Data · Print Tree. All but Login/Logout are gated behind `isLoggedIn` — `onAuthRequired(fn)` stores the pending action and opens `LoginModal`; it auto-runs after successful login. Edit Member is **not** in the FAB — it's the pencil icon in `DetailPanel`, admin-only.

**FamilyTree / TreeNode rendering:** `FamilyTree` builds `childrenMap` (parentId → children, order preserved from the `sort_order`-sorted `people` array) and finds roots — people with no `parentId` not claimed as a spouse by another root. Each node: single `PersonCard` or "couple bubble" (primary + spouses with ⚭ badge). `depth` drives a 4-colour generation accent (`--gen-color`), cycling every 4 levels. `maxGen` (null = show all) force-collapses nodes at `depth >= maxGen - 1` via the toolbar **Depth** stepper.

**Highlight / dimming:** `App` computes `highlightIds` (a `Set`) from search + active filters. Nodes not in set get `dimmed`; matches get `highlighted`. Placeholder spouses follow their real partner for status/marriage filters but respect their own gender for gender filter.

**Add Member:** `AddMemberForm` (in a FAB `Modal`) generates a slug ID from the name, POSTs to `/api/family` (any logged-in session — see Auth). Also used, in edit mode, by `DetailPanel`'s pencil icon → `App.jsx`'s `handleEditMember` → `/api/family/edit`. The **Mother** field is a dropdown whose options are *the selected father's own `spouseIds`* (so a child's mother must be one of the father's wives) — it only appears once a father is picked and that father has at least one spouse, auto-selects when there's exactly one, and writes `motherId`. The Position picker's sibling/root grouping mirrors `DetailPanel`'s `isGenuineRoot()` logic (see below) so an unattached new root isn't grouped with married-in/placeholder spouses.

**DetailPanel children & siblings:** Children shown for a person depend on which side of the couple they are — if the person is ever some other person's `parentId` (the primary/father-line parent), they see *every* child across all spouses; otherwise they see only children whose `motherId` points at them, so with multiple wives each one sees just her own kids. Sibling grouping (for Move Up/Down eligibility) uses `isGenuineRoot()` — mirroring `FamilyTree.jsx`'s root detection — so only real root ancestors compare against other roots; a married-in or placeholder spouse correctly shows no siblings and no Move Up/Down.

**Photo lightbox (`DetailPanel.jsx`):** Clicking the avatar (when `person.photo` set) opens a full-screen lightbox (Radix Dialog). Close via ✕, backdrop click, or Escape.

**Avatar (`src/components/Avatar.jsx`):** Falls back to styled initials if no photo or image fails.

**MiniMap (`src/components/MiniMap.jsx`):** Positioned absolutely in `.tree-section`; hidden during `viewMode === 'list'` and print (`beforeprint`/`afterprint`).

**About page:** Full-page route at `/about`. Stats computed from `people`, "How to Read the Tree" legend, description, gotra info table, location + Maps link, disclaimer.

**Print Data / Print Tree / Export JSON:** unchanged from static-SPA days — `window.print()` reveals `PrintView`; `src/utils/printTree.js` builds a directory-style overlay; `src/utils/exportJSON.js` downloads in-memory `familyData` (useful after live edits, since the bundled `family.json` in the repo doesn't auto-update from Postgres writes).

### Styling

All CSS in `src/index.css` (single file, no CSS modules). CSS custom properties on `:root` for the color palette, plus a design-token scale (spacing/type/radius/shadow/z-index). Mobile breakpoint `≤768px`. Tree layout is pure CSS flexbox/`<ul><li>` — no third-party tree library. `lucide-react` for icons (tree-shaken). Devanagari text relies on font-family fallback pairing (`Noto Sans/Serif Devanagari` alongside Inter/Playfair Display in `index.html`'s Google Fonts link) — fallback is per-glyph, so mixed Hindi/Latin renders correctly without extra markup.

### Utilities

- `src/utils/auth.js` — thin client wrapper around `api/auth/*` (login/logout/session check), sessionStorage flag
- `src/utils/familyApi.js` — `fetchFamilyData`, `addFamilyMember`, `editFamilyMember`, `moveSibling`
- `src/utils/inviteApi.js` — status/generate/reset/consume against `api/invite.js`
- `src/utils/exportJSON.js` — download in-memory `familyData` as JSON
- `src/utils/printTree.js` — generate and print coloured text tree overlay
- `src/utils/tagColor.js` — djb2 hash → deterministic pastel HSL colour for tags

### Data source (bundled seed)

`src/data/member-base.js` is the master source for a from-scratch rebuild — a raw JS nested `{ name, children[] }` object. `family.json` is derived from it: assign IDs, compute `parentId`, infer gender from name suffixes (`(पुत्री)` = female, `(पुत्र)` = male). After rebuilding, run the JSON-file data scripts in order, then `migrate-to-postgres.js` if this is meant to replace live production data (⚠ destructive — see Data scripts above).

### Default avatar photos

Real photos are stored under `public/photos/` (repo-bundled) or Vercel Blob (uploaded via Add Member), referenced as `/photos/<filename>` or a full Blob URL in the person's `photo` field. Members without a real photo use a static DiceBear URL:

- **Male default**: `https://api.dicebear.com/9.x/avataaars/svg?seed=lakshman-prasad&backgroundColor=d1d4f9`
- **Female default**: `https://api.dicebear.com/9.x/avataaars/svg?seed=priya&top=longButNotTooLong,bun,straight02&hairColor=2c1b18,4a312c&skinColor=ae5d29,d08b5b,edb98a&facialHairProbability=0&backgroundColor=ffffff`

Same URL for all males / all females respectively (not personalised). Placeholder spouses (`tags: ["placeholder"]`) are intentionally excluded from photo display in the UI.

### Adding / editing family data

Prefer the live app (Add Member / Edit Member / Move Up-Down, all backed by Postgres) over hand-editing `family.json` — the JSON file is only the initial-paint snapshot and is **not** kept in sync with live writes. Use Export JSON after live edits if you want an updated snapshot to commit back into the repo. For about/dynasty content (never live-editable), edit `src/data/about.json` directly and redeploy.
