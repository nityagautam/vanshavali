# Vanshavali — Gautam Dynasty Family Tree

An interactive family tree web application for the Gautam dynasty, Ghurehata village, Mauganj, Rewa, Madhya Pradesh.

## Running locally

```bash
npm install
npm run dev
```

Open http://localhost:5173

## Editing the family data

All family data lives in **`src/data/family.json`**. Edit this file to add/update members.

### Person object fields

```json
{
  "id": "unique-id",           // unique string, no spaces (e.g. "ram-prasad-1")
  "name": "Full Name",         // shown on the card
  "gender": "male",            // "male" or "female"
  "born": 1920,                // year (number) or "YYYY-MM-DD" or null
  "died": 1985,                // year or null
  "alive": false,              // true = living, false = deceased
  "parentId": "father-id",     // id of the father (null for root ancestor)
  "spouseIds": ["spouse-id"],  // array of spouse IDs
  "occupation": "Farmer",      // shown on the card
  "location": "Ghurehata, Rewa",
  "bio": "Brief biography…",   // shown in the detail panel
  "tags": ["elder"]            // optional tags (see below)
}
```

### Tags

| Tag | Color | Meaning |
|-----|-------|---------|
| `legendary` | Gold | Mythological/ancient ancestor |
| `placeholder` | Grey | Data not yet filled in |
| `author` | Green | Blog/record author |
| `elder` | Red | Senior family figure |
| `verified-source` | Blue | Verified family history source |

### Adding a new member

1. Open `src/data/family.json`
2. Add a new object to the `"people"` array
3. Set `"parentId"` to the father's `"id"`
4. For wives/spouses: add their `"id"` to the husband's `"spouseIds"` array, and the husband's `"id"` to the wife's `"spouseIds"`
5. Save the file — the app hot-reloads automatically

### Adding intermediate ancestors (filling placeholders)

Replace the placeholder objects (those with `"tags": ["placeholder"]`) with actual ancestors. Update the `"parentId"` chain to connect them.

## Deploying as a website

### Option 1: Netlify (easiest — free)

1. `npm run build` — creates the `dist/` folder
2. Go to [netlify.com](https://netlify.com) → "Add new site" → "Deploy manually"
3. Drag and drop the `dist/` folder

### Option 2: GitHub Pages (free)

1. Push this repo to GitHub
2. Install the deploy tool: `npm install -D gh-pages`
3. Add to `package.json` scripts: `"deploy": "gh-pages -d dist"`
4. Run: `npm run build && npm run deploy`
5. Enable GitHub Pages in repo Settings → Pages → branch: `gh-pages`

### Option 3: Vercel (free)

1. Push to GitHub
2. Import at [vercel.com](https://vercel.com)
3. Vercel auto-detects Vite and deploys on every push

## Project structure

```
Vanshavali/
├── src/
│   ├── data/
│   │   └── family.json          ← Edit this to update family data
│   ├── components/
│   │   ├── FamilyTree.jsx       ← Tree layout engine
│   │   ├── TreeNode.jsx         ← Individual node (person + children)
│   │   ├── PersonCard.jsx       ← Card displayed in the tree
│   │   └── DetailPanel.jsx      ← Right-side detail view on click
│   ├── App.jsx
│   └── index.css
└── README.md
```
