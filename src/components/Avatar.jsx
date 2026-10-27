import { useState } from 'react';
import { parsePhoto } from '../utils/photoFocus';

const HONORIFIC = /^((स्व\.?|श्रीमती|श्री|सुश्री|Late|Shri|Smt\.?|Devi)\s+)+/i;
const segmenter = typeof Intl !== 'undefined' && Intl.Segmenter
  ? new Intl.Segmenter('hi', { granularity: 'grapheme' })
  : null;

function initialsOf(name = '') {
  const core = name.trim().replace(HONORIFIC, '');
  const first = core.split(/\s+/)[0] || '';
  if (/[ऀ-ॿ]/.test(first)) {
    const graphemes = segmenter ? [...segmenter.segment(first)].map(g => g.segment) : [...first];
    return graphemes.slice(0, 2).join('');
  }
  return core.split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0].toUpperCase()).join('');
}

/**
 * Photo if available, otherwise initials. A ring in the generation hue
 * (--gen-color, set by the nearest tree node / detail head) marks the
 * generation. size: 'xs' 28 | 'sm' 36 (cards) | 'md' 40 | 'lg' 60 (detail).
 */
export default function Avatar({ person, size = 'sm', className = '' }) {
  const [imgError, setImgError] = useState(false);
  const isPlaceholder = person.tags?.includes('placeholder');
  const showImg = person.photo && !imgError && !isPlaceholder;
  const { src, x, y } = parsePhoto(person.photo);

  return (
    <div className={`avatar avatar-${size} ${className}`} aria-hidden="true">
      {showImg ? (
        <img src={src} alt="" loading={size === 'lg' ? 'eager' : 'lazy'} decoding="async" style={{ objectPosition: `${x}% ${y}%` }} onError={() => setImgError(true)} draggable={false} />
      ) : (
        <span>{isPlaceholder ? '?' : initialsOf(person.name)}</span>
      )}
    </div>
  );
}
