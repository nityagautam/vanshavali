import { useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { X, Pencil, ArrowUp, ArrowDown, ScrollText } from 'lucide-react';
import Avatar from './Avatar';
import Sheet from './Sheet';
import { usePhone } from '../hooks/useMediaQuery';
import { isRecordKeeper, HIDDEN_TAGS } from '../utils/recordKeeper';
import { photoSrc } from '../utils/photoFocus';

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
    present: 'वर्तमान', children: 'संतान', siblings: 'भाई/बहन',
    keeper: 'अभिलेख संरक्षक', keeperSub: 'इस वंशावली को सहेजने और आगे बढ़ाने वाले',
    moveUp: 'ऊपर', moveDown: 'नीचे', edit: 'संपादित करें',
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
    present: 'present', children: 'Children', siblings: 'Siblings',
    keeper: 'Record keeper', keeperSub: 'Preserved and carried this Vanshavali forward',
    moveUp: 'Move up', moveDown: 'Move down', edit: 'Edit',
    moreSiblings: (n) => `+${n} more siblings`,
    noDetails: 'No details yet. Update family.json to add information.',
  },
};

const GEN_VARS = ['var(--g1)', 'var(--g2)', 'var(--g3)', 'var(--g4)'];

// Generation = steps up the parentId chain; spouses take their partner's.
function generationOf(person, personMap, people) {
  const depthOf = p => { let d = 0, cur = p; while (cur?.parentId && d < 50) { cur = personMap[cur.parentId]; d++; } return d; };
  let d = depthOf(person);
  if (!person.parentId) {
    const partner = people.find(o => (o.spouseIds || []).includes(person.id) && o.parentId);
    if (partner) d = depthOf(partner);
  }
  return d;
}

export default function DetailPanel({ suspended = false, ...props }) {
  const isPhone = usePhone();
  const [snap, setSnap] = useState('half');
  const { person, onClose } = props;

  if (isPhone) {
    return (
      <Sheet
        key={person.id}
        open={!suspended}
        onOpenChange={o => { if (!o) onClose(); }}
        title={person.name}
        hideTitle
        snap={snap}
        onSnapChange={setSnap}
      >
        <DetailContent {...props} variant="sheet" />
      </Sheet>
    );
  }
  return (
    <aside className="panel" aria-label={`${person.name} details`}>
      <DetailContent {...props} variant="panel" />
    </aside>
  );
}

function DetailContent({ person, personMap, people, onClose, onSelect, onEdit, onReorder, isAdmin, lang = 'hi', variant }) {
  const [lightbox, setLightbox] = useState(false);

  const formatDate = (d) => (d === null || d === undefined || d === '' ? null : String(d));
  const born = formatDate(person.born);
  const died = formatDate(person.died);
  const dom  = formatDate(person.dom);

  const extraFields = Object.entries(person).filter(
    ([key, val]) => !KNOWN_FIELDS.has(key) && val !== null && val !== undefined && val !== ''
  );
  const spouses = (person.spouseIds || []).map(id => personMap[id]).filter(Boolean);
  // parentId is always the father/primary parent, so it alone can't tell a
  // wife's own children apart from her co-wives'. If this person is ever
  // listed as parentId for someone, they're the primary side — show every
  // child, across all spouses. Otherwise (a spouse, not the primary line)
  // show only the children whose motherId points at them specifically.
  const childrenAsPrimary = people.filter(p => p.parentId === person.id);
  const children = childrenAsPrimary.length > 0
    ? childrenAsPrimary
    : people.filter(p => p.motherId === person.id);
  const father = person.parentId ? personMap[person.parentId] : null;
  const mother = person.motherId ? personMap[person.motherId] : null;
  // parentId===null covers three unrelated cases: genuine unattached roots,
  // married-in spouses, and placeholder spouses. Only true roots have real
  // "siblings". Mirrors FamilyTree.jsx's own root-detection logic.
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
  // for the bundled snapshot before the live datastore responds; treat that
  // as "unknown position" and leave the buttons enabled.
  const orderedSiblings = [...siblings, person].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
  const ownIndex = orderedSiblings.findIndex(p => p.id === person.id);
  const canMoveUp   = person.sortOrder !== undefined && ownIndex > 0;
  const canMoveDown = person.sortOrder !== undefined && ownIndex < orderedSiblings.length - 1;

  const isPlaceholder = person.tags?.includes('placeholder');
  const isDeceased    = person.alive !== true && !isPlaceholder;
  const t = lang === 'en' ? LABELS.en : LABELS.hi; // 'both' uses Hindi labels (Hindi-first app)

  const gen = generationOf(person, personMap, people);
  const years = (born || died)
    ? `${born || '?'}${isDeceased ? ` – ${died || '?'}` : ` – ${t.present}`}`
    : null;
  const status = isPlaceholder ? null : isDeceased ? t.deceased : t.living;

  const Person = ({ p }) => (
    <button type="button" className="link-person" onClick={() => onSelect(p)}>{p.name}</button>
  );
  const rows = [
    father && [t.father, <Person key="f" p={father} />],
    mother && [t.mother, <Person key="m" p={mother} />],
    spouses.length > 0 && [t.spouse, spouses.map((sp, i) => <span key={sp.id}>{i > 0 && ', '}<Person p={sp} /></span>)],
    born && [t.born, born],
    died && [t.died, died],
    dom && [t.married, dom],
    person.occupation && !isPlaceholder && [t.occupation, person.occupation],
    person.location && [t.location, person.location],
    ...extraFields.map(([key, val]) => [toLabel(key), Array.isArray(val) ? val.join(', ') : String(val)]),
    isAdmin && person.sortOrder !== undefined && ['Sort Order', person.sortOrder],
  ].filter(Boolean);

  const Kid = ({ p }) => (
    <button type="button" className="kid" onClick={() => onSelect(p)}>
      <Avatar person={p} size="xs" />
      <span className="kid-text">
        <span className="kid-name">{p.name}</span>
        {p.born && <span className="kid-meta">b. {String(p.born).slice(0, 4)}</span>}
      </span>
    </button>
  );

  return (
    <div className={`detail detail-${variant}`}>
      <button className="detail-close" onClick={onClose} aria-label="Close"><X size={20} /></button>

      <div className="detail-head" style={{ '--gen-color': GEN_VARS[gen % GEN_VARS.length] }}>
        <button
          type="button"
          className={`detail-avatar${person.photo && !isPlaceholder ? ' has-photo' : ''}`}
          onClick={() => person.photo && !isPlaceholder && setLightbox(true)}
          aria-label={person.photo ? `Enlarge photo of ${person.name}` : undefined}
          tabIndex={person.photo && !isPlaceholder ? 0 : -1}
        >
          <Avatar person={person} size="lg" />
        </button>
        <div className="detail-id">
          <h3>{person.name}</h3>
          {(years || status) && <div className="years">{[years, status].filter(Boolean).join(' · ')}</div>}
        </div>
      </div>

      {isRecordKeeper(person) && (
        <div className="keeper-banner">
          <ScrollText size={20} aria-hidden="true" />
          <div><b>{t.keeper}</b><span>{t.keeperSub}</span></div>
        </div>
      )}

      {isAdmin && (
        <div className="detail-actions">
          <button className="btn-ghost" onClick={() => onEdit(person)}><Pencil size={16} /> {t.edit}</button>
          {siblings.length > 0 && (
            <>
              <button className="btn-ghost" onClick={() => onReorder(person, 'up')} disabled={!canMoveUp}
                title={t.moveUp} aria-label={t.moveUp}><ArrowUp size={16} /></button>
              <button className="btn-ghost" onClick={() => onReorder(person, 'down')} disabled={!canMoveDown}
                title={t.moveDown} aria-label={t.moveDown}><ArrowDown size={16} /></button>
            </>
          )}
        </div>
      )}

      {rows.length > 0 ? (
        <dl>
          {rows.map(([k, v]) => (<div key={k} className="dl-row"><dt>{k}</dt><dd>{v}</dd></div>))}
        </dl>
      ) : (
        <p className="detail-empty">{t.noDetails}</p>
      )}

      {person.bio && (
        <>
          <h4 className="group-title">{t.about}</h4>
          <p className="detail-bio">{person.bio}</p>
        </>
      )}

      {(person.tags || []).filter(x => x && !HIDDEN_TAGS.has(x)).length > 0 && (
        <div className="detail-tags">
          {(person.tags || []).filter(x => x && !HIDDEN_TAGS.has(x)).map(tag => (
            <span key={tag} className="tag">{tag}</span>
          ))}
        </div>
      )}

      {children.length > 0 && (
        <>
          <h4 className="group-title">{t.children} · {children.length}</h4>
          <div className="kids">{children.map(c => <Kid key={c.id} p={c} />)}</div>
        </>
      )}

      {siblings.length > 0 && (
        <>
          <h4 className="group-title">{t.siblings} · {siblings.length}</h4>
          <div className="kids">
            {siblings.slice(0, 5).map(sb => <Kid key={sb.id} p={sb} />)}
            {siblings.length > 5 && <div className="detail-more">{t.moreSiblings(siblings.length - 5)}</div>}
          </div>
        </>
      )}

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
            <img src={photoSrc(person.photo)} alt={person.name} className="photo-lightbox-img" />
            <div className="photo-lightbox-name">{person.name}</div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
}
