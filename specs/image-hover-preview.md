# Spec: Image Hover Preview

**Status**: Ready  
**Priority**: P2  
**Dependencies**: None (independent, can be done anytime)

---

## Goal

Show a hover tooltip on `PersonCard` with a larger photo preview (or enlarged initials if no photo) and the person's name. Improves discoverability of photos without requiring a click.

---

## Behaviour

| Condition | Hover shows |
|---|---|
| Person has `photo` | Circular photo (64px) + name |
| Person has no `photo` | Enlarged initials avatar (64px) + name |
| Placeholder person | Nothing (no tooltip) |
| Mobile / touch device | No change — hover does not fire on touch |

---

## Implementation

**CSS-only tooltip** — no JS state needed. Uses `:hover` on `.person-card` to show a `::before`/sibling `div.card-hover-preview` with `opacity: 0 → 1` and `transform: translateY`.

Structure added to `PersonCard.jsx`:
```jsx
{!isPlaceholder && (
  <div className="card-hover-preview">
    <Avatar person={person} size="lg" className="card-hover-avatar" />
    <span className="card-hover-name">{displayName}</span>
  </div>
)}
```

**CSS**:
```css
.card-hover-preview {
  position: absolute;
  bottom: calc(100% + 10px);
  left: 50%;
  transform: translateX(-50%) translateY(4px);
  background: var(--card-bg);
  border: 1.5px solid var(--gold);
  border-radius: 12px;
  padding: 10px 14px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  pointer-events: none;      /* never blocks clicks */
  opacity: 0;
  transition: opacity 0.15s ease 0.15s, transform 0.15s ease 0.15s;
  white-space: nowrap;
  z-index: 30;
  box-shadow: 0 4px 16px rgba(0,0,0,0.12);
}

.person-card:hover .card-hover-preview {
  opacity: 1;
  transform: translateX(-50%) translateY(0);
}

.card-hover-name {
  font-size: 0.72rem;
  font-weight: 600;
  color: var(--text-primary);
  font-family: 'Playfair Display', serif;
}
```

**Avatar size for tooltip**: 64px diameter (larger than card's 38px avatar).

---

## Edge cases

- **Tooltip clipped at top of viewport** (root node): tooltip flips below the card instead. Detect with CSS `@supports` or JS — simpler to just let it clip for now since root node is rarely hovered for preview.
- **Couple bubble**: tooltip shows on both the primary person card and spouse card independently.
- **Dimmed cards**: tooltip still shows (opacity on parent `.person-card.dimmed` is 0.35 — tooltip inherits this, which is fine).
- **Selected cards**: tooltip still shows.

---

## Files changed

| File | Change |
|---|---|
| `src/components/PersonCard.jsx` | Add `.card-hover-preview` div |
| `src/index.css` | Add hover preview styles |

---

## Out of Scope (this spec)

- Hover on `DetailPanel` avatar (already has click-to-lightbox)
- Hover showing occupation/years (deferred to future)
- Animated photo carousel on hover
