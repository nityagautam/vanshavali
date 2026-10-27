import { useRef, useState } from 'react';
import { RotateCcw } from 'lucide-react';
import { DEFAULT_FOCUS, clamp } from '../utils/photoFocus';

/**
 * Circular preview you can drag (or arrow-key) to choose which part of the
 * photo stays in frame. Also shows the small tree-size avatar so you can see
 * the result where it is actually used.
 */
export default function PhotoFramer({ src, x, y, onChange }) {
  const [natural, setNatural] = useState(null); // { w, h }
  const drag = useRef(null);
  const box = useRef(null);

  if (!src) return null;

  // How far the image overflows the circle on each axis (object-fit: cover).
  const overflow = () => {
    const size = box.current?.clientWidth || 132;
    if (!natural) return { x: 0, y: 0 };
    const scale = Math.max(size / natural.w, size / natural.h);
    return { x: Math.max(0, natural.w * scale - size), y: Math.max(0, natural.h * scale - size) };
  };

  const onPointerDown = e => {
    drag.current = { px: e.clientX, py: e.clientY, x, y };
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const onPointerMove = e => {
    const d = drag.current;
    if (!d) return;
    const o = overflow();
    // Dragging the picture right reveals more of its left side → smaller x%.
    const nx = o.x > 0 ? clamp(d.x - ((e.clientX - d.px) / o.x) * 100) : d.x;
    const ny = o.y > 0 ? clamp(d.y - ((e.clientY - d.py) / o.y) * 100) : d.y;
    onChange(nx, ny);
  };
  const onPointerUp = () => { drag.current = null; };
  const onKeyDown = e => {
    const step = e.shiftKey ? 10 : 4;
    const move = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] }[e.key];
    if (!move) return;
    e.preventDefault();
    onChange(clamp(x + move[0]), clamp(y + move[1]));
  };

  const pos = { objectPosition: `${x}% ${y}%` };
  const isDefault = Math.abs(x - DEFAULT_FOCUS.x) < 1 && Math.abs(y - DEFAULT_FOCUS.y) < 1;

  return (
    <div className="photo-framer">
      <div
        ref={box}
        className="photo-circle"
        tabIndex={0}
        role="group"
        aria-label="Photo framing — drag, or use arrow keys, to choose what stays in the circle"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onKeyDown={onKeyDown}
      >
        <img
          src={src}
          alt=""
          style={pos}
          draggable={false}
          onLoad={e => setNatural({ w: e.target.naturalWidth, h: e.target.naturalHeight })}
        />
      </div>
      <div className="photo-framer-side">
        <div className="photo-mini" aria-hidden="true"><img src={src} alt="" style={pos} draggable={false} /></div>
        <p className="field-hint">Drag the photo to choose what stays in the circle. The small circle shows how it looks on the tree.</p>
        <button type="button" className="link-btn" onClick={() => onChange(DEFAULT_FOCUS.x, DEFAULT_FOCUS.y)} disabled={isDefault}>
          <RotateCcw size={14} /> Reset framing
        </button>
      </div>
    </div>
  );
}
