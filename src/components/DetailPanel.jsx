import { useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { X, Pencil, ZoomIn, ArrowUp, ArrowDown } from 'lucide-react';
import Avatar from './Avatar';
import { getTagStyle } from '../utils/tagColor';

// Fields already rendered explicitly — excluded from the dynamic "extra" section
const KNOWN_FIELDS = new Set([
  'id', 'name', 'gender', 'born', 'died', 'alive', 'dom',
  'parentId', 'motherId', 'spouseIds', 'occupation',
  'location', 'bio', 'tags', 'photo',
  'sortOrder', // internal ordering metadata — shown separately, admin-only
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

export default function DetailPanel({ person, personMap, people, onClose, onSelect, onEdit, onReorder, isAdmin, lang = 'hi' }) {
  const [lightbox, setLightbox] = useState(false);

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
  // parentId is always the father/primary parent, so it alone can't tell a
  // wife's own children apart from her co-wives'. If this person is ever
  // listed as parentId for someone, they're the primary side — show every
  // child, across all spouses. Otherwise (a spouse, not the primary line)
  // show only the children whose motherId points at them specifically.
  const childrenAsPrimary = people.filter(p => p.parentId === person.id);
  const children = childrenAsPrimary.length > 0
    ? childrenAsPrimary
    : people.filter(p => p.motherId === person.id);
  const father   = person.parentId ? personMap[person.parentId] : null;
  const mother   = person.motherId ? personMap[person.motherId] : null;
  // parentId===null covers three unrelated cases: genuine unattached roots,
  // married-in spouses, and placeholder spouses. Only true roots have real
  // "siblings" — a married-in spouse has no blood relatives here at all, so
  // grouping them by shared null parentId would wrongly show every spouse
  // in the whole tree as everyone else's sibling. Mirrors FamilyTree.jsx's
  // own root-detection logic.
  const isGenuineRoot = (p) => {
    if (p.parentId) return false;
    const isSpouseOfLineageMember = people.some(other => other.parentId && (other.spouseIds || []).includes(p.id));
    const isSpouseOfMaleRoot = people.some(other => !other.parentId && other.gender === 'male' && (other.spouseIds || []).includes(p.id));
    return !isSpouseOfLineageMember && !isSpouseOfMaleRoot;
  };
  const siblings = person.parentId
    ? people.filter(p => p.parentId === person.parentId && p.id !== person.id)
    : (isGenuineRoot(person) ? people.filter(p => isGenuineRoot(p) && p.id !== person.id) : []);

  // Position among ALL same-parent siblings (including self) in sort_order —
  // used to disable Move Up/Down at the boundaries. sortOrder is undefined
  // for the bundled build-time snapshot before the live datastore responds;
  // treat that as "unknown position" and just leave the buttons enabled.
  const orderedSiblings = [...siblings, person].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
  const ownIndex = orderedSiblings.findIndex(p => p.id === person.id);
  const canMoveUp   = person.sortOrder !== undefined && ownIndex > 0;
  const canMoveDown = person.sortOrder !== undefined && ownIndex < orderedSiblings.length - 1;

  const isPlaceholder = person.tags?.includes('placeholder');
  const isDeceased    = person.alive !== true && !isPlaceholder;

  // 'both' uses Hindi labels since the app is Hindi-first
  const t = lang === 'en' ? LABELS.en : LABELS.hi;

  return (
    <aside className="detail-panel">
      {/* ── Photo hero ── */}
      <div className="detail-photo-hero">
        <button className="detail-close" onClick={onClose} title="Close"><X size={16} /></button>
        {isAdmin && (
          <button className="detail-edit" onClick={() => onEdit(person)} title="Edit member"><Pencil size={14} /></button>
        )}
        {isAdmin && siblings.length > 0 && (
          <>
            <button
              className="detail-move-up"
              onClick={() => onReorder(person, 'up')}
              disabled={!canMoveUp}
              title="Move up (earlier among siblings)"
            >
              <ArrowUp size={14} />
            </button>
            <button
              className="detail-move-down"
              onClick={() => onReorder(person, 'down')}
              disabled={!canMoveDown}
              title="Move down (later among siblings)"
            >
              <ArrowDown size={14} />
            </button>
          </>
        )}
        <div
          className={`detail-photo-avatar-wrap${person.photo ? ' has-photo' : ''}`}
          onClick={() => person.photo && setLightbox(true)}
          title={person.photo ? 'Click to enlarge photo' : undefined}
        >
          <Avatar person={person} size="lg" className="detail-photo-avatar" />
          {person.photo && <span className="detail-photo-zoom-hint"><ZoomIn size={18} /></span>}
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
            <span className="card-tag" style={{ background: 'rgba(243,244,246,0.9)', color: '#4B5563', border: '1px solid rgba(209,213,219,0.6)' }}>{t.deceased}</span>
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
          {isAdmin && person.sortOrder !== undefined && (
            <div className="detail-row" style={{ color: 'var(--text-muted)' }}>
              <span className="label">Sort Order</span>
              <span className="value">{person.sortOrder}</span>
            </div>
          )}
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
      <Dialog.Root open={lightbox} onOpenChange={setLightbox}>
        <Dialog.Portal>
          <Dialog.Content
            className="photo-lightbox"
            onClick={e => { if (e.target === e.currentTarget) setLightbox(false); }}
          >
            <Dialog.Title asChild><span className="sr-only">{person.name} photo</span></Dialog.Title>
            <Dialog.Description asChild><span className="sr-only">Enlarged photo of {person.name}</span></Dialog.Description>
            <Dialog.Close asChild>
              <button className="photo-lightbox-close" title="Close (Esc)"><X size={22} /></button>
            </Dialog.Close>
            <img src={person.photo} alt={person.name} className="photo-lightbox-img" />
            <div className="photo-lightbox-name">{person.name}</div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
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
