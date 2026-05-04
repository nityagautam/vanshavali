import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import initialData from './data/family.json';
import FamilyTree from './components/FamilyTree';
import DetailPanel from './components/DetailPanel';
import Sidebar from './components/Sidebar';
import PrintView from './components/PrintView';
import MiniMap from './components/MiniMap';

export default function App() {
  const [people, setPeople]           = useState(initialData.people);
  const [selectedPerson, setSelected] = useState(null);
  const [search, setSearch]           = useState('');
  const [zoom, setZoom]               = useState(0.25);
  const [maxGen, setMaxGen]           = useState(null); // null = show all
  const canvasRef                     = useRef(null);

  const clampZoom = useCallback(z => Math.min(1.5, Math.max(0.25, +z.toFixed(2))), []);
  const adjustZoom = useCallback(delta => setZoom(z => clampZoom(z + delta)), [clampZoom]);

  const meta = initialData.meta;

  // Keep familyData object in sync with live people state (for export)
  const familyData = useMemo(() => ({ ...initialData, people }), [people]);

  // Sync browser tab title from JSON
  useEffect(() => {
    document.title = meta.pageTitle || `Vanshavali — ${meta.dynasty} Dynasty`;
  }, [meta.pageTitle, meta.dynasty]);

  // Center horizontal scroll on mount so the root of the tree is centred
  useEffect(() => {
    const el = canvasRef.current;
    if (!el) return;
    el.scrollLeft = (el.scrollWidth - el.clientWidth) / 2;
  }, []);

  // Ctrl+Scroll to zoom on the canvas
  useEffect(() => {
    const el = canvasRef.current;
    if (!el) return;
    const onWheel = (e) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        adjustZoom(-e.deltaY * 0.001);
      }
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [adjustZoom]);

  // Keyboard shortcuts: Ctrl+= zoom in, Ctrl+- zoom out, Ctrl+0 reset
  useEffect(() => {
    const onKey = (e) => {
      if (!e.ctrlKey && !e.metaKey) return;
      if (e.key === '=' || e.key === '+') { e.preventDefault(); adjustZoom(+0.1); }
      if (e.key === '-')                  { e.preventDefault(); adjustZoom(-0.1); }
      if (e.key === '0')                  { e.preventDefault(); setZoom(1); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [adjustZoom]);

  const personMap = useMemo(
    () => Object.fromEntries(people.map(p => [p.id, p])),
    [people]
  );

  const highlightIds = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return null;
    return new Set(
      people
        .filter(p => p.name.toLowerCase().includes(q) || p.occupation?.toLowerCase().includes(q))
        .map(p => p.id)
    );
  }, [search, people]);

  const handleSelect = (person) => {
    setSelected(prev => prev?.id === person.id ? null : person);
  };

  const totalGen = useMemo(() => {
    const depths = {};
    const getDepth = (id) => {
      if (!id) return 0;
      if (depths[id] !== undefined) return depths[id];
      const p = personMap[id];
      if (!p) return 0;
      depths[id] = 1 + getDepth(p.parentId);
      return depths[id];
    };
    return Math.max(...people.map(p => getDepth(p.id)), 0);
  }, [people, personMap]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      {/* Print view — invisible on screen, rendered when Cmd+P / Print button */}
      <PrintView people={people} meta={meta} />
      {/* Header */}
      <header className="app-header">
        <div className="header-inner">
          <div className="header-title">
            <h1>{meta.pageTitle || `Vanshavali — ${meta.dynasty} Dynasty`}</h1>
            <div className="subtitle">
              Gotra: {meta.gotra}
              {meta.subgotra && <> &nbsp;·&nbsp; Sub-gotra: {meta.subgotra}</>}
              {meta.title    && <> &nbsp;·&nbsp; Title: {meta.title}</>}
            </div>
          </div>
          <div className="header-meta">
            <span className="meta-pill">{people.length} members</span>
            <span className="meta-pill">{totalGen} generations</span>
          </div>
        </div>
      </header>

      <div className="app-body">
        {/* Left sidebar */}
        <Sidebar
          people={people}
          familyData={familyData}
          meta={meta}
          onAddMember={setPeople}
        />

        {/* Tree section */}
        <div className="tree-section">
          <div className="toolbar">
            <div className="search-wrap">
              <span className="search-icon">⌕</span>
              <input
                className="search-input"
                type="text"
                placeholder="Search by name or occupation…"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>

            <div className="legend">
              <div className="legend-item"><div className="legend-dot male" /> Male</div>
              <div className="legend-item"><div className="legend-dot female" /> Female</div>
              <div className="legend-item"><div className="legend-line" /> Parent–Child</div>
              <div className="legend-item">
                <span style={{ color: 'var(--gold)', fontSize: '0.9rem' }}>⚭</span>&nbsp;Married
              </div>
            </div>

            <div style={{ flex: 1 }} />

            {search && highlightIds && (
              <div className="toolbar-info" style={{ marginLeft: 0 }}>
                {highlightIds.size} result{highlightIds.size !== 1 ? 's' : ''}
                <button onClick={() => setSearch('')}
                  style={{ marginLeft: 8, color: 'var(--saffron)', fontSize: '0.75rem', textDecoration: 'underline', background: 'none', border: 'none', cursor: 'pointer' }}>
                  Clear
                </button>
              </div>
            )}

            <div className="gen-controls">
              <span className="gen-label">Depth</span>
              <button
                className="gen-btn"
                onClick={() => setMaxGen(g => { const cur = g ?? totalGen; return cur > 1 ? cur - 1 : cur; })}
                disabled={maxGen === 1}
                title="Show one fewer generation"
              >−</button>
              <span className="gen-value">{maxGen ?? 'All'}</span>
              <button
                className="gen-btn"
                onClick={() => setMaxGen(g => { if (g === null) return null; const n = g + 1; return n >= totalGen ? null : n; })}
                disabled={maxGen === null}
                title="Show one more generation"
              >+</button>
              {maxGen !== null && (
                <button className="gen-reset" onClick={() => setMaxGen(null)} title="Show all generations">↺</button>
              )}
            </div>

            <div className="zoom-controls">
              <button className="zoom-btn" onClick={() => adjustZoom(-0.1)} title="Zoom out (Ctrl+−)">−</button>
              <button className="zoom-level" onClick={() => setZoom(1)} title="Reset zoom (Ctrl+0)">
                {Math.round(zoom * 100)}%
              </button>
              <button className="zoom-btn" onClick={() => adjustZoom(+0.1)} title="Zoom in (Ctrl+=)">+</button>
            </div>
          </div>

          <div className="tree-canvas" ref={canvasRef}>
            <div style={{ zoom }}>
              <FamilyTree
                people={people}
                personMap={personMap}
                selectedId={selectedPerson?.id}
                onSelect={handleSelect}
                highlightIds={highlightIds}
                maxGen={maxGen}
              />
            </div>
          </div>
          <MiniMap canvasRef={canvasRef} zoom={zoom} />
        </div>

        {/* Detail panel */}
        {selectedPerson && (
          <DetailPanel
            person={personMap[selectedPerson.id] || selectedPerson}
            personMap={personMap}
            people={people}
            onClose={() => setSelected(null)}
            onSelect={handleSelect}
          />
        )}
      </div>
    </div>
  );
}
