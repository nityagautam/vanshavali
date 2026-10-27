import { useRef } from 'react';
import * as Dialog from '@radix-ui/react-dialog';

const DISMISS_DISTANCE = 90;  // px dragged down before release closes the sheet
const DISMISS_VELOCITY = 0.6; // px/ms flick
const SNAP_DISTANCE = 50;     // px dragged before release changes snap point

/**
 * Bottom sheet (Radix Dialog). Drag the handle/header down to dismiss.
 * With `snap` ('half' | 'full') + `onSnapChange`, dragging up expands it and
 * dragging down from full returns to half before a further drag dismisses.
 * Used on phones for filters, "more" actions, and (later) member details.
 */
export default function Sheet({ open, onOpenChange, title, hideTitle = false, snap, onSnapChange, children }) {
  const contentRef = useRef(null);
  const drag = useRef(null);

  const onPointerDown = e => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    drag.current = { y: e.clientY, t: performance.now(), dy: 0, v: 0 };
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const onPointerMove = e => {
    const d = drag.current;
    if (!d) return;
    const now = performance.now();
    const raw = e.clientY - d.y;
    const dy = Math.max(0, raw);
    d.raw = raw;
    d.v = (dy - d.dy) / Math.max(1, now - d.t);
    d.dy = dy; d.t = now;
    const el = contentRef.current;
    if (el) { el.style.transition = 'none'; el.style.transform = `translateY(${dy}px)`; }
  };
  const onPointerUp = () => {
    const d = drag.current;
    drag.current = null;
    const el = contentRef.current;
    if (!d || !el) return;
    el.style.transition = '';
    el.style.transform = '';
    if (snap && onSnapChange) {
      if (d.raw < -SNAP_DISTANCE && snap === 'half') { onSnapChange('full'); return; }
      if (snap === 'full' && (d.dy > SNAP_DISTANCE || d.v > DISMISS_VELOCITY)) { onSnapChange('half'); return; }
    }
    if (d.dy > DISMISS_DISTANCE || d.v > DISMISS_VELOCITY) onOpenChange(false);
  };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="sheet-overlay" />
        <Dialog.Content
          className="sheet"
          data-snap={snap}
          ref={contentRef}
          aria-describedby={undefined}
        >
          <div
            className="sheet-grab"
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
          >
            <span className="sheet-handle" aria-hidden="true" />
            <Dialog.Title className={hideTitle ? 'sr-only' : 'sheet-title'}>{title}</Dialog.Title>
          </div>
          <div className="sheet-body">{children}</div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
