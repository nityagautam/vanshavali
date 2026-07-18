import { useState, useEffect } from 'react';
import Avatar from './Avatar';
import { getTagStyle } from '../utils/tagColor';

// Fields already rendered explicitly — excluded from the dynamic "extra" section
const KNOWN_FIELDS = new Set([
  'id', 'name', 'gender', 'born', 'died', 'alive', 'dom',
  'parentId', 'motherId', 'spouseIds', 'occupation',
  'location', 'bio', 'tags', 'photo',
]);

function toLabel(key) {
  return key
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/[_-]/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase());
}

const LABELS = {
  hi: {
    details: 'विवरण', about: 'परिचय', family: 'परिवार',
    born: 'जन्म', died: 'मृत्यु', married: 'विवाह',
    occupation: 'व्यवसाय', location: 'स्थान',
    living: 'जीवित', deceased: 'स्वर्गीय',
    father: 'पिता', mother: 'माता', spouse: 'जीवनसाथी',
    child: 'संतान', sibling: 'भाई/बहन',
    present: 'वर्तमान',
    moreSiblings: (n) => `+${n} और भाई/बहन`,
    noDetails: 'अभी कोई विवरण नहीं।',
  },
  en: {
    details: 'Details', about: 'About', family: 'Family',
    born: 'Born', died: 'Died', married: 'Married',
    occupation: 'Occupation', location: 'Location',
    living: 'Living', deceased: 'Deceased',
    father: 'Father', mother: 'Mother', spouse: 'Spouse',
    child: 'Child', sibling: 'Sibling',
    present: 'present',
    moreSiblings: (n) => `+${n} more siblings`,
    noDetails: 'No details yet. Update family.json to add information.',
  },
};

export default function DetailPanel({ person, personMap, people, onClose, onSelect, onEdit, isAdmin, lang = 'hi' }) {
  const [lightbox, setLightbox] = useState(false);

  // Close lightbox on Escape key
  useEffect(() => {
    if (!lightbox) return;
    const onKey = (e) => { if (e.key === 'Escape') setLightbox(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [lightbox]);

  const formatDate = (d) => {
    if (!d) return null;
    if (typeof d === 'number') return d.toString();
    return d;
  };

  const born     = formatDate(person.born);
  const died     = formatDate(person.died);
  const dom      = formatDate(person.dom);

  // Collect any extra fields not in the known set
  const extraFields = Object.entries(person).filter(
    ([key, val]) => !KNOWN_FIELDS.has(key) && val !== null && val !== undefined && val !== ''
  );
  const spouses  = (person.spouseIds || []).map(id => personMap[id]).filter(Boolean);
  const children = people.filter(p => p.parentId === person.id);
  const father   = person.parentId ? personMap[person.parentId] : null;
  const mother   = person.motherId ? personMap[person.motherId] : null;
  const siblings = person.parentId
    ? people.filter(p => p.parentId === person.parentId && p.id !== person.id)
    : [];

  const isPlaceholder = person.tags?.includes('placeholder');
  const isDeceased    = person.alive !== true && !isPlaceholder;

  // 'both' uses Hindi labels since the app is Hindi-first
  const t = lang === 'en' ? LABELS.en : LABELS.hi;

  return (
    <aside className="detail-panel">
      {/* ── Photo hero ── */}
      <div className="detail-photo-hero">
        <button className="detail-close" onClick={onClose} title="Close">✕</button>
        {isAdmin && (
          <button className="detail-edit" onClick={() => onEdit(person)} title="Edit member">✎</button>
        )}
        <div
          className={`detail-photo-avatar-wrap${person.photo ? ' has-photo' : ''}`}
          onClick={() => person.photo && setLightbox(true)}
          title={person.photo ? 'Click to enlarge photo' : undefined}
        >
          <Avatar person={person} size="lg" className="detail-photo-avatar" />
          {person.photo && <span className="detail-photo-zoom-hint">⊕</span>}
        </div>
        <div className="detail-hero-name">{person.name}</div>
        <div className="detail-hero-sub">
          {person.occupation && !isPlaceholder && (
            <span className="detail-hero-occupation">{person.occupation}</span>
          )}
          {(born || died) && (
            <span className="detail-hero-years">
              {born || '?'}{isDeceased ? ` – ${died || '?'}` : born ? ` – ${t.present}` : ''}
            </span>
          )}
        </div>
        {/* Status + tags */}
        <div className="detail-hero-tags">
          {person.alive === true && !isPlaceholder && (
            <span className="card-tag" style={{ background: 'rgba(209,250,229,0.9)', color: '#065F46', border: '1px solid rgba(110,231,183,0.6)' }}>{t.living}</span>
          )}
          {isDeceased && (
            <span className="card-tag" style={{ background: 'rgba(243,244,246,0.9)', color: '#6B7280', border: '1px solid rgba(209,213,219,0.6)' }}>{t.deceased}</span>
          )}
          {(person.tags || []).filter(t => t !== 'root').map(tag => (
            <span key={tag} className="card-tag" style={getTagStyle(tag)}>{tag}</span>
          ))}
        </div>
      </div>

      <div className="detail-body">
        {/* Details */}
        <div className="detail-section">
          <div className="detail-section-title">{t.details}</div>
          {born && (
            <div className="detail-row">
              <span className="label">{t.born}</span>
              <span className="value">{born}</span>
            </div>
          )}
          {died && (
            <div className="detail-row">
              <span className="label">{t.died}</span>
              <span className="value">{died}</span>
            </div>
          )}
          {dom && (
            <div className="detail-row">
              <span className="label">{t.married}</span>
              <span className="value">{dom}</span>
            </div>
          )}
          {person.occupation && !isPlaceholder && (
            <div className="detail-row">
              <span className="label">{t.occupation}</span>
              <span className="value">{person.occupation}</span>
            </div>
          )}
          {person.location && (
            <div className="detail-row">
              <span className="label">{t.location}</span>
              <span className="value">{person.location}</span>
            </div>
          )}
          {extraFields.map(([key, val]) => (
            <div key={key} className="detail-row">
              <span className="label">{toLabel(key)}</span>
              <span className="value">
                {Array.isArray(val) ? val.join(', ') : String(val)}
              </span>
            </div>
          ))}
          {!born && !died && !dom && !person.occupation && !person.location && extraFields.length === 0 && (
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
              {t.noDetails}
            </div>
          )}
        </div>

        {/* Bio */}
        {person.bio && (
          <div className="detail-section">
            <div className="detail-section-title">{t.about}</div>
            <div className="detail-bio">{person.bio}</div>
          </div>
        )}

        {/* Family */}
        {(father || mother || spouses.length > 0 || children.length > 0 || siblings.length > 0) && (
          <div className="detail-section">
            <div className="detail-section-title">{t.family}</div>
            <div className="detail-relations">
              {father && <RelationChip label={t.father} person={father} onSelect={onSelect} personMap={personMap} />}
              {mother && <RelationChip label={t.mother} person={mother} onSelect={onSelect} personMap={personMap} />}
              {spouses.map(s   => <RelationChip key={s.id}  label={t.spouse}  person={s}   onSelect={onSelect} personMap={personMap} />)}
              {children.map(c  => <RelationChip key={c.id}  label={t.child}   person={c}   onSelect={onSelect} personMap={personMap} />)}
              {siblings.slice(0, 5).map(s => <RelationChip key={s.id} label={t.sibling} person={s} onSelect={onSelect} personMap={personMap} />)}
              {siblings.length > 5 && (
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', padding: '4px 10px' }}>
                  {t.moreSiblings(siblings.length - 5)}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── Photo lightbox ── */}
      {lightbox && (
        <div className="photo-lightbox" onClick={() => setLightbox(false)}>
          <button className="photo-lightbox-close" onClick={() => setLightbox(false)} title="Close (Esc)">✕</button>
          <img
            src={person.photo}
            alt={person.name}
            className="photo-lightbox-img"
            onClick={e => e.stopPropagation()}
          />
          <div className="photo-lightbox-name">{person.name}</div>
        </div>
      )}
    </aside>
  );
}

function RelationChip({ label, person, onSelect, personMap }) {
  return (
    <button className="relation-chip" onClick={() => onSelect(person)}>
      <Avatar person={person} size="xs" className="rel-avatar" />
      <span className="rel-label">{label}</span>
      <span className="rel-name">{person.name}</span>
    </button>
  );
}
