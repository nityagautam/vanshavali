# Spec: Floating Action Button

**Status**: Ready  
**Priority**: P1  
**Dependencies**: About Page spec (sidebar must be removed first)

---

## Goal

Replace the sidebar tool buttons (Print Data, Print Tree, Export JSON, Add Member) with a floating action button (FAB) fixed to the bottom-right of the tree canvas. All actions are protected behind login (see login spec).

---

## Component

### New: `src/components/FloatingActions.jsx`

**Collapsed state** (default):
- Single circular button, bottom-right of viewport
- Icon: `⚙` (or `⋮`)
- Shows a small lock icon overlay when user is not logged in
- Size: 48px diameter
- `position: fixed`, `bottom: 24px`, `right: 24px`
- On mobile: `bottom: 72px` (above bottom nav bar)

**Expanded state** (after clicking main button):
- Main button rotates to `✕`
- 4 action buttons fan out vertically above the main button, each with a label tooltip on hover
- Animation: slide up + fade in, staggered 50ms per button
- Actions (top to bottom):
  1. `＋` Add Member
  2. `↓` Export JSON
  3. `⎙` Print Data
  4. `⊞` Print Tree

**Auth gating**:
- If `isLoggedIn` is false, clicking any action button triggers `onAuthRequired()` callback instead of the action
- If `isLoggedIn` is true, actions execute directly
- FAB shows a small `🔒` badge when logged out, `🔓` when logged in

**Props**: `{ isLoggedIn, onAuthRequired, people, familyData, meta, lang }`

---

## Action implementations

These move from `Sidebar.jsx` to `FloatingActions.jsx` (or shared utils):

### Export JSON
```js
// Same as current Sidebar exportJSON()
const blob = new Blob([JSON.stringify(familyData, null, 2)], { type: 'application/json' });
const url = URL.createObjectURL(blob);
// trigger download
```

### Print Data
```js
window.print(); // triggers @media print, reveals #print-view
```

### Print Tree
Move `printTree()` function from `Sidebar.jsx` to `src/utils/printTree.js`, import in `FloatingActions`.

### Add Member
Render `<AddMemberForm>` in a modal/drawer overlay triggered from FAB. Move `AddMemberForm` from `Sidebar.jsx` to its own file `src/components/AddMemberForm.jsx`.

---

## CSS

```css
.fab-container {
  position: fixed;
  bottom: 24px;
  right: 24px;
  z-index: 40;
  display: flex;
  flex-direction: column-reverse;
  align-items: center;
  gap: 12px;
}

/* On mobile, lift above bottom nav */
@media (max-width: 768px) {
  .fab-container { bottom: 72px; }
}

.fab-main { width: 48px; height: 48px; border-radius: 50%; }
.fab-action { width: 40px; height: 40px; border-radius: 50%; }
.fab-action-label { /* tooltip on hover */ }
```

---

## State

FAB open/closed state is local to `FloatingActions` (`useState`).  
Auth state (`isLoggedIn`) lives in `App.jsx` and is passed as prop.

---

## Out of Scope (this spec)

- Password validation logic — handled in login spec
- `AddMemberForm` UI changes — moved as-is, no redesign
