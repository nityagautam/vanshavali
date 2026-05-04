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

## Architecture

**Vanshavali** is a React + Vite single-page app for visualising and managing a Hindu family genealogy (वंशावली). There is no backend — all data lives in `src/data/family.json`.

### Data model (`src/data/family.json`)

Two top-level keys:

- **`meta`** — dynasty metadata (gotra, location, maintainer, disclaimers, etc.). Displayed in the Dynasty Info sidebar panel; fields are rendered dynamically (primitives → rows, nested objects → sections).
- **`people`** — flat array of person objects. Key fields:
  - `id` — unique slug (used as lookup key everywhere)
  - `parentId` — points to the father/primary parent; drives the tree hierarchy
  - `spouseIds` — array of spouse IDs (bidirectional; both sides must list each other)
  - `alive`, `born`, `died`, `dom` (date of marriage), `tags`, `photo`, `bio`, `occupation`, `location`
  - `motherId` — optional, points to the mother's person `id`; shown as a clickable **Mother** chip in the Family section of the detail panel (alongside `parentId` which is the father)
  - `tags`: special values — `"placeholder"` hides the person from stats and suppresses some UI; `"root"` marks legendary ancestors
  - **`alive` semantics**: `true` = living; anything else (`false`, `null`, missing) = deceased. Only `alive === true` counts as living everywhere in the UI (stats, card styling, detail panel "Living" badge, Print Tree `स्व.` prefix).

### Component tree

```
App
├── PrintView          (hidden; renders on Cmd+P / window.print())
├── header             (inline JSX in App)
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

**Search / highlight:** `App` computes `highlightIds` (a `Set`) from the search string. Nodes not in the set get `dimmed` class; matching nodes get `highlighted`.

**Add Member (sidebar):** `AddMemberForm` generates a slug ID from the name (strips Devanagari, lowercases, slugifies, appends a timestamp suffix). On submit it calls `onAddMember` in `App` (updates React state) and also POSTs to `/api/family` — this endpoint does not exist in the static build, so the write always fails gracefully and the user is prompted to use "Export JSON" instead.

**Export JSON:** Downloads the current in-memory `familyData` (merged `meta` + live `people` state) as `family.json` via a temporary object URL.

**Print Data:** Calls `window.print()` directly, which triggers the existing `@media print` CSS in `src/index.css` — hides app chrome, reveals `#print-view` (the `PrintView` component).

**Print Tree:** Generates a directory-style text tree from the `people` array (no DOM rendering) and injects it into the current page as a print-only overlay div (`#__vv_print_tree`). Key details:
- Root detection: top-level people (`parentId: null`) keeping males always and females only if unclaimed as a spouse — avoids the bidirectional `spouseIds` trap where every person ends up in `allSpouseIds`.
- 4-colour depth palette (`#1a3a6b` navy → `#1a6b3a` green → `#6b1a4a` burgundy → `#7a4a00` amber) cycling per generation.
- Deceased members (`alive !== true`, not `placeholder`) are shown with `स्व.` prefix (स्वर्गीय — traditional Hindu "departed") in gray (`#888`).
- Trunk segments (`│   `) are coloured with their own generation's colour; connectors (`├─`/`└─`) and names share the node's colour.
- Header includes: disclaimer block (Hindi + English, red border), dynasty title, gotra info table from `meta.info`, legend explaining `स्व.`.
- Footer includes the blog URL from `meta.blog`.
- `@media print { body > * { display: none !important } #__vv_print_tree { display: block !important } }` injected as a `<style>` tag; cleaned up 2 s after `window.print()` returns.

**Avatar (`src/components/Avatar.jsx`):** Falls back to a DiceBear SVG URL if no `person.photo` is set.

**Tag colours (`src/utils/tagColor.js`):** djb2-style hash of the tag string → deterministic pastel HSL colour.

### Styling

All CSS is in `src/index.css` (single file, no CSS modules). CSS custom properties (defined on `:root`) are used for the colour palette — `--gold`, `--saffron`, `--text-muted`, etc. The tree layout is pure CSS flexbox/`<ul><li>` — no third-party tree library.

### Data source

`src/data/member-base.js` is the **master source** for the family member list. It is a raw JS object with a nested `{ name, children[] }` structure rooted at "श्री हृदयी राम". It does not contain IDs, parentIds, gender, dates, or any schema fields — just names and parent-child relationships.

`src/data/family.json` is the **app data file** derived from the master source. When the master source is updated, `family.json` must be rebuilt: assign slugified IDs, compute `parentId` for each member by tracing the nested tree, infer gender from name suffixes (`(पुत्री)` = female, `(पुत्र)` = male), and leave all unknown fields (`born`, `died`, `bio`, etc.) as `null`. Entries marked `(-1)` in the source died early; `(1)`/`(2)` suffixes indicate which wife's child in multi-wife households.

### Adding / editing family data

Edit `src/data/family.json` directly. The app hot-reloads in dev. For production, run `npm run build` and redeploy `dist/`. The "Export JSON" button in the sidebar exports the current in-memory state (useful after using "Add Member" in the UI, since the `/api/family` write endpoint is unavailable in static hosting).
