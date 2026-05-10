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

Run both after adding new members to `family.json`. Order matters: run `backfill-motherid` first, then `add-placeholder-spouses` (which also back-fills `motherId` for children of newly-created placeholders). Both scripts are idempotent for existing entries — they only touch records missing the relevant data.

## Architecture

**Vanshavali** is a React + Vite single-page app for visualising and managing a Hindu family genealogy (वंशावली). There is no backend — all data lives in `src/data/family.json`.

### Data model (`src/data/family.json`)

Two top-level keys:

- **`meta`** — dynasty metadata (gotra, location, maintainer, disclaimers, etc.). Key fields:
  - `description` / `descriptionHindi` — English and Hindi long-form description of the dynasty
  - `disclaimer` / `disclaimerHindi` — English and Hindi disclaimer text
  - `maintainer` — shown as credit line "With ❤ by {maintainer}" in the tree area and sidebar
  - `info` — nested object rendered as a table in the sidebar and print outputs
  - `location` — nested object; rendered as address string + Google Maps link

- **`people`** — flat array of 335 person objects (248 real + 87 placeholders). Key fields:
  - `id` — unique slug (used as lookup key everywhere)
  - `parentId` — points to the father/primary parent; drives the tree hierarchy
  - `motherId` — points to the mother's person `id`; shown as a clickable **Mother** chip in the detail panel. All people have this key (null if unknown). Backfill rule: defaults to `father.spouseIds[0]` if available.
  - `spouseIds` — array of spouse IDs (bidirectional; both sides must list each other). Every person with children now has at least one entry — placeholder spouses (`tags: ["placeholder"]`) are created for parents with no recorded spouse.
  - `alive`, `born`, `died`, `dom` (date of marriage), `tags`, `photo`, `bio`, `occupation`, `location`
  - `tags`: special values — `"placeholder"` hides the person from stats, suppresses occupation/bio UI, and marks auto-generated placeholder spouses (named `"श्रीमती (अज्ञात)"` / `"श्री (अज्ञात)"`); `"root"` marks legendary ancestors
  - **`alive` semantics**: `true` = living; anything else (`false`, `null`, missing) = deceased. Only `alive === true` counts as living everywhere in the UI (stats, card styling, detail panel "Living" badge, Print Tree `स्व.` prefix).
  - **`photo`** paths must be relative to the site root (e.g. `/photos/foo.jpg`), NOT `public/photos/foo.jpg`. Vite serves `public/` at `/`.

### Component tree

```
App
├── PrintView          (hidden; renders on Cmd+P / window.print())
├── header             (inline JSX in App — includes lang toggle pill)
├── Sidebar
│   ├── AddMemberForm  (shown when "Add Member" tool is active)
│   └── DynastyInfoPanel (inline in Sidebar.jsx)
├── FamilyTree
│   └── TreeNode (recursive)
│       └── PersonCard (×1 primary + ×N spouses per node)
│           └── Avatar
└── DetailPanel        (shown when a person is selected)
    └── Avatar
```

### Key logic

**FamilyTree / TreeNode rendering:**
- `FamilyTree` builds a `childrenMap` (parentId → children array) and finds root nodes — people with no `parentId` that are not a spouse of another root-level person. Male roots are treated as primary; their `spouseIds` render as attached "couple bubbles".
- `TreeNode` recurses. Each node renders either a single `PersonCard` or a "couple bubble" (primary + spouses side-by-side with a ⚭ badge). Children are filtered to exclude people who list the current person as a spouse (avoids double-rendering spouses as children).
- Nodes are collapsible (local `collapsed` state per `TreeNode`).
- `depth` prop (0 = root) drives the 4-colour generation accent (`--gen-color` CSS variable on each `<li>`, rendered as a top stripe on `PersonCard`). Palette: `#1a3a6b` → `#1a6b3a` → `#6b1a4a` → `#7a4a00`, cycling every 4 levels.
- `maxGen` prop (from App state, `null` = show all) force-collapses nodes at `depth >= maxGen - 1`. A `+N` badge (absolutely positioned, out of flow) shows the hidden child count. The toolbar **Depth** stepper controls `maxGen`.
- `MiniMap` component (`src/components/MiniMap.jsx`) is positioned absolutely in `.tree-section` (not inside the scroll container). It reads `scrollLeft/Top/Width/Height` from `canvasRef`, re-reads on scroll, resize, and zoom change. Click navigates the viewport.

**Language toggle (`lang` state in App):**
- 3-way pill in the header: `हिं` (Hindi only, default) · `दो` (both) · `EN` (English only)
- Persisted to `localStorage` key `vv-lang`
- Controls which variant of `description`/`descriptionHindi` and `disclaimer`/`disclaimerHindi` is shown in: sidebar About panel, Print Data cover, Print Tree header
- `pickLang(hindi, english, lang)` helper defined in both `Sidebar.jsx` and `PrintView.jsx`; returns `{ primary, secondary }` — secondary is `null` when lang is `'hi'` or `'en'`
- All other content (names, gotra, member data) is unaffected by lang

**Credit line:**
- Tree area: `.tree-credit` (absolute, bottom-right of `.tree-section`) — hidden on mobile (`display: none` at ≤768px)
- Sidebar About panel: `.credit-line` (bottom border of `DynastyInfoPanel`)
- Both read `meta.maintainer`; render "With ❤ by {maintainer}"

**Toolbar filter pills:** Three compact pill groups dim non-matching nodes (same mechanism as search — preserves tree structure):
- Gender: सभी · पु · स्त्री (EN: All · Male · Female)
- Status: सभी · जी (जीवित) · मृ (मृत) (EN: All · Living · Deceased)
- Marriage: सभी · वि (विवाहित) · अवि (अविवाहित) (EN: All · Married · Unmarried)
- Labels switch automatically when `lang === 'en'`. Placeholders always pass (never dimmed). A ↺ reset button appears when any filter is active.
- State: `filterGender`, `filterStatus`, `filterMarriage` in `App`. All three compose with search inside the `highlightIds` useMemo.

**Search / highlight:** `App` computes `highlightIds` (a `Set`) from search + active filters. Nodes not in the set get `dimmed` class; matching nodes get `highlighted`.

**Add Member (sidebar):** `AddMemberForm` generates a slug ID from the name (strips Devanagari, lowercases, slugifies, appends a timestamp suffix). On submit it calls `onAddMember` in `App` (updates React state) and also POSTs to `/api/family` — this endpoint does not exist in the static build, so the write always fails gracefully and the user is prompted to use "Export JSON" instead.

**Export JSON:** Downloads the current in-memory `familyData` (merged `meta` + live `people` state) as `family.json` via a temporary object URL.

**Print Data:** Calls `window.print()` directly, which triggers the existing `@media print` CSS in `src/index.css` — hides app chrome, reveals `#print-view` (the `PrintView` component). Cover page shows: disclaimer, maintainer, dynasty title, gotra meta, location, description (language-aware), dynamic meta object sections, census stats.

**Print Tree:** Generates a directory-style text tree from the `people` array (no DOM rendering) and injects it into the current page as a print-only overlay div (`#__vv_print_tree`). Key details:
- Root detection: top-level people (`parentId: null`) keeping males always and females only if unclaimed as a spouse — avoids the bidirectional `spouseIds` trap where every person ends up in `allSpouseIds`.
- 4-colour depth palette (`#1a3a6b` navy → `#1a6b3a` green → `#6b1a4a` burgundy → `#7a4a00` amber) cycling per generation.
- Deceased members (`alive !== true`, not `placeholder`) are shown with `स्व.` prefix (स्वर्गीय — traditional Hindu "departed") in gray (`#888`).
- Trunk segments (`│   `) are coloured with their own generation's colour; connectors (`├─`/`└─`) and names share the node's colour.
- Header includes: disclaimer block (language-aware, red border), dynasty title, gotra info table from `meta.info`, description block (language-aware, gold border), legend explaining `स्व.`.
- `nl(s)` helper: HTML-escapes a string and converts `\n` to `<br>` for inline HTML blocks.
- Footer includes the blog URL from `meta.blog`.
- `@media print { body > * { display: none !important } #__vv_print_tree { display: block !important } }` injected as a `<style>` tag; cleaned up 2 s after `window.print()` returns.

**Photo lightbox (`DetailPanel.jsx`):** Clicking the avatar in the detail panel (only when `person.photo` is set) opens a full-screen lightbox overlay. A ⊕ zoom hint appears on hover. Close via ✕ button, clicking the backdrop, or Escape key. Lightbox is scoped inside `<aside class="detail-panel">` using `position: fixed`.

**Avatar (`src/components/Avatar.jsx`):** Falls back to styled initials (श्री / श्रीमती for Devanagari names, initials for Latin) if no `person.photo` is set or the image fails to load.

**Tag colours (`src/utils/tagColor.js`):** djb2-style hash of the tag string → deterministic pastel HSL colour.

### Styling

All CSS is in `src/index.css` (single file, no CSS modules). CSS custom properties (defined on `:root`) are used for the colour palette — `--gold`, `--saffron`, `--text-muted`, etc. The tree layout is pure CSS flexbox/`<ul><li>` — no third-party tree library.

Mobile breakpoint at `≤768px`: toolbar fixed height removed (becomes `min-height`) so zoom/depth controls are always reachable; legend hidden; touch targets enlarged to 32px; tree-credit hidden.

### Data source

`src/data/member-base.js` is the **master source** for the family member list. It is a raw JS object with a nested `{ name, children[] }` structure rooted at "श्री हृदयी राम". It does not contain IDs, parentIds, gender, dates, or any schema fields — just names and parent-child relationships.

`src/data/family.json` is the **app data file** derived from the master source. When the master source is updated, `family.json` must be rebuilt: assign slugified IDs, compute `parentId` for each member by tracing the nested tree, infer gender from name suffixes (`(पुत्री)` = female, `(पुत्र)` = male), and leave all unknown fields (`born`, `died`, `bio`, etc.) as `null`. Entries marked `(-1)` in the source died early; `(1)`/`(2)` suffixes indicate which wife's child in multi-wife households.

After rebuilding, run both data scripts in order:
1. `node scripts/backfill-motherid.js` — populates `motherId` from `father.spouseIds[0]`
2. `node scripts/add-placeholder-spouses.js` — creates placeholder spouses for parents with no `spouseIds`, then updates children's `motherId` to point to the new placeholder

### Adding / editing family data

Edit `src/data/family.json` directly. The app hot-reloads in dev. For production, run `npm run build` and redeploy `dist/`. The "Export JSON" button in the sidebar exports the current in-memory state (useful after using "Add Member" in the UI, since the `/api/family` write endpoint is unavailable in static hosting).

`\n` in `description`, `descriptionHindi`, `disclaimer`, `disclaimerHindi` values is respected everywhere — `white-space: pre-wrap` in the UI, `<br>` conversion in Print Tree HTML.
