# PRD 008 — Add/Edit member form

- **Status:** Implemented (pending review)
- **Owner:** Ashutosh Mishra
- **Date:** 2026-10-27

## Problem
The Add/Edit Member form was a narrow, flat list with tiny labels. Marriage date is stored but not editable (and an edit-path bug erased it — fixed in PRD 006 follow-up), a member can only have one spouse in the form, tags are a comma-separated text box, errors are a single banner, photos have no framing control (portrait photos crop faces badly in the circular avatars), and clearing optional fields (occupation, location, bio, photo) silently doesn't clear them.

## Goals
1. **Sectioned, wider layout** — Basics · Family · Details · Photo; ~600px on desktop, full-height sheet on phones.
2. **Marriage date + multiple spouses** — editable marriage date; add/remove any number of spouses (server already mirrors spouse changes).
3. **Tags as chips** — with suggestions from existing tags and a **Record keeper** toggle (PRD 007).
4. **Inline validation** — per-field messages; focus/scroll to the first error.
5. **Photo framing** — drag inside a circle preview (or arrow keys) to choose what stays in frame.
6. **Dead/alive** — unchecking "Currently alive" pre-fills today's date as Died; re-checking clears it (restores an existing date if toggled back).

## Non-goals
Bulk editing, undo history, cropping/re-encoding the uploaded file.

## Solution notes
- **Photo focus** is stored inside the existing `photo` string as a URL fragment: `https://…/pic.jpg#focus=50,20` (x%,y%). Browsers ignore fragments when fetching, so no schema or DB migration is needed; older clients simply show the default crop. Default focus is 50%,20% (top-biased, for portraits). `src/utils/photoFocus.js` parses/builds it.
- **Clearing fields:** optional text fields now send `null` when emptied. Previously they were omitted, and the edit handler's merge kept the old value, so clearing occupation/location/bio/photo had no effect.
- **Spouses:** `spouseIds` is edited as a list; the server mirrors additions/removals on the other person (existing behaviour in `api/family/edit.js` and `api/family.js`).
- **Date format** for auto-filled death date: `27 Oct 2026` (matches the placeholder style).

## Open questions
- Dates are still free text (existing data mixes "Mar 1926", "23 April 2011", etc.). A structured date picker would need a data migration — not in this PRD.
