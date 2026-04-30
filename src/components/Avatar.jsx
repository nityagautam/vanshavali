import { useState } from 'react';

/**
 * Renders a person's photo if available, falls back to styled initials.
 * Props:
 *   person   – person object (needs .name, .gender, .photo, .tags)
 *   size     – 'sm' (36 px card) | 'lg' (96 px detail panel)
 *   className – extra class
 */
export default function Avatar({ person, size = 'sm', className = '' }) {
  const [imgError, setImgError] = useState(false);

  const isPlaceholder = person.tags?.includes('placeholder');

  const hasDevanagari = /[\u0900-\u097F]/.test(person.name);

  const initials = isPlaceholder
    ? '?'
    : hasDevanagari
    ? 'श्री'
    : person.name
        .replace(/^(Late |Shri |Devi |Shrimati |Smt\. ?)/gi, '')
        .split(' ')
        .filter(Boolean)
        .slice(0, 2)
        .map(w => w[0]?.toUpperCase() || '')
        .join('');

  const px = size === 'lg' ? 96 : 36;
  const fontSize = size === 'lg'
    ? (hasDevanagari ? '1.1rem' : '2rem')
    : (hasDevanagari ? '0.55rem' : '1rem');

  const showImg = person.photo && !imgError && !isPlaceholder;

  return (
    <div
      className={`avatar avatar-${size} avatar-${person.gender} ${className}`}
      style={{ width: px, height: px, fontSize }}
    >
      {showImg ? (
        <img
          src={person.photo}
          alt={person.name}
          onError={() => setImgError(true)}
          draggable={false}
        />
      ) : (
        <span>{initials}</span>
      )}
    </div>
  );
}
