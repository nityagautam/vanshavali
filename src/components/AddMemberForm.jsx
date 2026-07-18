import { useState } from 'react';
import { Plus } from 'lucide-react';
import { upload } from '@vercel/blob/client';

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
  name: '', gender: 'male', parentId: '', spouseId: '', insertAfterId: '',
  born: '', died: '', alive: true,
  occupation: '', location: '', bio: '', tags: '', photo: '',
};

function formFromPerson(person) {
  return {
    name:       person.name || '',
    gender:     person.gender || 'male',
    parentId:   person.parentId || '',
    spouseId:   person.spouseIds?.[0] || '',
    born:       person.born || '',
    died:       person.died || '',
    alive:      person.alive === true,
    occupation: person.occupation || '',
    location:   person.location || '',
    bio:        person.bio || '',
    tags:       (person.tags || []).join(', '),
    photo:      person.photo || '',
  };
}

export default function AddMemberForm({ people, person, onSubmit, onCancel }) {
  const isEdit = !!person;
  const [form, setForm] = useState(() => (isEdit ? formFromPerson(person) : EMPTY));
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');

  // Spouses beyond the first aren't editable in this single-select form —
  // preserve them untouched instead of dropping them on save.
  const extraSpouseIds = isEdit ? (person.spouseIds || []).slice(1) : [];

  const set = (field, val) => setForm(f => ({ ...f, [field]: val }));

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
      set('photo', blob.url);
    } catch (err) {
      setUploadError(err.message || 'Upload failed.');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) { setError('Name is required.'); return; }
    setError('');
    setSaving(true);

    const spouseIds = [
      ...(form.spouseId ? [form.spouseId] : []),
      ...extraSpouseIds,
    ];

    const payload = {
      id:         isEdit ? person.id : generateId(form.name),
      name:       form.name.trim(),
      gender:     form.gender,
      born:       form.born.trim()  || null,
      died:       form.died.trim()  || null,
      alive:      form.alive,
      parentId:   form.parentId  || null,
      spouseIds,
      occupation: form.occupation.trim() || undefined,
      location:   form.location.trim()   || undefined,
      bio:        form.bio.trim()        || undefined,
      photo:      form.photo.trim()      || undefined,
      tags:       form.tags.split(',').map(t => t.trim()).filter(Boolean),
    };

    // Remove undefined keys
    Object.keys(payload).forEach(k => payload[k] === undefined && delete payload[k]);

    await onSubmit(payload, isEdit ? undefined : (form.insertAfterId || undefined));
    setSaving(false);
    if (!isEdit) setForm(EMPTY);
  };

  // People usable as parents/spouses (exclude self when editing)
  const parentOptions = people.filter(p => p.id !== person?.id);
  const spouseOptions = people.filter(p => p.id !== form.parentId && p.id !== person?.id);

  // No parent + a spouse selected = married into the family, not born into
  // it — they render inside their spouse's couple bubble regardless of
  // sort_order, so sibling positioning is meaningless for them.
  const isMarriedInSpouse = !form.parentId && !!form.spouseId;

  // Existing children of the currently-selected parent (root-level when
  // parentId is empty) — lets the admin place the new person exactly
  // instead of always appending as the youngest. Not shown for a
  // married-in spouse (see isMarriedInSpouse above).
  const siblingOptions = people.filter(p =>
    (p.parentId || '') === (form.parentId || '') && p.id !== person?.id
  );

  return (
    <form className="amf" onSubmit={handleSubmit} noValidate>
      <div className="amf-grid">

        {/* Name */}
        <label className="amf-label">Name <span className="amf-req">*</span></label>
        <input
          className="amf-input"
          placeholder="Full name (Hindi or English)"
          value={form.name}
          onChange={e => set('name', e.target.value)}
          autoFocus
        />

        {/* Gender */}
        <label className="amf-label">Gender</label>
        <div className="amf-radio-row">
          {['male', 'female'].map(g => (
            <label key={g} className="amf-radio">
              <input type="radio" name="gender" value={g}
                checked={form.gender === g}
                onChange={() => set('gender', g)} />
              {g === 'male' ? '♂ Male' : '♀ Female'}
            </label>
          ))}
        </div>

        {/* Parent */}
        <label className="amf-label">Father / Parent</label>
        <select className="amf-select" value={form.parentId} onChange={e => setForm(f => ({ ...f, parentId: e.target.value, insertAfterId: '' }))}>
          <option value="">{form.spouseId ? '— None (married in, no blood parent) —' : '— None (root ancestor) —'}</option>
          {parentOptions.map(p => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
        {isMarriedInSpouse && (
          <div className="amf-hint" style={{ gridColumn: '2 / -1', fontSize: '0.78rem', color: 'var(--text-muted)', margin: '-6px 0 4px' }}>
            No parent, married to the selected spouse — they'll appear next to their spouse in the tree, not as a separate ancestor.
          </div>
        )}

        {/* Position among siblings — new additions only; editing never repositions;
            meaningless for a married-in spouse, see isMarriedInSpouse above */}
        {!isEdit && !isMarriedInSpouse && siblingOptions.length > 0 && (
          <>
            <label className="amf-label">Position</label>
            <select className="amf-select" value={form.insertAfterId} onChange={e => set('insertAfterId', e.target.value)}>
              <option value="">— Add as youngest (default) —</option>
              <option value={FIRST_SIBLING}>— Add as eldest —</option>
              {siblingOptions.map(p => (
                <option key={p.id} value={p.id}>Insert after: {p.name}</option>
              ))}
            </select>
          </>
        )}

        {/* Spouse */}
        <label className="amf-label">Spouse</label>
        <select className="amf-select" value={form.spouseId} onChange={e => set('spouseId', e.target.value)}>
          <option value="">— None —</option>
          {spouseOptions.map(p => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>

        {/* Alive */}
        <label className="amf-label">Status</label>
        <label className="amf-radio">
          <input type="checkbox" checked={form.alive} onChange={e => set('alive', e.target.checked)} />
          Currently alive
        </label>

        {/* Born */}
        <label className="amf-label">Born</label>
        <input className="amf-input" placeholder="e.g. 1965 or 12 Jan 1965"
          value={form.born} onChange={e => set('born', e.target.value)} />

        {/* Died */}
        <label className="amf-label">Died</label>
        <input className="amf-input" placeholder="Leave blank if alive"
          value={form.died} onChange={e => set('died', e.target.value)}
          disabled={form.alive} />

        {/* Occupation */}
        <label className="amf-label">Occupation</label>
        <input className="amf-input" placeholder="e.g. Farmer, Engineer…"
          value={form.occupation} onChange={e => set('occupation', e.target.value)} />

        {/* Location */}
        <label className="amf-label">Location</label>
        <input className="amf-input" placeholder="Village / City"
          value={form.location} onChange={e => set('location', e.target.value)} />

        {/* Tags */}
        <label className="amf-label">Tags</label>
        <input className="amf-input" placeholder="elder, wise, legendary  (comma separated)"
          value={form.tags} onChange={e => set('tags', e.target.value)} />

        {/* Photo */}
        <label className="amf-label">Photo</label>
        <div>
          <div className="amf-photo-row">
            <input className="amf-input" placeholder="https://… or /photos/name.jpg"
              value={form.photo} onChange={e => set('photo', e.target.value)} />
            <label className={`amf-photo-upload-btn${uploading ? ' amf-photo-upload-btn-disabled' : ''}`}>
              {uploading ? 'Uploading…' : 'Upload'}
              <input type="file" accept="image/*" hidden onChange={handlePhotoFile} disabled={uploading} />
            </label>
          </div>
          {uploadError && <div className="amf-error" style={{ margin: '4px 0 0' }}>{uploadError}</div>}
          {form.photo && <img className="amf-photo-preview" src={form.photo} alt="Preview" />}
        </div>

        {/* Bio */}
        <label className="amf-label">Bio</label>
        <textarea className="amf-textarea" rows={3} placeholder="Short biography…"
          value={form.bio} onChange={e => set('bio', e.target.value)} />

      </div>

      {error && <div className="amf-error">{error}</div>}

      <div className="amf-actions">
        <button type="button" className="amf-btn-cancel" onClick={onCancel}>Cancel</button>
        <button type="submit" className="amf-btn-save" disabled={saving}>
          {saving ? 'Saving…' : isEdit ? 'Save Changes' : <><Plus size={14} /> Add Member</>}
        </button>
      </div>
    </form>
  );
}
