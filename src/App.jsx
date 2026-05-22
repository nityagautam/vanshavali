import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { Routes, Route, NavLink } from 'react-router-dom';
import initialData from './data/family.json';
import aboutData   from './data/about.json';
import FamilyTree  from './components/FamilyTree';
import DetailPanel from './components/DetailPanel';
import PrintView   from './components/PrintView';
import MiniMap     from './components/MiniMap';
import AboutPage   from './components/AboutPage';

import FloatingActions from './components/FloatingActions';
import LoginModal  from './components/LoginModal';
import { isAuthenticated, setAuthenticated } from './utils/auth';

export default function App() {
  const [people, setPeople]           = useState(initialData.people);
  const [selectedPerson, setSelected] = useState(null);
  const [search, setSearch]           = useState('');
  const [zoom, setZoom]               = useState(0.25);
  const [maxGen, setMaxGen]           = useState(null);
  const [lang, setLang]               = useState(() => localStorage.getItem('vv-lang') || 'hi');
  const [filterGender,   setFilterGender]   = useState('all');
  const [filterStatus,   setFilterStatus]   = useState('all');
  const [filterMarriage, setFilterMarriage] = useState('all');
  const [isLoggedIn,     setIsLoggedIn]     = useState(() => isAuthenticated());
  const [loginOpen,      setLoginOpen]      = useState(false);
  const [pendingAction,  setPendingAction]  = useState(null);
  const canvasRef = useRef(null);

  const handleAuthRequired = (action) => {
    setPendingAction(() => action);
    setLoginOpen(true);
  };

  const handleLoginSuccess = () => {
    setAuthenticated();
    setIsLoggedIn(true);
    setLoginOpen(false);
    pendingAction?.();
    setPendingAction(null);
  };

  const handleLang = (l) => { setLang(l); localStorage.setItem('vv-lang', l); };

  const clampZoom  = useCallback(z => Math.min(1.5, Math.max(0.25, +z.toFixed(2))), []);
  const adjustZoom = useCallback(delta => setZoom(z => clampZoom(z + delta)), [clampZoom]);

  const meta   = initialData.meta;
  const about  = aboutData;

  const familyData = useMemo(() => ({ ...initialData, people }), [people]);

  useEffect(() => {
    document.title = meta.pageTitle || `Vanshavali — ${meta.dynasty} Dynasty`;
  }, [meta.pageTitle, meta.dynasty]);

  useEffect(() => {
    const el = canvasRef.current;
    if (!el) return;
    el.scrollLeft = (el.scrollWidth - el.clientWidth) / 2;
  }, []);

  useEffect(() => {
    const el = canvasRef.current;
    if (!el) return;
    const onWheel = (e) => {
      if (e.ctrlKey || e.metaKey) { e.preventDefault(); adjustZoom(-e.deltaY * 0.001); }
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [adjustZoom]);

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

  const filtersActive = filterGender !== 'all' || filterStatus !== 'all' || filterMarriage !== 'all';

  const highlightIds = useMemo(() => {
    const q = search.trim().toLowerCase();
    const hasSearch = !!q;
    if (!hasSearch && !filtersActive) return null;

    const parentIds = new Set(people.map(p => p.parentId).filter(Boolean));

    return new Set(
      people
        .filter(p => {
          const isPlaceholder = p.tags?.includes('placeholder');
          if (isPlaceholder) {
            if (filterGender !== 'all' && p.gender !== filterGender) return false;
            if (filterStatus !== 'all' || filterMarriage !== 'all') {
              const partnerId = (p.spouseIds || [])[0];
              const partner   = partnerId ? personMap[partnerId] : null;
              if (partner && !partner.tags?.includes('placeholder')) {
                if (filterStatus === 'living'   && partner.alive !== true)  return false;
                if (filterStatus === 'deceased' && partner.alive === true)   return false;
                if (filterMarriage !== 'all') {
                  const partnerHasRealSpouse = (partner.spouseIds || []).some(sid => !personMap[sid]?.tags?.includes('placeholder'));
                  const partnerHasChildren   = parentIds.has(partner.id);
                  const partnerIsMarried     = partnerHasRealSpouse || partnerHasChildren;
                  if (filterMarriage === 'married'   && !partnerIsMarried) return false;
                  if (filterMarriage === 'unmarried' &&  partnerIsMarried) return false;
                }
              }
            }
            return true;
          }

          if (hasSearch && !p.name.toLowerCase().includes(q) && !p.occupation?.toLowerCase().includes(q))
            return false;
          if (filterGender !== 'all' && p.gender !== filterGender) return false;
          if (filterStatus === 'living'   && p.alive !== true)  return false;
          if (filterStatus === 'deceased' && p.alive === true)   return false;
          if (filterMarriage !== 'all') {
            const hasRealSpouse = (p.spouseIds || []).some(sid => !personMap[sid]?.tags?.includes('placeholder'));
            const hasChildren   = parentIds.has(p.id);
            const isMarried     = hasRealSpouse || hasChildren;
            if (filterMarriage === 'married'   && !isMarried) return false;
            if (filterMarriage === 'unmarried' &&  isMarried) return false;
          }
          return true;
        })
        .map(p => p.id)
    );
  }, [search, people, filterGender, filterStatus, filterMarriage, filtersActive, personMap]);

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
      {/* Print view — hidden on screen */}
      <PrintView people={people} meta={meta} about={about} lang={lang} />

      {/* Login modal */}
      <LoginModal
        isOpen={loginOpen}
        meta={meta}
        onSuccess={handleLoginSuccess}
        onClose={() => { setLoginOpen(false); setPendingAction(null); }}
      />

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
            <NavLink
              to="/about"
              className={({ isActive }) => `header-about-link${isActive ? ' active' : ''}`}
            >
              About
            </NavLink>
            <div className="lang-toggle" role="group" aria-label="Language">
              {[['hi', 'हिं'], ['both', 'दो'], ['en', 'EN']].map(([val, label]) => (
                <button
                  key={val}
                  className={`lang-btn${lang === val ? ' active' : ''}`}
                  onClick={() => handleLang(val)}
                  title={val === 'hi' ? 'Hindi only' : val === 'en' ? 'English only' : 'Both languages'}
                >{label}</button>
              ))}
            </div>
          </div>
        </div>
      </header>

      {/* Main content (routes) */}
      <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <Routes>
          {/* ── Tree view ── */}
          <Route path="/" element={
            <div className="app-body">
              <div className="tree-section">
                {/* Toolbar */}
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

                  {/* Filter pills */}
                  <div className="filter-pills">
                    <div className="filter-pill-group">
                      {(lang === 'en'
                        ? [['all','All'],['male','Male'],['female','Female']]
                        : [['all','सभी'],['male','पु'],['female','स्त्री']]
                      ).map(([v,l]) => (
                        <button key={v} className={`filter-pill-btn${filterGender === v ? ' active' : ''}`}
                          onClick={() => setFilterGender(v)}>{l}</button>
                      ))}
                    </div>
                    <div className="filter-pill-group">
                      {(lang === 'en'
                        ? [['all','All'],['living','Living'],['deceased','Deceased']]
                        : [['all','सभी'],['living','जी'],['deceased','मृ']]
                      ).map(([v,l]) => (
                        <button key={v} className={`filter-pill-btn${filterStatus === v ? ' active' : ''}`}
                          onClick={() => setFilterStatus(v)}>{l}</button>
                      ))}
                    </div>
                    <div className="filter-pill-group">
                      {(lang === 'en'
                        ? [['all','All'],['married','Married'],['unmarried','Unmarried']]
                        : [['all','सभी'],['married','वि'],['unmarried','अवि']]
                      ).map(([v,l]) => (
                        <button key={v} className={`filter-pill-btn${filterMarriage === v ? ' active' : ''}`}
                          onClick={() => setFilterMarriage(v)}>{l}</button>
                      ))}
                    </div>
                    {filtersActive && (
                      <button className="filter-reset"
                        onClick={() => { setFilterGender('all'); setFilterStatus('all'); setFilterMarriage('all'); }}
                        title="Reset all filters">↺</button>
                    )}
                  </div>

                  {highlightIds && (
                    <div className="toolbar-info" style={{ marginLeft: 0 }}>
                      {highlightIds.size} match{highlightIds.size !== 1 ? 'es' : ''}
                      {search && (
                        <button onClick={() => setSearch('')}
                          style={{ marginLeft: 8, color: 'var(--saffron)', fontSize: '0.75rem', textDecoration: 'underline', background: 'none', border: 'none', cursor: 'pointer' }}>
                          Clear
                        </button>
                      )}
                    </div>
                  )}

                  {/* Depth control */}
                  <div className="gen-controls">
                    <span className="gen-label">Depth</span>
                    <button className="gen-btn"
                      onClick={() => setMaxGen(g => { const cur = g ?? totalGen; return cur > 1 ? cur - 1 : cur; })}
                      disabled={maxGen === 1} title="Show one fewer generation">−</button>
                    <span className="gen-value">{maxGen ?? 'All'}</span>
                    <button className="gen-btn"
                      onClick={() => setMaxGen(g => { if (g === null) return null; const n = g + 1; return n >= totalGen ? null : n; })}
                      disabled={maxGen === null} title="Show one more generation">+</button>
                    {maxGen !== null && (
                      <button className="gen-reset" onClick={() => setMaxGen(null)} title="Show all generations">↺</button>
                    )}
                  </div>

                  {/* Zoom control */}
                  <div className="zoom-controls">
                    <button className="zoom-btn" onClick={() => adjustZoom(-0.1)} title="Zoom out (Ctrl+−)">−</button>
                    <button className="zoom-level" onClick={() => setZoom(1)} title="Reset zoom (Ctrl+0)">
                      {Math.round(zoom * 100)}%
                    </button>
                    <button className="zoom-btn" onClick={() => adjustZoom(+0.1)} title="Zoom in (Ctrl+=)">+</button>
                  </div>
                </div>

                {/* Tree canvas */}
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

                {meta.maintainer && (
                  <div className="tree-credit" title={`Maintained & Developed by ${meta.maintainer}`}>
                    With &#x2764; by {meta.maintainer}
                  </div>
                )}
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

              {/* Floating action button */}
              <FloatingActions
                people={people}
                familyData={familyData}
                meta={meta}
                about={about}
                lang={lang}
                onAddMember={setPeople}
                isLoggedIn={isLoggedIn}
                onAuthRequired={handleAuthRequired}
                onLogout={() => setIsLoggedIn(false)}
              />
            </div>
          } />

          {/* ── About page ── */}
          <Route path="/about" element={
            <AboutPage
              people={people}
              meta={meta}
              about={about}
              lang={lang}
              totalGen={totalGen}
            />
          } />
        </Routes>
      </div>

    </div>
  );
}
