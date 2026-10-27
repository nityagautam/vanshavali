# PRD 007 — Record keepers

- **Status:** Implemented (pending review)
- **Owner:** Ashutosh Mishra
- **Date:** 2026-10-27

## Problem
Three members — श्री लक्ष्मण प्रसाद गौतम, श्री यज्ञनारायण गौतम and श्री केशरी प्रसाद गौतम (Capt., Indian Army, retd.) — preserved and carried this Vanshavali forward. The About text already honours them by name, but nothing in the app marks them, and the names are plain text with no way to reach them in the tree.

## Goals
- Mark record keepers visibly on the tree and in their detail view.
- Let anyone find them quickly (filter) and jump to them from the About page.
- Let an admin add or remove a record keeper without a code change.

## Non-goals
- A separate About "keepers" section (the About text already names them).
- Per-keeper pages, contribution histories, or permissions.

## Solution
**Data:** one reserved tag, `record-keeper`. No schema/DB change — tags are already stored and editable through Edit Member. The seed `family.json` carries it for `lakshman-prasad`, `yagya-narayan`, `keshari-prasad`; live data is updated by `scripts/tag-record-keepers-db.js` (idempotent) or by an admin through the Edit form. The tag is hidden from the normal tag chips.

**Tree:** a small seal badge on the card corner and a stronger accent border. Generation ring colours are unchanged.

**Detail:** a banner under the name — "Record keeper · अभिलेख संरक्षक" with a one-line description.

**Filter:** a "Record keepers only" chip in Filters (phone sheet and desktop popover), counted in the active-filter badge.

**About page:** the existing mentions become links. `about.json` text supports `[label](person:<id>)`; the link opens `/?person=<id>`, which selects the person and scrolls the tree to them. Print and plain-text uses strip the markup back to the label.

## Open questions
1. Should a keeper's card also be pinned/shown at a fixed place (e.g. a "Record keepers" strip on the home screen)? Not built; the filter covers quick access.
2. Add per-keeper blurbs ("what they preserved") in the bio field — content for the owner to write.
