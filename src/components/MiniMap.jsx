import { useState, useEffect, useCallback } from 'react';

const MAP_W = 168;
const MAP_H = 84;

export default function MiniMap({ canvasRef, zoom }) {
  const [info, setInfo] = useState(null);

  const update = useCallback(() => {
    const el = canvasRef.current;
    if (!el) return;
    setInfo({
      sl: el.scrollLeft,
      st: el.scrollTop,
      sw: el.scrollWidth,
      sh: el.scrollHeight,
      cw: el.clientWidth,
      ch: el.clientHeight,
    });
  }, [canvasRef]);

  // Re-read on scroll and resize
  useEffect(() => {
    const el = canvasRef.current;
    if (!el) return;
    update();
    el.addEventListener('scroll', update, { passive: true });
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => {
      el.removeEventListener('scroll', update);
      ro.disconnect();
    };
  }, [canvasRef, update]);

  // Re-read when zoom changes (scrollWidth/Height change but no scroll event fires)
  useEffect(() => {
    // Small delay so the browser has applied the new zoom layout
    const t = setTimeout(update, 50);
    return () => clearTimeout(t);
  }, [zoom, update]);

  if (!info) return null;
  const { sl, st, sw, sh, cw, ch } = info;

  // Hide when nothing to scroll
  if (sw <= cw && sh <= ch) return null;

  const scaleX = MAP_W / sw;
  const scaleY = MAP_H / sh;
  const vx = Math.round(sl * scaleX);
  const vy = Math.round(st * scaleY);
  const vw = Math.max(12, Math.round(cw * scaleX));
  const vh = Math.max(8,  Math.round(ch * scaleY));

  const handleClick = e => {
    const rect = e.currentTarget.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    const el = canvasRef.current;
    if (!el) return;
    el.scrollLeft = (mx / MAP_W) * sw - cw / 2;
    el.scrollTop  = (my / MAP_H) * sh - ch / 2;
  };

  return (
    <div className="mini-map" title="Click to navigate">
      <div className="mini-map-label">⊞ Map</div>
      <div className="mini-map-area" onClick={handleClick}>
        <div
          className="mini-map-viewport"
          style={{ left: vx, top: vy, width: vw, height: vh }}
        />
      </div>
    </div>
  );
}
