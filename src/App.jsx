import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { Routes, Route, NavLink } from 'react-router-dom';
import { CheckCircle2, AlertTriangle, Search, RotateCcw, Minus, Plus, Sun, Moon, Network, List } from 'lucide-react';
import initialData from './data/family.json';
import aboutData   from './data/about.json';
import FamilyTree  from './components/FamilyTree';
import DetailPanel from './components/DetailPanel';
import PrintView   from './components/PrintView';
import MiniMap     from './components/MiniMap';
import MobileTreeView from './components/MobileTreeView';
import OnboardingLegend from './components/OnboardingLegend';
import AboutPage   from './components/AboutPage';

import FloatingActions from './components/FloatingActions';
import LoginModal  from './components/LoginModal';
import UserBadge    from './components/UserBadge';
import AddMemberForm from './components/AddMemberForm';
import Modal from './components/Modal';
import CommandPalette from './components/CommandPalette';
import { isAuthenticated, setAuthenticated, checkSession } from './utils/auth';
import { fetchFamilyData, editFamilyMember } from './utils/familyApi';
import { consumeInvite } from './utils/inviteApi';

export default function App() {
  const [people, setPeople]           = useState(initialData.people);
  const [selectedPerson, setSelected] = useState(null);
  const [search, setSearch]           = useState('');
  const [zoom, setZoom]               = useState(0.25);
  const [maxGen, setMaxGen]           = useState(null);
  const [lang, setLang]               = useState('hi');
  const [filterGender,   setFilterGender]   = useState('all');
  const [filterStatus,   setFilterStatus]   = useState('all');
  const [filterMarriage, setFilterMarriage] = useState('all');
  const [isLoggedIn,     setIsLoggedIn]     = useState(() => isAuthenticated());
  const [loginOpen,      setLoginOpen]      = useState(false);
  const [pendingAction,  setPendingAction]  = useState(null);
  const [googleUser,     setGoogleUser]     = useState(null);
  const [isAdmin,        setIsAdmin]        = useState(false);
  const [authMessage,    setAuthMessage]    = useState(null);
  const [editingPerson,  setEditingPerson]  = useState(null);
  const [paletteOpen,    setPaletteOpen]    = useState(false);
  // null = follow OS preference; 'light'/'dark' = explicit user override, persisted.
  const [theme,          setTheme]          = useState(() => localStorage.getItem('vv-theme') || null);
  const [systemDark,     setSystemDark]     = useState(() => window.matchMedia('(prefers-color-scheme: dark)').matches);
  // 'tree' (pannable/zoomable) is always the default — the drill-down list
  // view is purely opt-in via the toolbar toggle, never auto-switched by
  // screen size. Persisted like the theme choice.
  const [viewMode,       setViewMode]       = useState(() => localStorage.getItem('vv-view-mode') || 'tree');
  const canvasRef = useRef(null);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = (e) => setSystemDark(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  useEffect(() => {
    localStorage.setItem('vv-view-mode', viewMode);
  }, [viewMode]);

  useEffect(() => {
    if (theme) {
      document.documentElement.setAttribute('data-theme', theme);
      localStorage.setItem('vv-theme', theme);
    } else {
      document.documentElement.removeAttribute('data-theme');
      localStorage.removeItem('vv-theme');
    }
  }, [theme]);

  const isDark = theme ? theme === 'dark' : systemDark;
  const toggleTheme = () => setTheme(isDark ? 'light' : 'dark');

  const handleAuthRequired = (action) => {
    setPendingAction(() => action);
    setLoginOpen(true);
  };

  const handleEditMember = async (payload) => {
    try {
      const { people: updated } = await editFamilyMember(payload);
      setPeople(updated);
      setSelected(prev => (prev && prev.id === payload.id) ? updated.find(p => p.id === payload.id) : prev);
      setEditingPerson(null);
      setAuthMessage({ type: 'ok', text: `"${payload.name}" updated.` });
    } catch (err) {
      setAuthMessage({ type: 'err', text: err.message || 'Could not save changes — please try again.' });
    }
  };

  const handleLoginSuccess = () => {
    setAuthenticated();
    setIsLoggedIn(true);
    setIsAdmin(true); // password login is always admin-level
    setLoginOpen(false);
    pendingAction?.();
    setPendingAction(null);
  };

  const handleLang = (l) => { setLang(l); };

  const clampZoom  = useCallback(z => Math.min(2, Math.max(0.25, +z.toFixed(2))), []);
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

  // The bundled family.json renders instantly; once the live datastore
  // responds, swap in whatever's actually been persisted since the last
  // build (e.g. members added through the app).
  useEffect(() => {
    fetchFamilyData()
      .then(data => { if (data?.people) setPeople(data.people); })
      .catch(() => {
        setAuthMessage({ type: 'err', text: "Couldn't reach the server — showing the last saved version." });
      });
  }, []);

  // Sync client auth state with the server-side Google OAuth session, if any
  // (covers both a fresh redirect back from Google and a page reload while
  // a session cookie is still valid).
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const googleLogin = params.get('googleLogin');

    if (googleLogin) {
      params.delete('googleLogin');
      const rest = params.toString();
      window.history.replaceState({}, '', window.location.pathname + (rest ? `?${rest}` : ''));
    }

    if (googleLogin === 'denied') {
      console.warn('Google sign-in was denied — check the allowlisted emails.');
      return;
    }

    checkSession().then(({ authenticated, name, email, picture, isAdmin: adminSession }) => {
      if (authenticated) {
        setAuthenticated();
        setIsLoggedIn(true);
        setIsAdmin(!!adminSession);
        if (email) setGoogleUser({ name, email, picture });
      }
    });
  }, []);

  // Redeem a one-time invite link (?invite=<token>), if present.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const inviteToken = params.get('invite');
    if (!inviteToken) return;

    params.delete('invite');
    const rest = params.toString();
    window.history.replaceState({}, '', window.location.pathname + (rest ? `?${rest}` : ''));

    consumeInvite(inviteToken)
      .then(() => {
        setAuthenticated();
        setIsLoggedIn(true);
        setIsAdmin(false); // invite-redeemed sessions can't manage further invites
        setAuthMessage({ type: 'ok', text: 'Invite accepted — you are logged in.' });
      })
      .catch(err => {
        setAuthMessage({ type: 'err', text: err.message || 'This invite link is invalid or already used.' });
      });
  }, []);

  useEffect(() => {
    if (!authMessage) return;
    const t = setTimeout(() => setAuthMessage(null), 5000);
    return () => clearTimeout(t);
  }, [authMessage]);

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
      if (e.key === '=' || e.key === '+') { e.preventDefault(); adjustZoom(+0.15); }
      if (e.key === '-')                  { e.preventDefault(); adjustZoom(-0.15); }
      if (e.key === '0')                  { e.preventDefault(); setZoom(1); }
      if (e.key === 'k' || e.key === 'K') { e.preventDefault(); setPaletteOpen(o => !o); }
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

  const scrollToPerson = useCallback((id) => {
    const el = canvasRef.current?.querySelector(`[data-person-id="${CSS.escape(id)}"]`);
    el?.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
  }, []);

  // Search-to-center: scroll the first text-search match into view. Debounced
  // so the viewport doesn't jump on every keystroke while still typing, and
  // scoped to the search box specifically (not filter-pill changes, which
  // are meant to narrow what's visible in place, not relocate the viewport).
  useEffect(() => {
    if (!search.trim() || !highlightIds || highlightIds.size === 0) return;
    const t = setTimeout(() => scrollToPerson(highlightIds.values().next().value), 400);
    return () => clearTimeout(t);
  }, [search, highlightIds, scrollToPerson]);

  const handleSelect = (person) => {
    setSelected(prev => prev?.id === person.id ? null : person);
  };

  // Command-palette jump: the target may be off-screen, so select *and* scroll.
  const handlePaletteSelect = (person) => {
    setSelected(person);
    scrollToPerson(person.id);
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

      {/* Invite redemption result */}
      {authMessage && (
        <div className={`sidebar-toast toast-${authMessage.type}`}>
          {authMessage.type === 'ok' ? <CheckCircle2 size={15} /> : <AlertTriangle size={15} />} {authMessage.text}
        </div>
      )}

      {/* Edit member modal — admin only */}
      <Modal
        open={!!editingPerson}
        onOpenChange={(o) => !o && setEditingPerson(null)}
        title={editingPerson ? `Edit ${editingPerson.name}` : ''}
      >
        {editingPerson && (
          <AddMemberForm
            people={people}
            person={editingPerson}
            onSubmit={handleEditMember}
            onCancel={() => setEditingPerson(null)}
          />
        )}
      </Modal>

      {/* Command palette — Ctrl/Cmd+K */}
      <CommandPalette
        open={paletteOpen}
        onOpenChange={setPaletteOpen}
        people={people}
        onSelect={handlePaletteSelect}
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
            <button
              className="theme-toggle-btn"
              onClick={toggleTheme}
              title={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
              aria-label={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
            >
              {isDark ? <Sun size={15} /> : <Moon size={15} />}
            </button>
            {googleUser && <UserBadge user={googleUser} />}
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
                    <span className="search-icon"><Search size={14} /></span>
                    <input
                      className="search-input"
                      type="text"
                      placeholder="Search by name or occupation…"
                      value={search}
                      onChange={e => setSearch(e.target.value)}
                    />
                  </div>

                  <button
                    className="cmdk-trigger"
                    onClick={() => setPaletteOpen(true)}
                    title="Jump to a family member"
                  >
                    Jump to… <kbd>Ctrl K</kbd>
                  </button>

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
                        title="Reset all filters"><RotateCcw size={13} /></button>
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
                      disabled={maxGen === 1} title="Show one fewer generation"><Minus size={13} /></button>
                    <span className="gen-value">{maxGen ?? 'All'}</span>
                    <button className="gen-btn"
                      onClick={() => setMaxGen(g => { if (g === null) return null; const n = g + 1; return n >= totalGen ? null : n; })}
                      disabled={maxGen === null} title="Show one more generation"><Plus size={13} /></button>
                    {maxGen !== null && (
                      <button className="gen-reset" onClick={() => setMaxGen(null)} title="Show all generations"><RotateCcw size={13} /></button>
                    )}
                  </div>

                  {/* Zoom control — not applicable to the drill-down list view */}
                  {viewMode === 'tree' && (
                    <div className="zoom-controls">
                      <button className="zoom-btn" onClick={() => adjustZoom(-0.15)} title="Zoom out (Ctrl+−)"><Minus size={15} /></button>
                      <button className="zoom-level" onClick={() => setZoom(1)} title="Reset zoom (Ctrl+0)">
                        {Math.round(zoom * 100)}%
                      </button>
                      <button className="zoom-btn" onClick={() => adjustZoom(+0.15)} title="Zoom in (Ctrl+=)"><Plus size={15} /></button>
                    </div>
                  )}

                  {/* View mode toggle */}
                  <button
                    className="view-mode-btn"
                    onClick={() => setViewMode(m => m === 'tree' ? 'list' : 'tree')}
                    title={viewMode === 'tree' ? 'Switch to list (drill-down) view' : 'Switch to tree view'}
                    aria-label={viewMode === 'tree' ? 'Switch to list (drill-down) view' : 'Switch to tree view'}
                  >
                    {viewMode === 'tree' ? <List size={15} /> : <Network size={15} />}
                  </button>
                </div>

                {viewMode === 'list' ? (
                  <MobileTreeView
                    people={people}
                    personMap={personMap}
                    selectedPerson={selectedPerson}
                    onSelect={handleSelect}
                    highlightIds={highlightIds}
                  />
                ) : (
                  <>
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
                  </>
                )}
                <OnboardingLegend />

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
                  lang={lang}
                  onClose={() => setSelected(null)}
                  onSelect={handleSelect}
                  onEdit={setEditingPerson}
                  isAdmin={isAdmin}
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
                isAdmin={isAdmin}
                onAuthRequired={handleAuthRequired}
                onLogout={() => { setIsLoggedIn(false); setGoogleUser(null); setIsAdmin(false); }}
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
