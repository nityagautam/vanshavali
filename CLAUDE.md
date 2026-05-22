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

The project is linked to Vercel project `nitya-narayan-gautams-projects/vanshavali`. Running `vercel --prod` uploads the source, runs `npm run build` on Vercel's servers, and promotes to production in one step. No separate `npm run build` needed locally before deploying.

No test suite or linter is configured.

### Data scripts

```bash
node scripts/backfill-motherid.js        # Adds motherId to people missing the key
node scripts/add-placeholder-spouses.js  # Adds placeholder spouse for parents with no spouseIds
```

Run both after adding new members to `family.json`. Order matters: run `backfill-motherid` first, then `add-placeholder-spouses`. Both scripts are idempotent.

## Architecture

**Vanshavali** is a React + Vite SPA for visualising and managing a Hindu family genealogy (वंशावली). No backend — all data lives in `src/data/`. Routing via `react-router-dom` (`BrowserRouter` in `main.jsx`), with a `vercel.json` SPA rewrite so `/about` doesn't 404.

### Data files

**`src/data/family.json`** — two top-level keys:

- **`meta`** — tree-level dynasty metadata only. Key fields: `pageTitle`, `dynasty`, `gotra`, `subgotra`, `title`, `lastUpdated`, `maintainer`, `blog`. Does NOT contain description, disclaimer, info, or location — those moved to `about.json`.

- **`people`** — flat array of person objects (248 real + 87 placeholders). Key fields:
  - `id` — unique slug (lookup key everywhere)
  - `parentId` — father/primary parent; drives the tree hierarchy
  - `motherId` — mother's person `id`; shown as a clickable chip in the detail panel. All people have this key (null if unknown). Backfill rule: defaults to `father.spouseIds[0]`.
  - `spouseIds` — bidirectional; both sides must list each other. Every parent has at least one entry (placeholder spouses auto-created).
  - `alive`, `born`, `died`, `dom`, `tags`, `photo`, `bio`, `occupation`, `location`
  - `tags`: `"placeholder"` = auto-generated unknown spouse (hides from stats, suppresses bio/occupation UI); `"root"` = legendary ancestor
  - **`alive` semantics**: `true` = living; anything else = deceased. Only `alive === true` counts as living.
  - **`photo`** paths must be relative to site root (e.g. `/photos/foo.jpg`), not `public/photos/foo.jpg`. Members without a real photo use a default DiceBear avatar URL (see below).

**`src/data/about.json`** — About page and print content, independently editable:
- `description` / `descriptionHindi` — long-form dynasty description
- `disclaimer` / `disclaimerHindi` — disclaimer text
- `info` — object rendered as a table (gotra details, etc.)
- `location` — object with `village`, `city`, `district`, `state`, `country`, `pin`

`\n` in description/disclaimer values is respected everywhere — `white-space: pre-wrap` in UI, `<br>` conversion in Print Tree HTML.

### Component tree

```
main.jsx (BrowserRouter)
└── App
    ├── PrintView          (hidden on screen; renders on window.print())
    ├── LoginModal         (overlay; triggered by FAB when not logged in)
    ├── header             (inline JSX — lang toggle + About NavLink)
    ├── Routes
    │   ├── / → app-body
    │   │   ├── tree-section
    │   │   │   ├── toolbar (search, filters, depth, zoom)
    │   │   │   ├── FamilyTree
    │   │   │   │   └── TreeNode (recursive)
    │   │   │   │       └── PersonCard (×1 primary + ×N spouses)
    │   │   │   │           └── Avatar
    │   │   │   └── MiniMap
    │   │   ├── DetailPanel  (shown when a person is selected)
    │   │   │   └── Avatar
    │   │   └── FloatingActions (FAB — all tools)
    │   └── /about → AboutPage
```

### Routing

- `/` — tree view (full width, no sidebar)
- `/about` — About page with dynasty info, stats, description, location, disclaimer
- `vercel.json` rewrites all paths to `index.html` for SPA support

### Key logic

**FloatingActions (FAB):**
- Fixed bottom-right (`position: fixed`), `bottom: 24px right: 24px`
- Main `⚙` button expands 5 action buttons vertically: 🔒/🔓 Login/Logout · ＋ Add Member · ↓ Export JSON · ⎙ Print Data · ⊞ Print Tree
- All actions except Login/Logout are gated behind `isLoggedIn`. Clicking a locked action triggers `onAuthRequired(fn)` which stores the pending action and opens `LoginModal`. After successful login the pending action executes automatically.
- `isLoggedIn` state lives in `App`, persisted to `sessionStorage` (clears on tab close)

**Login / auth (`src/utils/auth.js`):**
- SHA-256 hash of the family password hardcoded as `PASSWORD_HASH`. Plaintext never in code.
- `checkPassword(input)` — async, uses `window.crypto.subtle.digest`
- `isAuthenticated()` / `setAuthenticated()` / `clearAuth()` — read/write `sessionStorage` key `vv-auth`
- To change password: compute new SHA-256 hex digest and update `PASSWORD_HASH` in `auth.js`

**Language toggle (`lang` state in App):**
- 3-way pill in header: `हिं` (Hindi only, default) · `दो` (both) · `EN` (English only)
- Persisted to `localStorage` key `vv-lang`
- `pickLang(hindi, english, lang)` helper defined locally in `AboutPage.jsx`, `PrintView.jsx`, and `src/utils/printTree.js`; returns `{ primary, secondary }` — secondary is `null` for `'hi'` or `'en'`

**FamilyTree / TreeNode rendering:**
- `FamilyTree` builds `childrenMap` (parentId → children) and finds roots — people with no `parentId` not claimed as a spouse by another root.
- Each node: single `PersonCard` or "couple bubble" (primary + spouses with ⚭ badge).
- `depth` prop drives 4-colour generation accent (`--gen-color`). Palette: `#1a3a6b` → `#1a6b3a` → `#6b1a4a` → `#7a4a00`, cycling every 4 levels.
- `maxGen` (null = show all) force-collapses nodes at `depth >= maxGen - 1`. Toolbar **Depth** stepper controls this.

**Highlight / dimming:** `App` computes `highlightIds` (a `Set`) from search + active filters. Nodes not in set get `dimmed` class; matches get `highlighted`. Placeholder spouses follow their real partner for status/marriage filters but respect their own gender for gender filter.

**Toolbar filter pills:** Three pill groups (Gender / Status / Marriage) compose with search in `highlightIds` useMemo. Labels switch between Hindi and English based on `lang`.

**Print Data:** `window.print()` → `@media print` CSS hides app chrome, reveals `#print-view` (`PrintView` component). Cover reads from `about` prop (description, disclaimer, info, location). MiniMap hidden via CSS and `beforeprint` event listener.

**Print Tree:** `src/utils/printTree.js` — builds a coloured directory-style HTML tree, injects it as `#__vv_print_tree` overlay, calls `window.print()`, cleans up after 2s. Reads dynasty header from `meta`, content (description, disclaimer, info, location) from `about`.

**Export JSON:** `src/utils/exportJSON.js` — downloads in-memory `familyData` as `family.json` via object URL.

**Add Member:** `AddMemberForm` opens in a FAB modal overlay. Generates slug ID from name. POSTs to `/api/family` (always fails on static hosting) — user prompted to use Export JSON instead.

**Photo lightbox (`DetailPanel.jsx`):** Clicking the avatar (when `person.photo` set) opens a full-screen lightbox. Close via ✕, backdrop click, or Escape.

**Avatar (`src/components/Avatar.jsx`):** Falls back to styled initials if no photo or image fails.

**MiniMap (`src/components/MiniMap.jsx`):** Positioned absolutely in `.tree-section`. Returns `null` during print (`beforeprint`/`afterprint` events).

**About page (`src/components/AboutPage.jsx`):** Full-page route at `/about`. Shows stats (computed from `people`), description, gotra info table, location + Maps link, disclaimer. "← Back to Tree" button navigates to `/`.

**Credit line:** Tree area: `.tree-credit` (absolute, bottom-right of `.tree-section`) — hidden on mobile. About page: `.about-credit` at bottom of about body. Both read `meta.maintainer`.

### Styling

All CSS in `src/index.css` (single file, no CSS modules). CSS custom properties on `:root` for colour palette. Mobile breakpoint `≤768px`. Tree layout is pure CSS flexbox/`<ul><li>` — no third-party tree library.

### Utilities

- `src/utils/auth.js` — SHA-256 password check, sessionStorage auth state
- `src/utils/exportJSON.js` — download familyData as JSON
- `src/utils/printTree.js` — generate and print coloured text tree overlay
- `src/utils/tagColor.js` — djb2 hash → deterministic pastel HSL colour for tags

### Data source

`src/data/member-base.js` is the master source — a raw JS nested `{ name, children[] }` object. `family.json` is derived from it: assign IDs, compute `parentId`, infer gender from name suffixes (`(पुत्री)` = female, `(पुत्र)` = male). After rebuilding, run both data scripts in order.

### Default avatar photos

Real photos are stored under `public/photos/` and referenced as `/photos/<filename>` in `family.json`. Members without a real photo use a static DiceBear URL as their `photo` value:

- **Male default**: `https://api.dicebear.com/9.x/avataaars/svg?seed=lakshman-prasad&backgroundColor=d1d4f9`
- **Female default**: `https://api.dicebear.com/9.x/avataaars/svg?seed=priya&top=longButNotTooLong,bun,straight02&hairColor=2c1b18,4a312c&skinColor=ae5d29,d08b5b,edb98a&facialHairProbability=0&backgroundColor=ffffff`

These are the same URL for all males / all females respectively (not personalised). To update the default, do a bulk find-and-replace of the old URL in `family.json`. Placeholder spouses (`tags: ["placeholder"]`) are intentionally excluded from photo display in the UI.

### Adding / editing family data

Edit `src/data/family.json` directly. For about/dynasty content, edit `src/data/about.json`. The "Export JSON" FAB action exports current in-memory state (useful after using Add Member in the UI).
