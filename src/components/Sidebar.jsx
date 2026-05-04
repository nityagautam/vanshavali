import { useState } from 'react';
import AddMemberForm from './AddMemberForm';

const TOOLS = [
  { id: 'info',        icon: 'i', label: 'About'       },
  { id: 'add',         icon: '＋', label: 'Add Member'  },
  { id: 'export',      icon: '↓',  label: 'Export JSON' },
  { id: 'print',       icon: '⎙',  label: 'Print Data'  },
  { id: 'print-tree',  icon: '⊞',  label: 'Print Tree'  },
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
    if (id === 'export')     { exportJSON(); return; }
    if (id === 'print')      { window.print(); return; }
    if (id === 'print-tree') { printTree(); return; }
    if (!open) setOpen(true);
    setActive(prev => prev === id ? null : id);
  };

  const printTree = () => {
    showToast('ok', 'Building tree…');

    // ── 1. Build lookup and children maps ────────────────────────────────
    const pMap = Object.fromEntries(people.map(p => [p.id, p]));
    const childrenMap = {};
    people.forEach(p => {
      if (p.parentId) {
        (childrenMap[p.parentId] = childrenMap[p.parentId] || []).push(p);
      }
    });
    const allSpouseIds = new Set(people.flatMap(p => p.spouseIds || []));
    const roots = people.filter(
      p => !p.parentId && (p.gender === 'male' || !allSpouseIds.has(p.id))
    );

    // ── 2. 4-colour palette (print-friendly, high contrast) ──────────────
    // Cycles by depth so no two adjacent generations share a colour.
    const PALETTE = ['#1a3a6b', '#1a6b3a', '#6b1a4a', '#7a4a00'];
    const col = depth => PALETTE[depth % 4];

    const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

    // ── 3. Build one <div> per line via DFS ──────────────────────────────
    // Each div carries:
    //   • trunk  — "│   │   " continuation bars, coloured with their own depth
    //   • branch — "├─ " or "└─ " connector, same colour as the node
    //   • name   — person name, bold at root level
    //   • spouse — italicised, same colour, slightly lighter
    const divs = [];

    const isDeceased = p => p.alive === false && !p.tags?.includes('placeholder');

    const makeLine = (trunkSegments, connector, person, spouseNames, depth) => {
      const deceased = isDeceased(person);
      const c        = deceased ? '#888888' : col(depth);
      const prefix   = deceased ? 'स्व. ' : '';

      const trunkHtml = trunkSegments
        .map(({ text, d }) =>
          `<span style="color:${col(d)}">${esc(text)}</span>`
        ).join('');
      const branchHtml = connector
        ? `<span style="color:${c}">${esc(connector)}</span>`
        : '';
      const nameStyle = depth === 0
        ? `color:${c};font-weight:700;font-size:10pt`
        : `color:${c}`;
      const nameHtml = `<span style="${nameStyle}">${esc(prefix + person.name)}</span>`;
      const spouseHtml = spouseNames.length
        ? `<span style="color:${c};font-style:italic"> ⚭ ${esc(spouseNames.join(', '))}</span>`
        : '';
      divs.push(
        `<div style="white-space:pre;line-height:1.55;margin:0;padding:0">`
        + trunkHtml + branchHtml + nameHtml + spouseHtml
        + `</div>`
      );
    };

    // segments: array of { text, d } for each trunk column
    const walk = (id, segments, isLast, depth) => {
      const p = pMap[id];
      if (!p) return;
      const connector = isLast ? '└─ ' : '├─ ';
      const spouseNames = (p.spouseIds || []).map(sid => pMap[sid]?.name).filter(Boolean);
      makeLine(segments, connector, p, spouseNames, depth);
      const children = childrenMap[id] || [];
      const nextSeg = { text: isLast ? '    ' : '│   ', d: depth };
      children.forEach((c, i) =>
        walk(c.id, [...segments, nextSeg], i === children.length - 1, depth + 1)
      );
    };

    roots.forEach(root => {
      const spouseNames = (root.spouseIds || []).map(sid => pMap[sid]?.name).filter(Boolean);
      makeLine([], '', root, spouseNames, 0);
      const children = childrenMap[root.id] || [];
      children.forEach((c, i) =>
        walk(c.id, [], i === children.length - 1, 1)
      );
    });

    // ── 4. Build header + footer from meta ───────────────────────────────
    const e = s => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

    // Gotra info rows
    const infoRows = meta.info
      ? Object.entries(meta.info)
          .filter(([, v]) => v && String(v).trim())
          .map(([k, v]) => `<tr><td style="padding:1px 10px 1px 0;color:#555">${e(k)}</td><td style="padding:1px 0;color:#222">${e(v)}</td></tr>`)
          .join('')
      : '';

    const loc = meta.location
      ? [meta.location.village, meta.location.city, meta.location.district, meta.location.state, meta.location.country]
          .filter(Boolean).join(', ')
      : '';

    const disclaimerBlock = (meta.disclaimer || meta.disclaimerHindi) ? `
      <div style="font-family:Arial,sans-serif;border:1px solid #c0392b;border-radius:3px;padding:8px 10px;margin-bottom:12px;background:#fff8f8">
        <div style="font-size:9pt;font-weight:700;color:#c0392b;margin-bottom:5px">
          अस्वीकरण / Disclaimer
        </div>
        ${meta.disclaimerHindi ? `<div style="font-size:7.5pt;color:#444;line-height:1.55;margin-bottom:4px">${e(meta.disclaimerHindi)}</div>` : ''}
        ${meta.disclaimer ? `<div style="font-size:7.5pt;color:#555;line-height:1.55;font-style:italic">${e(meta.disclaimer)}</div>` : ''}
      </div>` : '';

    const header = `
      ${disclaimerBlock}
      <div style="border-bottom:2px solid #1a3a6b;padding-bottom:8px;margin-bottom:10px">
        <div style="font-size:14pt;font-weight:700;color:#1a3a6b">${e(meta.pageTitle || meta.dynasty)}</div>
        ${meta.dynasty ? `<div style="font-size:9pt;color:#444;margin-top:2px">वंश: ${e(meta.dynasty)}</div>` : ''}
        ${loc ? `<div style="font-size:8.5pt;color:#555;margin-top:1px">📍 ${e(loc)}</div>` : ''}
      </div>
      ${infoRows ? `<table style="font-family:Arial,sans-serif;font-size:8pt;border-collapse:collapse;margin-bottom:10px">${infoRows}</table>` : ''}
      <div style="font-family:Arial,sans-serif;font-size:8pt;color:#777;margin-bottom:6px">
        ${meta.lastUpdated ? `अंतिम अद्यतन: ${e(meta.lastUpdated)}` : ''}
        ${meta.maintainer ? ` &nbsp;·&nbsp; संधारक: ${e(meta.maintainer)}` : ''}
        &nbsp;·&nbsp; कुल सदस्य: ${people.length}
      </div>
      <div style="font-family:Arial,sans-serif;font-size:8pt;color:#555;margin-bottom:8px;padding:4px 8px;background:#f5f5f5;border-radius:3px;display:inline-block">
        <span style="color:#888;font-family:'Courier New',monospace">स्व. नाम</span>
        &nbsp;= स्वर्गीय (दिवंगत) &nbsp;·&nbsp;
        <span style="color:#888;font-family:'Courier New',monospace">Prefix "स्व."</span>
        = Svargiya (Departed)
      </div>
      <div style="border-bottom:1px solid #ccc;margin-bottom:10px"></div>`;

    const footer = `
      <div style="border-top:1px solid #ccc;margin-top:14px;padding-top:6px;font-family:Arial,sans-serif">
        ${meta.blog ? `<div style="font-size:7.5pt;color:#1a5276">${e(meta.blog)}</div>` : ''}
      </div>`;

    // ── 5. Inject print-only overlay and trigger print ───────────────────
    const OVERLAY_ID = '__vv_print_tree';
    const STYLE_ID   = '__vv_print_tree_style';
    document.getElementById(OVERLAY_ID)?.remove();
    document.getElementById(STYLE_ID)?.remove();

    const styleEl = document.createElement('style');
    styleEl.id = STYLE_ID;
    styleEl.textContent = `
      #${OVERLAY_ID} {
        display: none;
        font-family: "Courier New", Courier, monospace;
        font-size: 8.5pt;
        background: #fff;
        margin: 0; padding: 0;
      }
      @page { size: A4 portrait; margin: 15mm 12mm; }
      @media print {
        body > * { display: none !important; }
        #${OVERLAY_ID} { display: block !important; }
      }
    `;
    document.head.appendChild(styleEl);

    const wrap = document.createElement('div');
    wrap.id = OVERLAY_ID;
    wrap.innerHTML = header + divs.join('') + footer;
    document.body.appendChild(wrap);

    window.print();

    setTimeout(() => {
      document.getElementById(OVERLAY_ID)?.remove();
      document.getElementById(STYLE_ID)?.remove();
    }, 2000);
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
