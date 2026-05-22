# Vanshavali — Feature Specs

This folder contains implementation specs for planned features. Each spec is the source of truth for scope, data model, components, and behaviour before any code is written.

## Specs

| Spec | Status | Priority |
|---|---|---|
| [About Page + Navigation](./about-page.md) | Ready | P0 |
| [Floating Action Button](./floating-action-button.md) | Ready | P1 |
| [Login / Access Control](./login.md) | Ready | P1 |
| [Image Hover Preview](./image-hover-preview.md) | Ready | P2 |

## Implementation Order

1. **About Page + Navigation** — self-contained, no dependencies
2. **Floating Action Button** — replaces sidebar tools, depends on sidebar removal (done in Phase 1)
3. **Login** — gates FAB actions, depends on FAB existing
4. **Image Hover Preview** — independent, can be done anytime

## Shared Decisions

- **Routing**: `react-router-dom` with `BrowserRouter`. Vercel rewrite added so `/about` doesn't 404 on hard refresh.
- **Data**: About page reads base fields (`dynasty`, `gotra`, `maintainer`, etc.) from `src/data/family.json` meta, and richer content from `src/data/about.json`.
- **Mobile breakpoint**: `≤768px` (matches existing codebase).
- **Bottom nav**: Visible only on mobile (`≤768px`), hidden on desktop.
- **No new UI libraries** — keep existing CSS-only approach.
