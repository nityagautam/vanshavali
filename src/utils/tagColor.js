/**
 * Deterministically maps any tag string to a pastel HSL colour set.
 * Same tag → same colour across every render / session.
 */
export function getTagStyle(tag) {
  // djb2-style hash
  let hash = 5381;
  for (let i = 0; i < tag.length; i++) {
    hash = (hash * 33) ^ tag.charCodeAt(i);
    hash |= 0; // keep 32-bit int
  }
  const hue = Math.abs(hash) % 360;
  return {
    background: `hsl(${hue}, 60%, 91%)`,
    color:      `hsl(${hue}, 55%, 28%)`,
    border:     `1px solid hsl(${hue}, 50%, 76%)`,
  };
}
