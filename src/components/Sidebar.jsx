import { useState } from 'react';
import AddMemberForm from './AddMemberForm';

const TOOLS = [
  { id: 'info',   icon: 'ℹ', label: 'About'  },
  { id: 'add',    icon: '＋', label: 'Add Member'    },
  { id: 'export', icon: '↓',  label: 'Export JSON'   },
  { id: 'print',  icon: '⎙',  label: 'Print' },
];

export default function Sidebar({ people, familyData, meta, onAddMember }) {
  const [open, setOpen]   = useState(false);
  const [active, setActive] = useState(null);
  const [toast, setToast] = useState(null);

  const showToast = (type, msg) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 3500);
  };

  const handleToolClick = (id) => {
    if (id === 'export') { exportJSON(); return; }
    if (id === 'print')  { window.print(); return; }
    if (!open) setOpen(true);
    setActive(prev => prev === id ? null : id);
  };

  const exportJSON = () => {
    const blob = new Blob([JSON.stringify(familyData, null, 2)], { type: 'application/json' });
    const url  = URL.createObjectURL(blob);
    Object.assign(document.createElement('a'), { href: url, download: 'family.json' }).click();
    URL.revokeObjectURL(url);
    showToast('ok', 'family.json downloaded');
  };

  const handleAddMember = async (newPerson) => {
    let updated = [...people, newPerson];
    if (newPerson.spouseIds?.length) {
      const sid = newPerson.spouseIds[0];
      updated = updated.map(p =>
        p.id === sid && !p.spouseIds?.includes(newPerson.id)
          ? { ...p, spouseIds: [...(p.spouseIds || []), newPerson.id] }
          : p
      );
    }
    const payload = { ...familyData, people: updated };
    onAddMember(updated);
    try {
      const res  = await fetch('/api/family', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      const json = await res.json();
      if (json.ok) { showToast('ok', `"${newPerson.name}" saved to family.json`); setActive(null); }
      else throw new Error(json.error);
    } catch {
      showToast('err', 'Cannot write file here — use Export JSON to save manually.');
    }
  };

  return (
    <>
      <aside className={`sidebar ${open ? 'sidebar-open' : 'sidebar-collapsed'}`}>
        {/* Toggle */}
        <button className="sidebar-toggle"
          onClick={() => { setOpen(o => !o); if (open) setActive(null); }}
          title={open ? 'Collapse' : 'Expand'}>
          <span className="hamburger">
            <span /><span /><span />
          </span>
        </button>

        {/* Tool buttons */}
        <nav className="sidebar-nav">
          {TOOLS.map(t => (
            <button key={t.id}
              className={`sidebar-tool-btn ${active === t.id ? 'active' : ''}`}
              onClick={() => handleToolClick(t.id)}
              title={t.label}>
              <span className="sidebar-tool-icon">{t.icon}</span>
              {open && <span className="sidebar-tool-label">{t.label}</span>}
            </button>
          ))}
        </nav>

        {/* Panels */}
        {open && active === 'info' && <DynastyInfoPanel meta={meta} people={people} />}
        {open && active === 'add'  && (
          <div className="sidebar-panel">
            <div className="sidebar-panel-title">Add Family Member</div>
            <AddMemberForm people={people} onAdd={handleAddMember} onCancel={() => setActive(null)} />
          </div>
        )}
      </aside>

      {toast && (
        <div className={`sidebar-toast toast-${toast.type}`}>
          {toast.type === 'ok' ? '✓' : '⚠'} {toast.msg}
        </div>
      )}
    </>
  );
}

/* ── Dynasty Info Panel ─────────────────────────────────── */

// Keys consumed by the banner — never repeated in the body
const BANNER_KEYS = new Set(['pageTitle', 'dynasty']);

// Human-readable label from any camelCase / snake_case key
function toLabel(key) {
  return key
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/[_-]/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase());
}

// Render a single primitive value appropriately
function renderPrimitive(key, val) {
  if (val === null || val === undefined || val === '') return null;
  const str = String(val);

  // URL → clickable link
  if (/^https?:\/\//.test(str))
    return <a href={str} target="_blank" rel="noreferrer" className="info-link">{str.replace(/^https?:\/\//, '')}</a>;

  // Lat/Long value → Google Maps link
  const lk = key.toLowerCase();
  if (/lat/.test(lk) && /l(on|ng)/.test(lk)) {
    const parts = str.split(/[,/\s]+/).map(Number);
    if (parts.length >= 2 && !isNaN(parts[0]) && !isNaN(parts[1]))
      return <a href={`https://www.google.com/maps?q=${parts[0]},${parts[1]}`} target="_blank" rel="noreferrer" className="info-link">{str} ↗</a>;
  }

  return str;
}

function DynastyInfoPanel({ meta, people }) {
  const livingCount   = people.filter(p => p.alive === true).length;
  const deceasedCount = people.filter(p => p.alive === false && !p.tags?.includes('placeholder')).length;

  // Separate meta keys into: primitives (→ rows) and objects (→ sections)
  const primitiveEntries = [];
  const objectEntries    = [];

  Object.entries(meta).forEach(([key, val]) => {
    if (BANNER_KEYS.has(key)) return;           // shown in banner
    if (val === null || val === undefined) return;
    if (typeof val === 'object' && !Array.isArray(val)) {
      objectEntries.push([key, val]);
    } else {
      primitiveEntries.push([key, val]);
    }
  });

  // Split primitive entries: description gets its own paragraph; rest go into "Details"
  const descEntry    = primitiveEntries.find(([k]) => k === 'description');
  const detailEntries = primitiveEntries.filter(([k]) => k !== 'description');

  return (
    <div className="sidebar-panel dip">

      {/* Banner */}
      <div className="dip-banner">
        <div className="dip-dynasty-name">About: {meta.dynasty}</div>
        {meta.pageTitle && <div className="dip-page-title">{meta.pageTitle}</div>}
      </div>

      <div className="dip-body">

        {/* Stats */}
        <div className="dip-stats">
          <Stat value={people.length} label="Members"  />
          <Stat value={livingCount}   label="Living"   />
          <Stat value={deceasedCount} label="Deceased" />
        </div>

        {/* Primitive fields → "Details" section */}
        {detailEntries.length > 0 && (
          <Section title="Details">
            {detailEntries.map(([key, val]) => {
              const rendered = renderPrimitive(key, val);
              return rendered ? <Row key={key} label={toLabel(key)} value={rendered} /> : null;
            })}
          </Section>
        )}

        {/* Description → About */}
        {descEntry && (
          <Section title="About">
            <p className="dip-description">{descEntry[1]}</p>
          </Section>
        )}

        {/* Object fields → each gets its own section, fully dynamic */}
        {objectEntries.map(([key, obj]) => {
          const isLocation = key === 'location';

          // Build address summary line for location objects
          let mapHref = null;
          if (isLocation) {
            const summaryVals = Object.entries(obj)
              .filter(([k, v]) => v && !/^https?:\/\//.test(String(v)) && !/^\d{5,}$/.test(String(v)) && !/lat|lng|lon|coord/i.test(k))
              .map(([, v]) => v);
            if (summaryVals.length)
              mapHref = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(summaryVals.join(', '))}`;
          }

          return (
            <Section key={key} title={toLabel(key)}>
              {Object.entries(obj).map(([k, v]) => {
                const rendered = renderPrimitive(k, v);
                return rendered ? <Row key={k} label={toLabel(k)} value={rendered} /> : null;
              })}
              {mapHref && (
                <a href={mapHref} target="_blank" rel="noreferrer" className="dip-map-link">
                  📍 View on Google Maps
                </a>
              )}
            </Section>
          );
        })}

      </div>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div className="dip-section">
      <div className="dip-section-title">{title}</div>
      {children}
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div className="dip-row">
      <span className="dip-label">{label}</span>
      <span className="dip-value">{value}</span>
    </div>
  );
}

function Stat({ value, label }) {
  return (
    <div className="dip-stat">
      <span className="dip-stat-num">{value}</span>
      <span className="dip-stat-lbl">{label}</span>
    </div>
  );
}
