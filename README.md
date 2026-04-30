# Vanshavali — Gautam Dynasty Family Tree

An interactive family tree web application for the Gautam dynasty, Ghurehata village, Mauganj, Rewa, Madhya Pradesh. Traces the lineage from Maharishi Gautam through ~243 recorded members across present generations.

## Running locally

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # production build → dist/
npm run preview  # preview production build locally
```

## Project structure

```
Vanshavali/
├── src/
│   ├── data/
│   │   ├── family.json       ← App data (edit to update the tree)
│   │   └── member-base.js    ← Master source: nested name/children list
│   ├── components/
│   │   ├── FamilyTree.jsx    ← Tree layout, root detection, childrenMap
│   │   ├── TreeNode.jsx      ← Recursive node (person + couple bubble + children)
│   │   ├── PersonCard.jsx    ← Card shown in the tree
│   │   ├── DetailPanel.jsx   ← Right-side detail view on click
│   │   ├── Sidebar.jsx       ← Left toolbar (About, Add Member, Export, Print)
│   │   ├── AddMemberForm.jsx ← Form for adding a new member
│   │   ├── Avatar.jsx        ← Photo with DiceBear fallback
│   │   └── PrintView.jsx     ← Print-only layout (Cmd+P)
│   ├── utils/
│   │   └── tagColor.js       ← djb2 hash → deterministic pastel tag colour
│   ├── App.jsx
│   └── index.css             ← All styles (single file, CSS custom properties)
└── README.md
```

## Features

- **Interactive tree** — org-chart style, pure CSS flexbox (no third-party tree library)
- **Couple bubbles** — spouses shown side-by-side with a ⚭ badge
- **Collapsible nodes** — expand/collapse any branch
- **Zoom** — toolbar +/− buttons, Ctrl+Scroll, Ctrl+= / Ctrl+− / Ctrl+0
- **Search & highlight** — dim non-matching nodes, highlight matches by name or occupation
- **Detail panel** — click any person to see full profile: dates, occupation, location, bio, date of marriage, and any extra custom fields added to the JSON
- **Family relations** — Father, Mother, Spouse, Children, Siblings shown as clickable chips
- **Add Member** — sidebar form to add a new person (updates in-memory state; use Export JSON to persist)
- **Export JSON** — downloads current in-memory tree as `family.json`
- **Print view** — clean printable layout via Cmd+P or the print button
- **Dynasty Info** — sidebar panel showing gotra, location, member stats

## Data model (`src/data/family.json`)

Two top-level keys: `meta` (dynasty metadata) and `people` (flat array).

### Person fields

```json
{
  "id":         "unique-slug",          // e.g. "ram-prasad"
  "name":       "Full Name",
  "gender":     "male",                 // "male" | "female" | null
  "born":       "Mar 1943",             // string, year, or null
  "died":       "23 April 2011",        // string, year, or null
  "dom":        "15 Feb 2020",          // date of marriage (optional)
  "alive":      false,                  // true | false | null (unknown)
  "parentId":   "father-id",            // drives tree hierarchy; null for roots
  "motherId":   "mother-id",            // optional; shown as Mother chip in detail panel
  "spouseIds":  ["spouse-id"],          // bidirectional — both sides must list each other
  "occupation": "Retired Captain",
  "location":   "Ghurehata, Mauganj",
  "bio":        "Short biography…",
  "photo":      "https://…",            // URL; DiceBear avatar used as fallback
  "tags":       ["elder"]               // see tag table below
}
```

Any field not in the list above (e.g. `education`, `phone`, `dom`) is automatically rendered as an extra row in the Details section of the panel with a human-readable label.

### Tags

| Tag | Meaning |
|-----|---------|
| `placeholder` | Data not yet filled in — hidden from member stats |
| `legendary` | Mythological / ancient ancestor |
| `root` | Marks the lineage root node |
| `elder` | Senior family figure |
| `verified-source` | Confirmed by a family history source |
| `author` | Blog / record author |
| `died-early` | Died in childhood |
| Any other string | Rendered with a deterministic pastel colour |

### Data source

`src/data/member-base.js` is the **master source** — a raw nested `{ name, children[] }` JS object with no IDs or schema. When updating the tree from this source:

1. Assign a slugified `id` to each entry
2. Compute `parentId` by tracing the nesting
3. Infer gender from name suffixes: `(पुत्री)` = female, `(पुत्र)` = male
4. Mark `(-1)` entries as `alive: false` with tag `died-early`
5. Leave all unknown fields as `null`

### Adding a member manually

1. Open `src/data/family.json`
2. Append a new object to `"people"`
3. Set `"parentId"` to the father's `"id"`
4. For spouses: add each other's IDs to both `"spouseIds"` arrays
5. Save — the dev server hot-reloads automatically

## Deployment (free)

### Vercel (recommended)

```bash
npm i -g vercel
npm run build
vercel
```

Or connect your GitHub repo at [vercel.com](https://vercel.com) — auto-deploys on every push.

### Netlify

```bash
npm run build
# drag-and-drop dist/ at netlify.com, or:
npm i -g netlify-cli
netlify deploy --dir=dist --prod
```

### GitHub Pages

```bash
npm install -D gh-pages
# add "deploy": "gh-pages -d dist" to package.json scripts
npm run build && npm run deploy
# then enable Pages in repo Settings → Pages → branch: gh-pages
```
