import { useState } from 'react';

function generateId(name) {
  const base = name
    .replace(/[\u0900-\u097F]+/g, '') // strip Devanagari
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '') || 'member';
  return `${base}-${Date.now().toString(36)}`;
}

const EMPTY = {
  name: '', gender: 'male', parentId: '', spouseId: '',
  born: '', died: '', alive: true,
  occupation: '', location: '', bio: '', tags: '', photo: '',
};

export default function AddMemberForm({ people, onAdd, onCancel }) {
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState('');

  const set = (field, val) => setForm(f => ({ ...f, [field]: val }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) { setError('Name is required.'); return; }
    setError('');
    setSaving(true);

    const newPerson = {
      id:         generateId(form.name),
      name:       form.name.trim(),
      gender:     form.gender,
      born:       form.born.trim()  || null,
      died:       form.died.trim()  || null,
      alive:      form.alive,
      parentId:   form.parentId  || null,
      spouseIds:  form.spouseId ? [form.spouseId] : [],
      occupation: form.occupation.trim() || undefined,
      location:   form.location.trim()   || undefined,
      bio:        form.bio.trim()        || undefined,
      photo:      form.photo.trim()      || undefined,
      tags:       form.tags.split(',').map(t => t.trim()).filter(Boolean),
    };

    // Remove undefined keys
    Object.keys(newPerson).forEach(k => newPerson[k] === undefined && delete newPerson[k]);

    await onAdd(newPerson);
    setSaving(false);
    setForm(EMPTY);
  };

  // People usable as parents (non-spouses of the form's own person, basically everyone)
  const parentOptions = people.filter(p => !p.tags?.includes('placeholder') || p.name);
  const spouseOptions = people.filter(p => p.id !== form.parentId);

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
        <select className="amf-select" value={form.parentId} onChange={e => set('parentId', e.target.value)}>
          <option value="">— None (root ancestor) —</option>
          {parentOptions.map(p => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>

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
        <label className="amf-label">Photo URL</label>
        <input className="amf-input" placeholder="https://… or /photos/name.jpg"
          value={form.photo} onChange={e => set('photo', e.target.value)} />

        {/* Bio */}
        <label className="amf-label">Bio</label>
        <textarea className="amf-textarea" rows={3} placeholder="Short biography…"
          value={form.bio} onChange={e => set('bio', e.target.value)} />

      </div>

      {error && <div className="amf-error">{error}</div>}

      <div className="amf-actions">
        <button type="button" className="amf-btn-cancel" onClick={onCancel}>Cancel</button>
        <button type="submit" className="amf-btn-save" disabled={saving}>
          {saving ? 'Saving…' : '+ Add Member'}
        </button>
      </div>
    </form>
  );
}
