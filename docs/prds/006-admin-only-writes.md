# PRD 006 — Admin-only writes

- **Status:** Implemented (phase A); invite-link redefinition open
- **Owner:** Ashutosh Mishra
- **Date:** 2026-10-27
- **Related:** PRD 001 (UI modernization — viewers get a UI without write controls), PRD 004 (superseded login spec)

## Problem
Family data is sensitive and must not accept unverified additions. Today `POST /api/family` (Add Member) accepts any valid session, including invite-redeemed ones (`requireSession`), while Edit/Move/Photo-upload/Invite management are already admin-only (`requireAdminSession`). That leaves one write path open to non-admins.

## Goals
- Every write to family data requires an admin session (password login, or Google login with an allowlisted email).
- Non-admin sessions never see Add controls; the server enforces it regardless of the UI.
- A clear, distinct response for "not logged in" (401) vs "logged in but not admin" (403).

## Non-goals (this PRD)
- Per-user permissions ("allow specific users to add") — future work; the allowlist is the natural hook.
- Redefining invite links (see Open questions).

## Solution (phase A — done)
- `api/family.js` POST: `requireSession` → `requireAdminSession`; respond 401 `Login required.` with no session, 403 `Only an admin can add members.` for non-admin sessions (invite-redeemed).
- `FloatingActions.jsx`: the Add Member action is shown only to logged-out users (it routes to login) and admins — same rule already used for the Invite Link action.
- Docs: `CLAUDE.md` Auth section updated.

## Behaviour matrix
| Session | View | Add | Edit / Move / Photo | Invite mgmt |
|---|---|---|---|---|
| none | ✔ | → login | → login | → login |
| invite-redeemed | ✔ | ✘ (403, hidden) | ✘ | ✘ |
| password / allowlisted Google | ✔ | ✔ | ✔ | ✔ |

## Open questions
1. **What is an invite link for now?** It previously granted "can add members". With writes admin-only it only grants a logged-in, non-admin session, which today unlocks nothing beyond Export/Print. Options: (a) retire invite links; (b) keep them as a gate for Export/Print; (c) make them grant a scoped, admin-approved contribution flow (submissions land in a review queue, admin approves). (c) matches "verified info only" best and would be its own PRD.
2. Should `GET /api/family` stay public? Unchanged here; it is today's behaviour.

## Test plan
- Without cookie: `POST /api/family` → 401. With an invite-session cookie → 403. With admin cookie → 200 (unchanged).
- UI as invite session: no Add Member in the FAB.
