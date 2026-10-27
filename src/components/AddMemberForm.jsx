import { useId, useMemo, useRef, useState } from 'react';
import { Plus, X, Upload, ScrollText } from 'lucide-react';
import { upload } from '@vercel/blob/client';
import TagInput from './TagInput';
import PhotoFramer from './PhotoFramer';
import { RECORD_KEEPER_TAG, isRecordKeeper, HIDDEN_TAGS } from '../utils/recordKeeper';
import { parsePhoto, buildPhoto, DEFAULT_FOCUS } from '../utils/photoFocus';

function generateId(name) {
  const base = name
    .replace(/[ऀ-ॿ]+/g, '') // strip Devanagari
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '') || 'member';
  return `${base}-${Date.now().toString(36)}`;
}

// Sentinel for "insert as the eldest (first) sibling" — must match
// api/_lib/db.js's INSERT_AS_FIRST_SIBLING.
const FIRST_SIBLING = '__first__';

const EMPTY = {
  name: '', gender: 'male', parentId: '', motherId: '', spouseIds: [], insertAfterId: '',
  born: '', died: '', dom: '', alive: true,
  occupation: '', location: '', bio: '', tags: [], keeper: false,
  photoSrc: '', photoX: DEFAULT_FOCUS.x, photoY: DEFAULT_FOCUS.y,
};

function formFromPerson(person) {
  const photo = parsePhoto(person.photo);
  return {
    name:       person.name || '',
    gender:     person.gender || 'male',
    parentId:   person.parentId || '',
    motherId:   person.motherId || '',
    spouseIds:  person.spouseIds || [],
    insertAfterId: '',
    born:       person.born || '',
    died:       person.died || '',
    dom:        person.dom || '',
    alive:      person.alive === true,
    occupation: person.occupation || '',
    location:   person.location || '',
    bio:        person.bio || '',
    tags:       (person.tags || []).filter(t => t && t !== RECORD_KEEPER_TAG),
    keeper:     isRecordKeeper(person),
    photoSrc:   photo.src,
    photoX:     photo.x,
    photoY:     photo.y,
  };
}

function Field({ id, label, required, hint, error, children }) {
  return (
    <div className={`field${error ? ' has-error' : ''}`}>
      <label className="field-label" htmlFor={id}>{label}{required && <span className="amf-req"> *</span>}</label>
      {children}
      {error
        ? <p className="field-error" id={`${id}-err`} role="alert">{error}</p>
        : hint && <p className="field-hint" id={`${id}-hint`}>{hint}</p>}
    </div>
  );
}

export default function AddMemberForm({ people, person, onSubmit, onCancel }) {
  const isEdit = !!person;
  const uid = useId();
  const id = name => `${uid}-${name}`;
  const formRef = useRef(null);

  const [form, setForm] = useState(() => (isEdit ? formFromPerson(person) : EMPTY));
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');

  const set = (field, val) => {
    setForm(f => ({ ...f, [field]: val }));
    if (errors[field]) setErrors(e => ({ ...e, [field]: undefined }));
  };

  // Marking someone deceased pre-fills today's date as the death date (still
  // editable before saving); marking them alive again clears it. The cleared
  // value is remembered so toggling back restores it — a stray tap on an
  // existing member must not lose their real death date.
  const stashedDied = useRef('');
  const handleAliveChange = (alive) => {
    setForm(f => {
      if (alive) {
        stashedDied.current = f.died.trim() || stashedDied.current;
        return { ...f, alive: true, died: '' };
      }
      const today = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
      return { ...f, alive: false, died: f.died.trim() || stashedDied.current || today };
    });
  };

  const handlePhotoFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setUploadError('');
    try {
      const blob = await upload(`photos/${Date.now()}-${file.name}`, file, {
        access: 'public',
        handleUploadUrl: '/api/photo-upload',
      });
      setForm(f => ({ ...f, photoSrc: blob.url, photoX: DEFAULT_FOCUS.x, photoY: DEFAULT_FOCUS.y }));
      setErrors(er => ({ ...er, photo: undefined }));
    } catch (err) {
      setUploadError(err.message || 'Upload failed.');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const validate = () => {
    const next = {};
    if (!form.name.trim()) next.name = 'Name is required.';
    const src = form.photoSrc.trim();
    if (src && !/^(https?:\/\/|\/)/i.test(src)) next.photo = 'Use a full https:// link or a path like /photos/name.jpg.';
    return next;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const found = validate();
    setErrors(found);
    if (Object.keys(found).length) {
      setError('');
      // Move to the first problem once the error state has rendered.
      setTimeout(() => formRef.current?.querySelector('[aria-invalid="true"]')?.focus(), 0);
      return;
    }
    setError('');
    setSaving(true);

    const tags = [...form.tags, ...(form.keeper ? [RECORD_KEEPER_TAG] : [])];
    // Emptied optional fields are sent as null: the edit handler merges the
    // payload over the stored person, so an omitted key would silently keep
    // the old value.
    const payload = {
      id:         isEdit ? person.id : generateId(form.name),
      name:       form.name.trim(),
      gender:     form.gender,
      born:       form.born.trim()  || null,
      died:       form.alive ? null : (form.died.trim() || null),
      dom:        form.dom.trim()   || null,
      alive:      form.alive,
      parentId:   form.parentId  || null,
      motherId:   form.motherId  || null,
      spouseIds:  form.spouseIds,
      occupation: form.occupation.trim() || null,
      location:   form.location.trim()   || null,
      bio:        form.bio.trim()        || null,
      photo:      buildPhoto(form.photoSrc, form.photoX, form.photoY) || null,
      tags,
    };

    await onSubmit(payload, isEdit ? undefined : (form.insertAfterId || undefined));
    setSaving(false);
    if (!isEdit) setForm(EMPTY);
  };

  // People usable as parents/spouses (exclude self when editing)
  const parentOptions = people.filter(p => p.id !== person?.id);
  const spouseOptions = people.filter(p => p.id !== form.parentId && p.id !== person?.id && !form.spouseIds.includes(p.id));
  const nameOf = pid => people.find(p => p.id === pid)?.name || pid;

  // No parent + a spouse = married into the family, not born into it — they
  // render inside their spouse's couple bubble regardless of sort_order, so
  // sibling positioning is meaningless for them.
  const isMarriedInSpouse = !form.parentId && form.spouseIds.length > 0;

  // At root level, parentId===null also covers unrelated married-in and
  // placeholder spouses elsewhere in the tree — isGenuineRoot excludes
  // those so the position list only offers actual root ancestors.
  const isGenuineRoot = (p) => {
    if (p.parentId) return false;
    const isSpouseOfLineageMember = people.some(other => other.parentId && (other.spouseIds || []).includes(p.id));
    const isSpouseOfMaleRoot = people.some(other => !other.parentId && other.gender === 'male' && (other.spouseIds || []).includes(p.id));
    return !isSpouseOfLineageMember && !isSpouseOfMaleRoot;
  };
  const siblingOptions = form.parentId
    ? people.filter(p => p.parentId === form.parentId && p.id !== person?.id)
    : people.filter(p => isGenuineRoot(p) && p.id !== person?.id);

  // Mother options are the selected father's own spouses — parentId alone
  // can't distinguish which wife a child belongs to when there's more than
  // one, so this is a separate, explicit choice rather than inferred.
  const father = people.find(p => p.id === form.parentId);
  const motherOptions = father ? (father.spouseIds || []).map(pid => people.find(p => p.id === pid)).filter(Boolean) : [];

  // Existing tags by use, for suggestions (reserved/UI-driving tags excluded).
  const tagSuggestions = useMemo(() => {
    const counts = new Map();
    people.forEach(p => (p.tags || []).forEach(t => { if (t && !HIDDEN_TAGS.has(t)) counts.set(t, (counts.get(t) || 0) + 1); }));
    return [...counts].sort((a, b) => b[1] - a[1]).map(([tag, count]) => ({ tag, count }));
  }, [people]);

  return (
    <form className="amf" ref={formRef} onSubmit={handleSubmit} noValidate>
      <div className="amf-scroll">

        {/* ── Basics ── */}
        <section className="amf-section">
          <h4 className="amf-section-title">Basics</h4>

          <Field id={id('name')} label="Name" required error={errors.name}>
            <input
              id={id('name')} className="amf-input" placeholder="Full name (Hindi or English)"
              value={form.name} onChange={e => set('name', e.target.value)}
              aria-invalid={!!errors.name} aria-describedby={errors.name ? `${id('name')}-err` : undefined}
              autoFocus={!isEdit}
            />
          </Field>

          <div className="field">
            <span className="field-label" id={id('gender')}>Gender</span>
            <div className="seg-radio" role="radiogroup" aria-labelledby={id('gender')}>
              {['male', 'female'].map(g => (
                <label key={g} className={form.gender === g ? 'on' : ''}>
                  <input type="radio" name={id('gender-radio')} value={g} checked={form.gender === g} onChange={() => set('gender', g)} />
                  {g === 'male' ? '♂ Male' : '♀ Female'}
                </label>
              ))}
            </div>
          </div>

          <label className="switch-row">
            <input type="checkbox" checked={form.alive} onChange={e => handleAliveChange(e.target.checked)} />
            <span>Currently alive</span>
            <small>Untick to mark as deceased — today’s date is filled in for you.</small>
          </label>

          <div className="field-row">
            <Field id={id('born')} label="Born">
              <input id={id('born')} className="amf-input" placeholder="e.g. 1965 or 12 Jan 1965"
                value={form.born} onChange={e => set('born', e.target.value)} />
            </Field>
            <Field id={id('died')} label="Died">
              <input id={id('died')} className="amf-input" placeholder={form.alive ? 'Alive' : 'e.g. 2011 or 23 Apr 2011'}
                value={form.died} onChange={e => set('died', e.target.value)} disabled={form.alive} />
            </Field>
          </div>

          <Field id={id('dom')} label="Marriage date" hint="Free text — a date, or notes such as the tithi.">
            <textarea id={id('dom')} className="amf-textarea" rows={2} placeholder="Date of marriage"
              value={form.dom} onChange={e => set('dom', e.target.value)} />
          </Field>
        </section>

        {/* ── Family ── */}
        <section className="amf-section">
          <h4 className="amf-section-title">Family</h4>

          <Field id={id('parent')} label="Father / parent"
            hint={isMarriedInSpouse ? 'No parent and married: they will appear next to their spouse in the tree, not as a separate ancestor.' : undefined}>
            <select id={id('parent')} className="amf-select" value={form.parentId} onChange={e => {
              const newParentId = e.target.value;
              const newFather = people.find(p => p.id === newParentId);
              const newMotherOptions = newFather ? (newFather.spouseIds || []).map(pid => people.find(p => p.id === pid)).filter(Boolean) : [];
              setForm(f => ({
                ...f,
                parentId: newParentId,
                insertAfterId: '',
                motherId: newMotherOptions.length === 1 ? newMotherOptions[0].id : '',
              }));
            }}>
              <option value="">{form.spouseIds.length ? '— None (married in, no blood parent) —' : '— None (root ancestor) —'}</option>
              {parentOptions.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </Field>

          {/* Mother — only meaningful once a father is picked and he has a spouse on record */}
          {father && motherOptions.length > 0 && (
            <Field id={id('mother')} label="Mother">
              <select id={id('mother')} className="amf-select" value={form.motherId} onChange={e => set('motherId', e.target.value)}>
                {motherOptions.length > 1 && <option value="">— Select mother —</option>}
                {motherOptions.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
            </Field>
          )}

          {/* Position among siblings — new additions only; editing never repositions */}
          {!isEdit && !isMarriedInSpouse && siblingOptions.length > 0 && (
            <Field id={id('pos')} label="Position among siblings">
              <select id={id('pos')} className="amf-select" value={form.insertAfterId} onChange={e => set('insertAfterId', e.target.value)}>
                <option value="">— Add as youngest (default) —</option>
                <option value={FIRST_SIBLING}>— Add as eldest —</option>
                {siblingOptions.map(p => <option key={p.id} value={p.id}>Insert after: {p.name}</option>)}
              </select>
            </Field>
          )}

          {/* Spouses — any number; the server mirrors changes onto the other person */}
          <div className="field">
            <label className="field-label" htmlFor={id('spouse')}>Spouses</label>
            {form.spouseIds.length > 0 && (
              <ul className="spouse-list">
                {form.spouseIds.map(sid => (
                  <li key={sid}>
                    <span>{nameOf(sid)}</span>
                    <button type="button" aria-label={`Remove spouse ${nameOf(sid)}`}
                      onClick={() => set('spouseIds', form.spouseIds.filter(x => x !== sid))}><X size={14} /></button>
                  </li>
                ))}
              </ul>
            )}
            <select id={id('spouse')} className="amf-select" value=""
              onChange={e => e.target.value && set('spouseIds', [...form.spouseIds, e.target.value])}>
              <option value="">{form.spouseIds.length ? '+ Add another spouse…' : '+ Add a spouse…'}</option>
              {spouseOptions.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
        </section>

        {/* ── Details ── */}
        <section className="amf-section">
          <h4 className="amf-section-title">Details</h4>
          <div className="field-row">
            <Field id={id('occ')} label="Occupation">
              <input id={id('occ')} className="amf-input" placeholder="e.g. Farmer, Engineer…"
                value={form.occupation} onChange={e => set('occupation', e.target.value)} />
            </Field>
            <Field id={id('loc')} label="Location">
              <input id={id('loc')} className="amf-input" placeholder="Village / City"
                value={form.location} onChange={e => set('location', e.target.value)} />
            </Field>
          </div>

          <Field id={id('bio')} label="Bio">
            <textarea id={id('bio')} className="amf-textarea" rows={5} placeholder="Short biography…"
              value={form.bio} onChange={e => set('bio', e.target.value)} />
          </Field>

          <div className="field">
            <span className="field-label">Tags</span>
            <TagInput value={form.tags} onChange={t => set('tags', t)} suggestions={tagSuggestions} />
            <button type="button" className={`keeper-toggle${form.keeper ? ' on' : ''}`} aria-pressed={form.keeper}
              onClick={() => set('keeper', !form.keeper)}>
              <ScrollText size={16} /> Record keeper
              <small>{form.keeper ? 'Marked as a record keeper' : 'Mark as someone who preserved this Vanshavali'}</small>
            </button>
          </div>
        </section>

        {/* ── Photo ── */}
        <section className="amf-section">
          <h4 className="amf-section-title">Photo</h4>
          <Field id={id('photo')} label="Photo link or upload" error={errors.photo}>
            <div className="amf-photo-row">
              <input id={id('photo')} className="amf-input" placeholder="https://… or /photos/name.jpg"
                value={form.photoSrc}
                onChange={e => setForm(f => ({ ...f, photoSrc: e.target.value, photoX: DEFAULT_FOCUS.x, photoY: DEFAULT_FOCUS.y }))}
                aria-invalid={!!errors.photo} aria-describedby={errors.photo ? `${id('photo')}-err` : undefined} />
              <label className={`amf-photo-upload-btn${uploading ? ' amf-photo-upload-btn-disabled' : ''}`}>
                <Upload size={14} /> {uploading ? 'Uploading…' : 'Upload'}
                <input type="file" accept="image/*" hidden onChange={handlePhotoFile} disabled={uploading} />
              </label>
            </div>
          </Field>
          {uploadError && <p className="field-error" role="alert">{uploadError}</p>}
          <PhotoFramer
            src={form.photoSrc.trim()}
            x={form.photoX}
            y={form.photoY}
            onChange={(x, y) => setForm(f => ({ ...f, photoX: x, photoY: y }))}
          />
        </section>

      </div>

      {error && <div className="amf-error">{error}</div>}

      <div className="amf-actions">
        <button type="button" className="amf-btn-cancel" onClick={onCancel}>Cancel</button>
        <button type="submit" className="amf-btn-save" disabled={saving || uploading}>
          {saving ? 'Saving…' : isEdit ? 'Save changes' : <><Plus size={16} /> Add member</>}
        </button>
      </div>
    </form>
  );
}
