import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { revealAll, hasPendingReveal } from '../utils/progressiveReveal';

export const MIN_ZOOM = 0.04; // the full tree is ~30,000 px wide at 100%
export const MAX_ZOOM = 2;
const DRAG_THRESHOLD = 6; // px before a press becomes a pan (keeps taps/clicks working)

const clamp = z => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, +z.toFixed(3)));

/**
 * Pan/zoom for the tree canvas. The canvas stays a native scroll container
 * (so scrollIntoView, the MiniMap and scrollbars keep working); zoom is a
 * transform on an inner element whose wrapper is sized to the scaled content.
 *
 * Returns refs/props for the canvas + inner element, the zoom state, and
 * zoomTo / fit helpers. Handles: pointer drag-to-pan (mouse + touch, with
 * touch inertia), two-finger pinch, and ctrl/cmd+wheel (trackpad pinch).
 */
export function usePanZoom({ canvasRef, initialZoom, enabled = true }) {
  const innerRef = useRef(null);
  const boxRef   = useRef(null);
  const [zoom, setZoomState] = useState(initialZoom);
  const [nat, setNat]        = useState({ w: 0, h: 0 });

  const zoomRef     = useRef(zoom);   // latest requested zoom
  const renderedRef = useRef(zoom);   // zoom currently reflected in the DOM
  const anchorRef   = useRef(null);   // keep content point under a screen point across a zoom change

  // Measure the unscaled tree (offset* ignores transforms).
  useLayoutEffect(() => {
    const el = innerRef.current;
    if (!enabled || !el) return;
    const measure = () => setNat(n => (n.w === el.offsetWidth && n.h === el.offsetHeight) ? n : { w: el.offsetWidth, h: el.offsetHeight });
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [enabled]);

  // After a zoom commit, shift scroll so the anchored content point stays put.
  useLayoutEffect(() => {
    const canvas = canvasRef.current, box = boxRef.current, a = anchorRef.current;
    renderedRef.current = zoom;
    if (!canvas || !box || !a) return;
    anchorRef.current = null;
    const r = box.getBoundingClientRect();
    canvas.scrollLeft += r.left + a.px * zoom - a.clientX;
    canvas.scrollTop  += r.top  + a.py * zoom - a.clientY;
  }, [zoom, canvasRef]);

  // Request a zoom. `anchor` = { fromX, fromY, clientX?, clientY? } in client px:
  // the content under (fromX, fromY) ends up under (clientX, clientY) (default: same point).
  // Omitted anchor = centre of the viewport.
  const zoomTo = useCallback((next, anchor) => {
    const canvas = canvasRef.current, box = boxRef.current;
    const z = clamp(next);
    if (!canvas || !box) { zoomRef.current = z; setZoomState(z); return; }
    const cr = canvas.getBoundingClientRect();
    const fromX = anchor?.fromX ?? cr.left + cr.width / 2;
    const fromY = anchor?.fromY ?? cr.top + cr.height / 2;
    const br = box.getBoundingClientRect();
    anchorRef.current = {
      px: (fromX - br.left) / renderedRef.current,
      py: (fromY - br.top)  / renderedRef.current,
      clientX: anchor?.clientX ?? fromX,
      clientY: anchor?.clientY ?? fromY,
    };
    zoomRef.current = z;
    setZoomState(z);
  }, [canvasRef]);

  const zoomBy = useCallback(delta => zoomTo(zoomRef.current + delta), [zoomTo]);

  // Run `cb` once the tree has stopped changing size: nothing left to reveal,
  // its width steady for a few frames, and the scroll box sized to match.
  // Scrolling to a card before this makes the card move out from under the scroll.
  const afterSettled = useCallback((cb) => {
    let last = -1, steady = 0, frames = 0;
    const tick = () => {
      const w = innerRef.current?.offsetWidth || 0;
      const boxW = boxRef.current?.getBoundingClientRect().width || 0;
      const boxOk = Math.abs(boxW - w * zoomRef.current) < 2;
      steady = (w === last && boxOk) ? steady + 1 : 0;
      last = w;
      if ((steady >= 3 && !hasPendingReveal()) || ++frames > 90) cb();
      else requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, []);

  // Fit the whole tree in the viewport (floored at MIN_ZOOM), scrolled to the top-left of it.
  // The tree renders progressively, so finish rendering first and measure the
  // real size once it has laid out.
  const fit = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    interacted.current = true;
    revealAll();
    const measure = () => {
      const inner = innerRef.current;
      if (!inner || !inner.offsetWidth) return;
      const z = clamp(Math.min(
        (canvas.clientWidth  - 64)  / inner.offsetWidth,
        (canvas.clientHeight - 120) / inner.offsetHeight,
      ));
      anchorRef.current = null;
      zoomRef.current = z;
      setZoomState(z);
      requestAnimationFrame(() => {
        canvas.scrollLeft = (canvas.scrollWidth - canvas.clientWidth) / 2;
        canvas.scrollTop = 0;
      });
    };
    afterSettled(measure);
  }, [canvasRef, afterSettled]);

  // Keep the tree centred while it is still growing (progressive render) —
  // until the user pans/zooms or something scrolls to a specific person.
  const interacted = useRef(false);
  const markInteracted = useCallback(() => { interacted.current = true; }, []);
  useLayoutEffect(() => {
    const canvas = canvasRef.current;
    if (!enabled) { interacted.current = false; return; }
    if (interacted.current || !canvas || !nat.w) return;
    canvas.scrollLeft = (canvas.scrollWidth - canvas.clientWidth) / 2;
  }, [enabled, nat.w, canvasRef]);

  // Pointer pan + pinch, wheel zoom.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!enabled || !canvas) return;

    const pts = new Map();
    let pan = null, pinch = null, suppressClick = false, raf = 0;

    const stopInertia = () => { cancelAnimationFrame(raf); raf = 0; };
    // A pointer can go down without ever reporting "up": the app is backgrounded
    // mid-touch, a dialog/sheet takes over, a system gesture steals the touch.
    // Left alone, that ghost makes every later drag look like a two-finger pinch
    // (wild zoom/scroll jumps that never recover). So gesture state is wiped
    // whenever a new first finger lands, and whenever the page loses focus.
    const resetGesture = () => {
      pts.clear(); pan = null; pinch = null; suppressClick = false;
      stopInertia();
      canvas.classList.remove('is-panning');
    };
    const centreOf = () => {
      const [a, b] = [...pts.values()];
      return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2, d: Math.hypot(a.x - b.x, a.y - b.y) || 1 };
    };
    const startPan = (p, active) => {
      pan = { x: p.x, y: p.y, sl: canvas.scrollLeft, st: canvas.scrollTop, active, vx: 0, vy: 0, t: performance.now() };
    };

    const onDown = e => {
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      interacted.current = true;
      if (e.isPrimary) resetGesture(); // a first finger means no other touch can be active
      stopInertia();
      pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pts.size === 1) {
        startPan(pts.get(e.pointerId), false);
      } else if (pts.size === 2) {
        const c = centreOf();
        pinch = { d: c.d, z: zoomRef.current, cx: c.x, cy: c.y };
        pan = null;
        suppressClick = true;
      }
    };

    const onMove = e => {
      const p = pts.get(e.pointerId);
      if (!p) return;
      p.x = e.clientX; p.y = e.clientY;

      if (pinch && pts.size >= 2) {
        const c = centreOf();
        zoomTo(pinch.z * (c.d / pinch.d), { fromX: pinch.cx, fromY: pinch.cy, clientX: c.x, clientY: c.y });
        // Re-base so each step anchors against the previous centre / zoom.
        pinch.cx = c.x; pinch.cy = c.y; pinch.d = c.d; pinch.z = zoomRef.current;
        return;
      }
      if (!pan) return;
      const dx = e.clientX - pan.x, dy = e.clientY - pan.y;
      if (!pan.active) {
        if (Math.hypot(dx, dy) < DRAG_THRESHOLD) return;
        pan.active = true;
        suppressClick = true;
        try { canvas.setPointerCapture(e.pointerId); } catch { /* pointer gone */ }
        canvas.classList.add('is-panning');
      }
      const now = performance.now(), dt = Math.max(1, now - pan.t);
      pan.vx = 0.8 * pan.vx + 0.2 * ((pan.sl - dx - canvas.scrollLeft) / dt);
      pan.vy = 0.8 * pan.vy + 0.2 * ((pan.st - dy - canvas.scrollTop) / dt);
      pan.t = now;
      canvas.scrollLeft = pan.sl - dx;
      canvas.scrollTop  = pan.st - dy;
    };

    const onUp = e => {
      if (!pts.delete(e.pointerId)) return;
      canvas.classList.remove('is-panning');
      if (pinch && pts.size < 2) {
        pinch = null;
        // The remaining finger carries on as a pan from where it is.
        if (pts.size === 1) startPan([...pts.values()][0], true);
        return;
      }
      if (pan?.active && e.pointerType !== 'mouse' && e.type === 'pointerup') {
        let { vx, vy } = pan, last = performance.now();
        const step = now => {
          const dt = now - last; last = now;
          canvas.scrollLeft += vx * dt; canvas.scrollTop += vy * dt;
          const f = Math.pow(0.94, dt / 16);
          vx *= f; vy *= f;
          raf = Math.hypot(vx, vy) > 0.02 ? requestAnimationFrame(step) : 0;
        };
        if (Math.hypot(vx, vy) > 0.05) raf = requestAnimationFrame(step);
      }
      pan = null;
      if (suppressClick) setTimeout(() => { suppressClick = false; }, 0);
    };

    // A drag/pinch must not also "click" the card it ended on.
    const onClickCapture = e => {
      if (suppressClick) { e.stopPropagation(); e.preventDefault(); suppressClick = false; }
    };

    const onWheel = e => {
      interacted.current = true;
      if (!(e.ctrlKey || e.metaKey)) return;
      e.preventDefault();
      zoomTo(zoomRef.current * Math.exp(-e.deltaY * 0.01), { fromX: e.clientX, fromY: e.clientY });
    };

    const onHidden = () => { if (document.visibilityState === 'hidden') resetGesture(); };
    window.addEventListener('blur', resetGesture);
    window.addEventListener('pagehide', resetGesture);
    document.addEventListener('visibilitychange', onHidden);
    canvas.addEventListener('pointerdown', onDown);
    canvas.addEventListener('pointermove', onMove);
    canvas.addEventListener('pointerup', onUp);
    canvas.addEventListener('pointercancel', onUp);
    canvas.addEventListener('click', onClickCapture, true);
    canvas.addEventListener('wheel', onWheel, { passive: false });
    return () => {
      stopInertia();
      window.removeEventListener('blur', resetGesture);
      window.removeEventListener('pagehide', resetGesture);
      document.removeEventListener('visibilitychange', onHidden);
      canvas.removeEventListener('pointerdown', onDown);
      canvas.removeEventListener('pointermove', onMove);
      canvas.removeEventListener('pointerup', onUp);
      canvas.removeEventListener('pointercancel', onUp);
      canvas.removeEventListener('click', onClickCapture, true);
      canvas.removeEventListener('wheel', onWheel);
    };
  }, [enabled, canvasRef, zoomTo]);

  return { zoom, zoomTo, zoomBy, fit, innerRef, boxRef, nat, setZoom: zoomTo, markInteracted, afterSettled };
}
