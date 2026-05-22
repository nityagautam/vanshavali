# Spec: About Page + Navigation

**Status**: Ready  
**Priority**: P0  
**Dependencies**: None

---

## Goal

Replace the current left sidebar with a dedicated `/about` route. The tree view becomes full-width. Navigation between tree and about is handled via a bottom nav bar on mobile and a header link on desktop.

---

## Data

### Keep in `src/data/family.json` → `meta`
These fields are already there and used by the tree — do not move them:
- `dynasty`, `gotra`, `subgotra`, `title`, `pageTitle`, `maintainer`, `blog`

### New file: `src/data/about.json`
Richer about-page content, independently editable without touching member data.

```json
{
  "description": "...",
  "descriptionHindi": "...",
  "disclaimer": "...",
  "disclaimerHindi": "...",
  "info": {
    "Village": "...",
    "District": "...",
    "State": "...",
    "Founded": "..."
  },
  "location": {
    "address": "...",
    "mapsUrl": "..."
  }
}
```

> **Migration**: Move `description`, `descriptionHindi`, `disclaimer`, `disclaimerHindi`, `info`, `location` from `family.json` meta into `about.json`. Update `Sidebar.jsx`, `PrintView.jsx`, and `App.jsx` imports accordingly. The `meta` object in `family.json` retains only tree-level fields.

---

## Routing

- Install `react-router-dom`
- Use `BrowserRouter` in `main.jsx`
- Two routes in `App.jsx`:
  - `/` → tree view (current App content)
  - `/about` → `<AboutPage />`
- Add `vercel.json` with SPA rewrite so `/about` doesn't 404:

```json
{
  "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
}
```

---

## Components

### New: `src/components/AboutPage.jsx`

Sections (top to bottom):

1. **Back button** — `← Back to Tree` — navigates to `/` via `useNavigate`
2. **Dynasty banner** — same gradient as current sidebar banner; shows dynasty name, gotra, subgotra, title
3. **Stats row** — Members · Generations · Living · Deceased (reads from `people` array passed as prop)
4. **Info table** — renders `about.info` key-value pairs
5. **Description** — language-aware using `pickLang(descriptionHindi, description, lang)`; `white-space: pre-wrap`
6. **Location** — address block + Google Maps link
7. **Disclaimer** — collapsible, language-aware
8. **Maintainer credit** — "With ❤ by {meta.maintainer}"

Props: `{ people, meta, about, lang }`

### New: `src/components/BottomNav.jsx`

- Visible only on mobile (`≤768px`), hidden via CSS on desktop
- Fixed to bottom of viewport, above any floating elements
- Two tabs: `🌳 Tree` (links to `/`) and `ℹ About` (links to `/about`)
- Active tab highlighted with saffron colour
- Height: 56px; safe-area padding for iPhone notch (`padding-bottom: env(safe-area-inset-bottom)`)
- `z-index: 50`

### Modified: `src/App.jsx`

- Wrap with `<BrowserRouter>` (or move to `main.jsx`)
- Add `<Routes>` with `/` and `/about`
- Remove `<Sidebar>` entirely
- Add `<BottomNav>` at root level (always rendered, CSS hides on desktop)
- Pass `about` data (imported from `about.json`) down to `AboutPage`
- Tree canvas now full-width (no sidebar flex sibling)

### Delete: `src/components/Sidebar.jsx`

- `DynastyInfoPanel` content moves to `AboutPage`
- `AddMemberForm` moves to `FloatingActions` (see floating-action-button spec)
- `printTree` function moves to a shared `src/utils/printTree.js`

---

## Navigation — Desktop & Mobile

- Header shows an "About" link next to the lang toggle on **all screen sizes**
- Clicking navigates to `/about`; active state highlighted on the About route
- On mobile the header About link and the BottomNav About tab both navigate to `/about` — both are intentional (header for quick reach, bottom nav for thumb-friendly access)

---

## CSS changes (`src/index.css`)

- Remove all `.sidebar*` styles
- Add `.bottom-nav`, `.bottom-nav-tab`, `.bottom-nav-tab.active`
- Add `.about-page` layout styles
- `.tree-section` becomes full width (no `flex` sibling)
- On mobile: `.tree-canvas { padding-bottom: 64px }` to clear bottom nav

---

## Open Questions

- None — all answered during scoping.

---

## Out of Scope (this spec)

- Tool buttons (Print, Export, Add Member) on About page — handled in floating-action-button spec
- Login gating — handled in login spec
