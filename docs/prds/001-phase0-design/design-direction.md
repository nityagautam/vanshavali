# PRD 001 · Phase 0 — Design Direction

Status: Proposal, for review. Companion mocks: [`mocks.html`](./mocks.html) (open in a browser; light/dark toggle at top).

## 1. Concept: "Old paper record"

Vanshavali is a record that families keep for generations, so the UI should feel like an archival page, not a SaaS dashboard: aged paper surfaces, dark sepia ink, and a single ink-coloured accent (no bright brand colour). Quiet by default; names and the tree are the only things with visual weight. A subtle paper-grain texture (a tiled, ~1 KB inline SVG, 5–10% opacity) sits on paper surfaces only; cards, sheets and controls stay flat for legibility.

Principles
1. **Names first.** Devanagari names are the content; chrome recedes.
2. **One ink accent.** The accent marks the single primary action and the selected person. Everything else is ink and paper.
3. **Colour means generation.** Four muted pigment hues (neel, hara, manjistha, haldi) are used only for generation rings and stems.
4. **Thumb-first.** Primary controls sit in the bottom third on phones; sheets, not drawers.
5. **Calm motion.** Short, eased, fully removable with reduced-motion.
6. **Read-mostly.** Anything that changes the record (Add, Edit, Move, Invite) is visible to admins only; viewers get a cleaner UI with no disabled or teaser controls.

What goes away: the brown→saffron header gradient, gold borders on everything, the FAB menu, per-component drop shadows, Playfair/Inter/Noto Serif Devanagari.

## 2. Tokens

### Paper palettes (default: **Parchment**; Archival and Vellum kept as tested fallbacks)
Same structure, three characters. Open `mocks.html` and switch between them (and light/dark, Admin/Viewer).

| | **Parchment** (recommended) | **Archival** | **Vellum** |
|---|---|---|---|
| Character | Classic warm aged paper, most "old record" | Cooler grey-green document stock, most "professional" | Palest, lightly yellowed; closest to modern UI |
| Accent (ink) | Oxblood `#7A2E22` | Verdigris teal `#1F5A5A` | Blue-black `#23406B` |
| `--paper` | `#F1E6CC` | `#ECE8D9` | `#F5F0E1` |
| `--paper-sunk` | `#E6D8B6` | `#E0DBC8` | `#EBE4D0` |
| `--card` | `#F8F0DB` | `#F5F2E6` | `#FBF8EE` |
| `--ink` | `#2B2118` | `#1F2421` | `#1E1B16` |
| `--ink-2` | `#54442F` | `#434A44` | `#4A443A` |
| `--ink-3` | `#6F6049` | `#5F6760` | `#6E6454` |
| `--line` | `#D3C095` | `#C9C4AC` | `#DAD1B8` |
| `--accent-soft` | `#E9CDBE` | `#CFE0DC` | `#D5DEEC` |

Dark counterparts (aged paper by candlelight, same hue family, never pure black):

| | Parchment | Archival | Vellum |
|---|---|---|---|
| `--paper` / `--paper-sunk` / `--card` | `#1B150D` / `#120E08` / `#251D13` | `#141816` / `#0D100F` / `#1C211E` | `#15130F` / `#0E0C09` / `#1E1B15` |
| `--ink` / `--ink-2` / `--ink-3` | `#EDE0C4` / `#C9B895` / `#A39274` | `#E6E8DC` / `#BFC4B4` / `#98A092` | `#EFE8D6` / `#C8BFA8` / `#A0967F` |
| `--line` | `#3B2F20` | `#2D352F` | `#332E24` |
| `--accent` / `--accent-soft` | `#D98A6C` / `#3A2419` | `#6FB5AD` / `#1C3532` | `#7E9FD6` / `#1D2A40` |

Shared tokens: generation hues light `#2F4B7C #3F7A5A #A23B5C #B7791F`, dark `#7C9BD6 #7FBF9A #D97A98 #E2B04A`; `--accent-ink` (text on accent) is white in light and `--paper` in dark. Contrast (computed, to be verified with a checker in Phase 3): body/secondary text and accent-on-paper are ≥ 4.5:1 in all six combinations; `--ink-3` is for meta text only.

Implementation: one token file; palette = `data-paper` attribute, mode = `data-theme` (light/dark) with a single `prefers-color-scheme` block that reuses the same custom properties (generated, not hand-duplicated — fixes A4). The user's pick persists in `localStorage`.

**Chosen: Parchment** (2026-10-27). Archival and Vellum stay in `mocks.html` as fallbacks if Parchment feels too yellow in real use; only Parchment ships in the first implementation.

### Typography
Three families, down from four (and fewer weights):
- **Display / names (Latin):** Newsreader 500/600
- **Display / names (Devanagari):** Tiro Devanagari Hindi 400
- **UI (both scripts):** Hind 400/500/600

| Role | Size / line | Font |
|---|---|---|
| Title | 22 / 28 | Display 600 |
| Person name (card) | 15 / 20 | Display |
| Sheet heading | 20 / 26 | Display |
| Body | 15 / 22 | UI 400 |
| Label / button | 14 / 20 | UI 500 |
| Meta | 12.5 / 16 | UI 400, `--ink-3` |

Minimum body size 15px on touch; Hindi gets +1px optical size where it sits next to Latin.

### Space, shape, depth
- 4px grid: 4 · 8 · 12 · 16 · 20 · 24 · 32 · 48.
- Radius: 8 (inputs/chips) · 14 (cards) · 22 (sheets, top corners) · 999 (pills).
- Elevation: three levels only — `0` (hairline border), `1` (cards when selected: `0 1px 2px / 6%`), `2` (sheets/menus: `0 8px 32px / 18%`). No coloured shadows.
- Touch targets ≥ 44px hit area (already in Phase 1).

### Motion
- Durations: 120ms (hover/press) · 200ms (sheet, panel) · 280ms (page/zoom).
- Easing: `cubic-bezier(.2,.7,.2,1)` for enter, `cubic-bezier(.4,0,1,1)` for exit.
- Sheets slide + fade; cards never animate on scroll; zoom/pan are direct manipulation (no easing).
- `prefers-reduced-motion`: durations collapse to ~0 (already in Phase 1).

## 3. Layout

**Phone (≤768px)**
- *App bar* (56px): mark + "वंशावली" title, theme/language/About in an overflow menu.
- *Search pill* directly beneath — the primary control, full width. Tapping opens the command palette as a full-screen search.
- *Canvas* fills the rest. Tree cards 132×64.
- *Canvas controls* (bottom-right, above the bar): Fit, +, − in one vertical pill; zoom % shown only while changing.
- *Bottom bar* (56px + safe area): **Tree · Filters · Add · More** for admins; **Tree · Filters · More** for everyone else (no Add, no disabled placeholder). "Add" is the only filled (accent) button. Admin tools (Invite, Export, Print) live under More.
- *Detail* is a bottom sheet with three snap points (peek: name + years · half: facts · full: bio/children/edit). Swipe down to dismiss.
- *Filters* (gender, status, marriage, depth) are one sheet, with an active-count badge on the bar item.

**Desktop**
- Same app bar, with search inline and controls right-aligned; no bottom bar.
- Detail is a 360px right panel (not an overlay), canvas controls bottom-left, MiniMap bottom-right.
- Command palette stays ⌘K.

**Tree**
- Person card: 36–40px avatar with a 2px ring in the generation hue, name (display font), years/occupation meta. Spouse shown as a smaller attached chip with ⚭.
- Connectors: 1.5px `--line`, rounded elbows, generation hue on the stem leaving a parent.
- States: selected = `--accent` 2px outline + `--accent-soft` fill; match = accent dot; dimmed = 35% opacity; deceased = ink-3 name with "स्व." prefix (matches print).

**Forms (Add/Edit)**: full-height sheet on phone, sectioned (Basics · Family · Details · Photo), sticky Save bar above the keyboard, inline validation.

## 4. Print
Print stays black-on-white. Generation hues map to the existing 4-colour print palette; no dependency on the dark tokens. Print CSS is isolated in its own file during the Phase 4 split.

## 5. Implementation notes (feeds Phases 3–4)
- Tokens land first as `tokens.css`; components migrate area by area (tree → header/bars → sheets → forms → About).
- Old variable names (`--cream`, `--gold`, …) are aliased to the new tokens during migration so partially migrated screens stay coherent, then deleted.
- Fonts: replace the Google Fonts link with the three families (display=swap, only used weights), preload the Hind 400 file.

## 6. Decisions

Resolved (2026-10-27):
1. **Direction:** old-paper record theme, light and dark (replaces the first "Bahi"/sindoor proposal). Three palettes offered; Parchment recommended.
2. **Accent:** ink-coloured per palette, not sindoor red or saffron.
3. **Add / Edit / Move / Invite: admin only.** Verified-information policy: no unverified additions. A future PRD may grant specific users permission.
4. **Fonts:** Newsreader + Tiro Devanagari Hindi + Hind — accepted.

5. **Default palette: Parchment** (light + dark).

Still open:
- Should the grain texture ship on by default, or only on the app background (not behind the tree)?

## 7. Backend impact of "admin only" (separate PRD)
Today `POST /api/family` accepts any valid session, including invite-redeemed ones (`requireSession`). Making Add admin-only means switching it to `requireAdminSession`, which leaves invite links with no extra capability beyond viewing — the invite feature needs a redefinition (e.g. "view-only access link" or a permission grant for specific users). Tracked as a follow-up PRD, independent of the visual work.
