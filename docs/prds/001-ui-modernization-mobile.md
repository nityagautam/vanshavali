# PRD 001 — UI Modernization & Mobile-First Experience

- **Status:** Draft — open questions resolved 2026-10-27, scope updated; awaiting final approval
- **Owner:** Ashutosh Mishra
- **Date:** 2026-10-27
- **PRD convention:** one file per initiative in `docs/prds/`, named `NNN-short-slug.md`. Each PRD is approved before implementation; work is shipped in the phases listed in it.

## 1. Problem

Vanshavali is used mostly by family members on phones, but the UI was built desktop-first and patched for mobile with a single `@media (max-width: 768px)` block. The tree is hard to navigate by touch, several controls are too small to tap reliably, and the interface feels dense rather than smooth. The goal is a clean, calm, fast UI that is equally good on a phone and on a desktop.

## 2. Audit findings (current state)

### 2.1 Mobile / touch
| # | Finding | Evidence |
|---|---------|----------|
| M1 | **No touch gestures on the tree.** Zoom is Ctrl+wheel, keyboard, or +/- buttons; panning is native scroll only. No pinch-zoom, no drag-to-pan. | `App.jsx` wheel/keydown handlers; no pointer/touch handlers anywhere in `src` |
| M2 | **Zoom uses the non-standard CSS `zoom` property** on the whole tree (`<div style={{ zoom }}>`). It re-lays-out the tree on every step (janky), behaves differently across browsers, and breaks scroll-position maths used by MiniMap. | `App.jsx:528` |
| M3 | **Initial zoom is 25%**, so first paint on a phone is an unreadable thumbnail. | `App.jsx:28` |
| M4 | **`100vh` app shell** causes the classic mobile-browser bug (content hidden behind the URL bar). No `dvh`, no `viewport-fit=cover`, no `env(safe-area-inset-*)` anywhere (notched phones, FAB at `bottom:24px` collides with the home indicator). | `index.css` (no matches), `index.html` viewport meta |
| M5 | **Tap targets below 44px:** filter pills 26px high with 2px×6px padding, zoom buttons, toolbar icons. | `index.css` `.filter-pill-btn` |
| M6 | **Toolbar eats the screen on mobile.** It wraps to multiple rows (search, ⌘K trigger, filters, depth, zoom, view toggle), leaving little room for the tree. | `index.css` `@media (max-width:768px)` `.toolbar` |
| M7 | **Detail panel is a right-side drawer (90vw)** with no swipe-to-dismiss and no bottom-sheet pattern; it covers the tree it describes. | `.detail-panel` mobile rule |
| M8 | **Tree and list view are separate modes** chosen manually; the list ("drill-down") mode is the more phone-friendly one but is hidden behind a toggle and not the mobile default. | `MobileTreeView.jsx`, `vv-view-mode` |
| M9 | **Single breakpoint (768px).** No tablet/large-phone/landscape handling; mobile styles live in one block at ~line 2644 away from the components they affect. | `grep @media` → 1 responsive block |
| M10 | MiniMap and FAB overlap the tree on small screens; MiniMap is of little use with touch panning. | `MiniMap.jsx`, `.fab-container` |

### 2.2 Visual cleanliness & smoothness
| # | Finding |
|---|---------|
| V1 | `index.css` is a single **3,480-line file**, hard to change safely. Spacing/type/z-index tokens exist but the comments say "existing rules aren't retrofitted" — most rules still use hard-coded px/rem. |
| V2 | **Dense header/toolbar:** many controls with equal visual weight; no clear primary action (search). |
| V3 | **Motion is ad hoc:** 45 `transition` declarations with mixed `all`/durations, `transition: all` on rows; no `prefers-reduced-motion` handling; no enter/exit animation for the panel, modals, toasts. |
| V4 | **Font loading blocks first paint:** four Google font families (Inter, Playfair, Noto Sans/Serif Devanagari) in one stylesheet; no subsetting or `font-display` strategy beyond `swap`; extra weight for a rarely-seen serif face. |
| V5 | **No loading/empty/error states:** the bundled snapshot renders, then silently swaps to live data; failure shows a transient toast. No skeletons, no "offline/stale" indicator. |
| V6 | Toasts and inline banners use different styles (`.sidebar-toast`, `authMessage`, inline-styled buttons in `App.jsx`). |
| V7 | Modal forms (Add/Edit Member) are long single-column forms with no inline validation hints, and on mobile the keyboard can cover the active field. |

### 2.3 Accessibility & performance
| # | Finding |
|---|---------|
| A1 | Tree nodes and cards need keyboard navigation (arrow keys between parent/child/sibling), visible focus rings, and ARIA tree semantics (`role="tree"`/`treeitem`, `aria-expanded`). |
| A2 | Contrast of `--text-muted` on `--cream` and gold-on-cream accents should be verified against WCAG AA in both themes. |
| A3 | Large trees render every node in the DOM; with zoom re-layout this limits smoothness on low-end phones. Needs measurement before deciding on virtualization. |
| A4 | Dark theme duplicates its token block twice (media query + `[data-theme]`), already a known source of drift. |

## 3. Goals and non-goals

**Goals**
1. Phone is a first-class target: readable on first paint, one-handed navigation, gestures that feel native.
2. A calmer visual hierarchy: search first, everything else secondary.
3. Consistent motion, spacing, type and component styling through tokens.
4. No regression to existing features: auth, add/edit/reorder, print/export, i18n (hi/en), dark mode.

**Non-goals**
- Changing the data model, API, auth, or the 12-function Vercel cap.
- Adding a UI framework or tree/graph library (the tree stays pure CSS/DOM unless Phase 2 measurements prove otherwise).
- Redesigning the print outputs (covered by recent print fix).

## 4. Proposed solution

### Phase 0 — Design direction (new, from decision Q2: full redesign)
- Produce a new visual language before any Phase 3/4 layout work: palette (light + dark), type system (incl. Devanagari pairing), elevation, radii, iconography, tree-card and generation-colour treatment, motion principles.
- Deliverable (approved: Parchment): [`001-phase0-design/design-direction.md`](./001-phase0-design/design-direction.md) and [`mocks.html`](./001-phase0-design/mocks.html). Scope: a design-token spec and mocks for tree, detail sheet, search, forms, About, and print-safe colours, reviewed and approved as an addendum to this PRD.
- Phase 1 changes are token-agnostic (layout/touch/viewport), so they can ship in parallel with Phase 0.

### Phase 1 — Mobile foundations (low risk, highest impact)
- Viewport: add `viewport-fit=cover`; replace `100vh` with `100dvh` (`.app-shell`); apply `env(safe-area-inset-*)` to header, FAB, bottom sheets. (M4)
- Default zoom: fit-to-width / readable (~60–100%) on load instead of 25%; remember per device. (M3)
- Touch targets: raise all interactive controls to ≥44×44 CSS px hit area (visual size may stay smaller via padding). (M5)
- Tree stays the default view on all devices (decision Q1); list view remains an optional toggle. (M8)
- Add `prefers-reduced-motion` and `touch-action`/`overscroll-behavior` rules. (V3)

### Phase 2 — Tree interaction (critical path: tree is the default on phones)
- Replace CSS `zoom` with `transform: scale()` on a pan/zoom surface; implement pointer-event drag-to-pan and two-finger pinch-zoom with inertia; keep Ctrl+wheel and buttons. (M1, M2)
- "Fit to screen", "center on me/selected" actions; MiniMap becomes desktop-only. (M10)
- Measure render time and scroll/zoom FPS on a mid-range Android profile; virtualize or collapse-by-default only if budgets are missed. (A3)

### Phase 3 — Layout & navigation redesign
- Header: compact app bar; search is the primary control; filters/depth/view move into a single "Filters" bottom sheet on mobile. (V2, M6)
- Detail panel becomes a **bottom sheet** on mobile (drag handle, swipe-down to dismiss, snap points) and stays a side panel on desktop. (M7)
- Replace the FAB menu with a bottom action bar / overflow menu on mobile; admin actions grouped. (M10)
- Unified toast/banner component; skeletons and a clear "offline – showing saved copy" state. (V5, V6)
- Add/Edit forms: sectioned, sticky action footer, `inputmode`/`autocomplete` attributes, keyboard-safe scrolling. (V7)

### Phase 4 — Design system & polish
- Split `index.css` into per-area files (tokens, layout, tree, panels, forms, print) imported from one entry; migrate rules to spacing/type/z tokens opportunistically as each area is touched. (V1, M9)
- Single dark-theme token source (remove duplicated block). (A4)
- Motion spec: 3 durations/easings, enter/exit transitions for panel, sheets, modals, toasts. (V3)
- Fonts: drop unused weights/faces, self-host with `font-display: swap` and subsetting. (V4)
- Accessibility pass: tree keyboard navigation + ARIA, focus management in dialogs, contrast fixes. (A1, A2)

## 5. Success metrics
- Lighthouse mobile (4× CPU slowdown, throttled network): Performance ≥ 90, Accessibility ≥ 95, CLS < 0.1, LCP < 2.5 s.
- Tree pan/pinch holds ≥ 50 fps on a mid-range Android device with the full dataset.
- All interactive elements ≥ 44 px hit area; zero horizontal page scroll at 360 px width.
- Manual regression checklist (login methods, add/edit/move, search/⌘K, print tree/data, export, hi/en, light/dark) passes in Chrome, Safari iOS, Firefox.

## 6. Risks
- Pinch/pan on a custom surface can conflict with browser gestures and with the existing scroll-based MiniMap and `scrollIntoView` search-centering — both must be re-implemented against the new transform model.
- Print relies on current DOM structure/classes (`#print-view`, `.app-shell`) — Phase 4 CSS split must keep `@media print` intact.
- A full redesign on top of the existing 3.5k-line CSS risks half-migrated styles; do the CSS split and token migration as part of Phase 3/4, not after.
- Restyling in-place with a 3.5k-line CSS file risks dark-mode drift (the two theme blocks); mitigate by doing A4 first within Phase 4 scope or earlier if Phase 3 adds many themed colours.

## 7. Decisions (resolved open questions)
1. **Default view on phones: tree everywhere.** The list view stays as an optional toggle only. Consequence: Phase 2 (pinch/pan/fit-to-screen, readable first paint) is the make-or-break item and must ship before the redesign is considered mobile-complete.
2. **Visual direction: full redesign, old-paper record theme** (aged paper surfaces, ink-coloured accent, light + dark; **Parchment** chosen as the palette; Archival/Vellum kept as fallbacks — see Phase 0 design direction). The saffron/gold identity is not binding. Consequence: new Phase 0 (design direction), token migration becomes mandatory rather than opportunistic, and dark-mode tokens, generation colours and print colours must be re-derived from the new system.
3. **Support floor: last ~2 years** (iOS 16+, Android Chrome 110+). `dvh`, pointer events, `env(safe-area-inset-*)`, `:has()` and `overscroll-behavior` may be used without fallbacks.
4. **Dataset size:** 343 people, 9 generations in the bundled snapshot. Small enough that virtualization is not expected to be needed; Phase 2 still measures pan/zoom frame rate before ruling it out.
5. **Write actions are admin-only** (Add, Edit, Move, Invite). The UI hides them from non-admins; the backend change (and what invite links mean afterwards) is a separate PRD.

## 8. Rollout
Each phase ships independently via `vercel --prod` after a preview check on a real phone. Order: Phase 1 and Phase 0 in parallel, then Phase 2, then Phase 3 and 4 on the approved design system.
