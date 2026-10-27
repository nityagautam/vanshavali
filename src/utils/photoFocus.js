// Photo framing (PRD 008). The focus point is stored inside the existing
// `photo` string as a URL fragment — `https://…/pic.jpg#focus=50,20` (x%,y%).
// Browsers ignore fragments when fetching, so no schema/DB change is needed
// and older clients just show the default crop.
export const DEFAULT_FOCUS = { x: 50, y: 20 }; // top-biased: faces sit high in portraits

const MARK = '#focus=';

export function parsePhoto(value) {
  if (!value) return { src: '', ...DEFAULT_FOCUS };
  const i = value.indexOf(MARK);
  if (i < 0) return { src: value, ...DEFAULT_FOCUS };
  const [x, y] = value.slice(i + MARK.length).split(',').map(Number);
  const ok = Number.isFinite(x) && Number.isFinite(y);
  return { src: value.slice(0, i), x: ok ? clamp(x) : DEFAULT_FOCUS.x, y: ok ? clamp(y) : DEFAULT_FOCUS.y };
}

export function buildPhoto(src, x, y) {
  const clean = (src || '').trim();
  if (!clean) return '';
  const isDefault = Math.abs(x - DEFAULT_FOCUS.x) < 1 && Math.abs(y - DEFAULT_FOCUS.y) < 1;
  return isDefault ? clean : `${clean}${MARK}${Math.round(x)},${Math.round(y)}`;
}

export const photoSrc = value => parsePhoto(value).src;

export function clamp(n) { return Math.min(100, Math.max(0, n)); }
