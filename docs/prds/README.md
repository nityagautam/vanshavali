# Vanshavali — PRDs

Every feature or larger change starts as a PRD in this folder, is reviewed and approved, and only then implemented. One file per initiative, named `NNN-short-slug.md` (next number = highest + 1). Each PRD states status, problem, goals/non-goals, solution (phased where large), metrics, risks and open questions. Update the status when work ships.

| # | PRD | Status |
|---|---|---|
| 001 | [UI Modernization & Mobile-First Experience](./001-ui-modernization-mobile.md) | Draft (questions resolved) |
| 002 | [About Page + Navigation](./002-about-page-navigation.md) | Implemented |
| 003 | [Floating Action Button](./003-floating-action-button.md) | Implemented |
| 004 | [Login / Access Control](./004-login-access-control.md) | Superseded (server-side auth) |
| 005 | [Image Hover Preview](./005-image-hover-preview.md) | Implemented |
| 006 | [Admin-only writes](./006-admin-only-writes.md) | Implemented (invite-link role open) |
| 007 | [Record keepers](./007-record-keepers.md) | Implemented (pending review) |
| 008 | [Add/Edit member form](./008-member-form.md) | Implemented (pending review) |

002–005 were migrated from the former `specs/` folder; their bodies are unchanged apart from the title and status line.

## Shared decisions (carried over)

- Routing: `react-router-dom` with `BrowserRouter`; Vercel rewrite so `/about` doesn't 404.
- Data: base fields from `src/data/family.json` meta, richer About content from `src/data/about.json`.
- Mobile breakpoint: `≤768px`.
- No new UI libraries — CSS-only approach.
