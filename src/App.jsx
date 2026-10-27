import { useState, useMemo, useEffect, useLayoutEffect, useRef, useCallback, lazy, Suspense } from 'react';
import { flushSync } from 'react-dom';
import { Routes, Route, NavLink, useMatch, useLocation, useNavigate } from 'react-router-dom';
import * as Popover from '@radix-ui/react-popover';
import { Search, Minus, Plus, Sun, Moon, Network, List, Maximize, MoreVertical, Compass, WifiOff, X } from 'lucide-react';
import initialData from './data/family.json';
import aboutData   from './data/about.json';
import FamilyTree  from './components/FamilyTree';
import DetailPanel from './components/DetailPanel';
import PrintView   from './components/PrintView';
import MiniMap     from './components/MiniMap';
import MobileTreeView from './components/MobileTreeView';
import OnboardingLegend from './components/OnboardingLegend';
const AboutPage = lazy(() => import('./components/AboutPage'));

import FloatingActions from './components/FloatingActions';
import LoginModal  from './components/LoginModal';
import UserBadge    from './components/UserBadge';
// Admin-only form: pulls in the photo-upload client (+jose), so load on demand.
const AddMemberForm = lazy(() => import('./components/AddMemberForm'));
import Modal from './components/Modal';
import CommandPalette from './components/CommandPalette';
import FiltersPanel from './components/FiltersPanel';
import { isAuthenticated, setAuthenticated, checkSession } from './utils/auth';
import { usePanZoom } from './hooks/usePanZoom';
import { revealAll } from './utils/progressiveReveal';
import { fetchFamilyData, editFamilyMember, moveSibling } from './utils/familyApi';
import { consumeInvite } from './utils/inviteApi';
import { useToast } from './components/Toaster';
import { isRecordKeeper } from './utils/recordKeeper';
import { createSelectionStore, SelectionContext } from './utils/selectionStore';

// A 343-person tree is thousands of px wide, so "fit to width" is unreadable.
// Start at a readable scale instead (phones a bit larger), and remember the
// user's last zoom per device.
const ZOOM_KEY = 'vv-zoom-v2';
function initialZoom() {
  try {
    const saved = parseFloat(localStorage.getItem(ZOOM_KEY));
    if (saved >= 0.04 && saved <= 2) return saved;
  } catch { /* storage unavailable */ }
  return window.matchMedia('(max-width: 768px)').matches ? 0.85 : 1;
}

export default function App() {
  const [people, setPeople]           = useState(initialData.people);
  const [selectedPerson, setSelected] = useState(null);
  const [search, setSearch]           = useState('');
  const [maxGen, setMaxGen]           = useState(null);
  const [lang, setLang]               = useState('hi');
  const [filterGender,   setFilterGender]   = useState('all');
  const [filterStatus,   setFilterStatus]   = useState('all');
  const [filterMarriage, setFilterMarriage] = useState('all');
  const [filterKeepers,  setFilterKeepers]  = useState(false);
  const [isLoggedIn,     setIsLoggedIn]     = useState(() => isAuthenticated());
  const [loginOpen,      setLoginOpen]      = useState(false);
  const [pendingAction,  setPendingAction]  = useState(null);
  const [googleUser,     setGoogleUser]     = useState(null);
  const [isAdmin,        setIsAdmin]        = useState(false);
  const { notify } = useToast();
  const setAuthMessage = useCallback(m => m && notify(m.type, m.text), [notify]);
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

  // Selection lives in an external store so selecting re-renders two cards, not 344.
  const selectionStore = useRef(null);
  if (!selectionStore.current) selectionStore.current = createSelectionStore();
  useLayoutEffect(() => { selectionStore.current.set(selectedPerson?.id ?? null); }, [selectedPerson]);

  // The print report is ~2,100 DOM nodes and hidden on screen, so it only
  // exists while printing (beforeprint → mounted synchronously, afterprint → removed).
  const [printing, setPrinting] = useState(false);
  useEffect(() => {
    const on  = () => flushSync(() => setPrinting(true));
    const off = () => setPrinting(false);
    const mq = window.matchMedia('print');
    const onMq = e => (e.matches ? on() : off());
    window.addEventListener('beforeprint', on);
    window.addEventListener('afterprint', off);
    mq.addEventListener('change', onMq);
    return () => {
      window.removeEventListener('beforeprint', on);
      window.removeEventListener('afterprint', off);
      mq.removeEventListener('change', onMq);
    };
  }, []);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [actionsSlot, setActionsSlot] = useState(null);
  const { zoom, zoomTo, zoomBy, fit, innerRef, boxRef, nat, markInteracted } = usePanZoom({
    canvasRef, initialZoom: initialZoom(), enabled: viewMode === 'tree',
  });

  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = (e) => setSystemDark(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  useEffect(() => {
    localStorage.setItem('vv-view-mode', viewMode);
  }, [viewMode]);

  const isDark = theme ? theme === 'dark' : systemDark;

  // data-theme is always set to the resolved value ('light' | 'dark'); the
  // stored preference is only the explicit override (null = follow system).
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
    // Browser/status-bar colour follows the theme (also used by the installed app).
    document.querySelector('meta[name=theme-color]')?.setAttribute('content', isDark ? '#1B150D' : '#F1E6CC');
  }, [isDark]);

  useEffect(() => {
    if (theme) localStorage.setItem('vv-theme', theme);
    else localStorage.removeItem('vv-theme');
  }, [theme]);

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

  const handleReorder = async (person, direction) => {
    try {
      const { people: updated, moved } = await moveSibling(person.id, direction);
      setPeople(updated);
      if (!moved) setAuthMessage({ type: 'err', text: `"${person.name}" is already ${direction === 'up' ? 'first' : 'last'} among their siblings.` });
    } catch (err) {
      setAuthMessage({ type: 'err', text: err.message || 'Could not reorder — please try again.' });
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

  const adjustZoom = zoomBy;

  useEffect(() => {
    try { localStorage.setItem(ZOOM_KEY, String(zoom)); } catch { /* ignore */ }
  }, [zoom]);

  const meta   = initialData.meta;
  const about  = aboutData;

  const familyData = useMemo(() => ({ ...initialData, people }), [people]);

  useEffect(() => {
    document.title = meta.pageTitle || `Vanshavali — ${meta.dynasty} Dynasty`;
  }, [meta.pageTitle, meta.dynasty]);

  // The bundled family.json renders instantly; once the live datastore
  // responds, swap in whatever's actually been persisted since the last
  // build (e.g. members added through the app).
  // 'loading' → hairline progress; 'stale' → persistent offline banner with Retry.
  const [sync, setSync] = useState('loading');
  const [staleDismissed, setStaleDismissed] = useState(false);
  const loadLive = useCallback(() => {
    setSync('loading');
    setStaleDismissed(false);
    return fetchFamilyData()
      .then(data => { if (data?.people) setPeople(data.people); setSync('live'); })
      .catch(() => setSync('stale'));
  }, []);
  useEffect(() => { loadLive(); }, [loadLive]);
  useEffect(() => {
    const off = () => { setSync('stale'); setStaleDismissed(false); };
    window.addEventListener('offline', off);
    window.addEventListener('online', loadLive);
    return () => { window.removeEventListener('offline', off); window.removeEventListener('online', loadLive); };
  }, [loadLive]);

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
    const onKey = (e) => {
      if (!e.ctrlKey && !e.metaKey) return;
      if (e.key === '=' || e.key === '+') { e.preventDefault(); adjustZoom(+0.15); }
      if (e.key === '-')                  { e.preventDefault(); adjustZoom(-0.15); }
      if (e.key === '0')                  { e.preventDefault(); zoomTo(1); }
      if (e.key === 'k' || e.key === 'K') { e.preventDefault(); setPaletteOpen(o => !o); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [adjustZoom]);

  const personMap = useMemo(
    () => Object.fromEntries(people.map(p => [p.id, p])),
    [people]
  );

  const filtersActive = filterGender !== 'all' || filterStatus !== 'all' || filterMarriage !== 'all' || filterKeepers;

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
            if (filterKeepers) return false;
            // An unknown spouse only matches a text search when their partner does.
            if (hasSearch) {
              const partner = personMap[(p.spouseIds || [])[0]];
              const hit = partner && (partner.name.toLowerCase().includes(q) || partner.occupation?.toLowerCase().includes(q));
              if (!hit) return false;
            }
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
          if (filterKeepers && !isRecordKeeper(p)) return false;
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
  }, [search, people, filterGender, filterStatus, filterMarriage, filterKeepers, filtersActive, personMap]);

  // Find a person's card, rendering the rest of the (progressively drawn)
  // tree first if it isn't there yet, then run `then` with it.
  const withCard = useCallback((id, then) => {
    const find = () => canvasRef.current?.querySelector(`[data-person-id="${CSS.escape(id)}"]`);
    markInteracted(); // an explicit jump takes over from auto-centring
    const el = find();
    if (el) { then(el); return; }
    revealAll();
    requestAnimationFrame(() => requestAnimationFrame(() => { const late = find(); if (late) then(late); }));
  }, [markInteracted]);

  const scrollToPerson = useCallback((id) => {
    withCard(id, el => {
      const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      el.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'center', inline: 'center' });
    });
  }, [withCard]);

  // Searching or filtering needs every card to exist so matches can be highlighted.
  useEffect(() => { if (highlightIds) revealAll(); }, [highlightIds]);

  // Search-to-center: scroll the first text-search match into view. Debounced
  // so the viewport doesn't jump on every keystroke while still typing, and
  // scoped to the search box specifically (not filter-pill changes, which
  // are meant to narrow what's visible in place, not relocate the viewport).
  useEffect(() => {
    if (!search.trim() || !highlightIds || highlightIds.size === 0) return;
    const t = setTimeout(() => scrollToPerson(highlightIds.values().next().value), 400);
    return () => clearTimeout(t);
  }, [search, highlightIds, scrollToPerson]);

  // Bring a person into view. On phones the detail sheet covers the lower
  // ~60%, so park the card in the upper part of the canvas instead of centring.
  const revealPerson = useCallback((id) => {
    if (!window.matchMedia('(max-width: 768px)').matches) { scrollToPerson(id); return; }
    withCard(id, el => requestAnimationFrame(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const c = canvas.getBoundingClientRect(), r = el.getBoundingClientRect();
      canvas.scrollTo({
        top: canvas.scrollTop + (r.top - c.top) - c.height * 0.12,
        left: canvas.scrollLeft + (r.left + r.width / 2) - (c.left + c.width / 2),
        behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
      });
    }));
  }, [scrollToPerson, withCard]);

  const handleSelect = useCallback((person) => {
    setSelected(prev => prev?.id === person.id ? null : person);
    if (window.matchMedia('(max-width: 768px)').matches) revealPerson(person.id);
  }, [revealPerson]);

  // Deep link: /?person=<id> (used by links in the About text) selects that
  // member and scrolls the tree to them once it has mounted.
  const location = useLocation();
  const navigate = useNavigate();
  useEffect(() => {
    const id = new URLSearchParams(location.search).get('person');
    if (!id || !personMap[id]) return;
    setSelected(personMap[id]);
    navigate('/', { replace: true });
    setTimeout(() => revealPerson(id), 500);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.search, personMap]);

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

  const filterValues = { gender: filterGender, status: filterStatus, marriage: filterMarriage, keepers: filterKeepers };
  const setFilter = (key, v) => ({ gender: setFilterGender, status: setFilterStatus, marriage: setFilterMarriage, keepers: setFilterKeepers })[key](v);
  const resetFilters = () => { setFilterGender('all'); setFilterStatus('all'); setFilterMarriage('all'); setFilterKeepers(false); };
  const activeFilterCount = [filterGender !== 'all', filterStatus !== 'all', filterMarriage !== 'all', filterKeepers, maxGen !== null].filter(Boolean).length;
  const clearSearch = () => setSearch('');
  const onTreeRoute = !!useMatch('/');
  const headerControls = (
    <>
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
        {isDark ? <Sun size={16} /> : <Moon size={16} />}
      </button>
    </>
  );

  return (
    <div className="app-shell">
      {/* Print view — hidden on screen */}
      {printing && <PrintView people={people} meta={meta} about={about} lang={lang} />}

      {/* Login modal */}
      <LoginModal
        isOpen={loginOpen}
        meta={meta}
        onSuccess={handleLoginSuccess}
        onClose={() => { setLoginOpen(false); setPendingAction(null); }}
      />

      {/* Edit member modal — admin only */}
      <Modal
        wide
        open={!!editingPerson}
        onOpenChange={(o) => !o && setEditingPerson(null)}
        title={editingPerson ? `Edit ${editingPerson.name}` : ''}
      >
        {editingPerson && (
          <Suspense fallback={<div className="form-loading">Loading…</div>}>
          <AddMemberForm
            people={people}
            person={editingPerson}
            onSubmit={handleEditMember}
            onCancel={() => setEditingPerson(null)}
          />
          </Suspense>
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
          <div className="brand">
            <span className="brand-mark" aria-hidden="true">व</span>
            <div className="header-title">
              <h1>{meta.pageTitle || `Vanshavali — ${meta.dynasty} Dynasty`}</h1>
              <div className="subtitle">
                Gotra: {meta.gotra}
                {meta.subgotra && <> &nbsp;·&nbsp; Sub-gotra: {meta.subgotra}</>}
                {meta.title    && <> &nbsp;·&nbsp; Title: {meta.title}</>}
              </div>
            </div>
          </div>

          {onTreeRoute && (
            <div className="header-search">
              <div className="search-wrap">
                <span className="search-icon"><Search size={16} /></span>
                <input
                  className="search-input"
                  type="search"
                  placeholder="Search by name or occupation…"
                  aria-label="Search family members"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                />
                <button
                  className="search-jump"
                  onClick={() => setPaletteOpen(true)}
                  title="Jump to a family member"
                  aria-label="Jump to a family member"
                >
                  <Compass size={16} className="search-jump-icon" />
                  <kbd>Ctrl K</kbd>
                </button>
              </div>
            </div>
          )}

          <div className="header-meta">
            <div className="header-slot" ref={setActionsSlot} />
            <div className="header-actions">{headerControls}</div>
            <Popover.Root>
              <Popover.Trigger className="header-menu-btn" aria-label="Menu">
                <MoreVertical size={20} />
              </Popover.Trigger>
              <Popover.Portal>
                <Popover.Content className="header-menu" align="end" sideOffset={8}>
                  <div className="meta-text header-menu-stat">{people.length} members · {totalGen} generations</div>
                  <div className="header-menu-row">{headerControls}</div>
                </Popover.Content>
              </Popover.Portal>
            </Popover.Root>
            {googleUser && <UserBadge user={googleUser} />}
          </div>
        </div>
        {sync === 'loading' && <div className="sync-bar" role="progressbar" aria-label="Loading the latest data" />}
      </header>

      {sync === 'stale' && !staleDismissed && (
        <div className="stale-banner" role="status">
          <WifiOff size={16} aria-hidden="true" />
          <span>Showing the saved copy — couldn't reach the server.</span>
          <button className="stale-retry" onClick={loadLive}>Retry</button>
          <button className="stale-close" onClick={() => setStaleDismissed(true)} aria-label="Dismiss"><X size={16} /></button>
        </div>
      )}

      {/* Main content (routes) */}
      <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <Suspense fallback={<div className="form-loading">Loading…</div>}>
        <Routes>
          {/* ── Tree view ── */}
          <Route path="/" element={
            <div className="app-body">
              <div className="tree-section">
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
                      <div
                        className="tree-zoom-box"
                        ref={boxRef}
                        style={nat.w ? { width: nat.w * zoom, height: nat.h * zoom } : undefined}
                      >
                        <div className="tree-zoom-inner" ref={innerRef} style={{ transform: `scale(${zoom})` }}>
                          <SelectionContext.Provider value={selectionStore.current}>
                          <FamilyTree
                            people={people}
                            personMap={personMap}
                            onSelect={handleSelect}
                            highlightIds={highlightIds}
                            maxGen={maxGen}
                          />
                          </SelectionContext.Provider>
                        </div>
                      </div>
                    </div>

                    <MiniMap canvasRef={canvasRef} zoom={zoom} />

                  </>
                )}
                <div className={`canvas-controls${viewMode === 'list' ? ' cc-list' : ''}`} role="group" aria-label="View controls">
                  {viewMode === 'tree' && (
                    <>
                      <button className="icon-btn" onClick={() => adjustZoom(-0.15)} aria-label="Zoom out"><Minus size={20} /></button>
                      <button className="cc-pct" onClick={() => zoomTo(1)} title="Reset zoom (Ctrl+0)">{Math.round(zoom * 100)}%</button>
                      <button className="icon-btn" onClick={() => adjustZoom(+0.15)} aria-label="Zoom in"><Plus size={20} /></button>
                      <button className="icon-btn" onClick={fit} aria-label="Fit whole tree" title="Fit whole tree"><Maximize size={20} /></button>
                    </>
                  )}
                  <button
                    className="icon-btn cc-view"
                    onClick={() => setViewMode(m => m === 'tree' ? 'list' : 'tree')}
                    aria-label={viewMode === 'tree' ? 'Switch to list view' : 'Switch to tree view'}
                    title={viewMode === 'tree' ? 'Switch to list view' : 'Switch to tree view'}
                  >
                    {viewMode === 'tree' ? <List size={20} /> : <Network size={20} />}
                  </button>
                </div>
                {highlightIds && highlightIds.size === 0 && (
                  <div className="empty-state" role="status">
                    <h3>No one matches</h3>
                    <p>{search.trim() ? `Nothing found for “${search.trim()}”.` : 'No members match these filters.'}</p>
                    <div className="empty-actions">
                      {search.trim() && <button className="btn-ghost" onClick={clearSearch}>Clear search</button>}
                      {(filtersActive || maxGen !== null) && (
                        <button className="btn-ghost" onClick={() => { resetFilters(); setMaxGen(null); }}>Reset filters</button>
                      )}
                    </div>
                  </div>
                )}
                {highlightIds && highlightIds.size > 0 && (
                  <div className="match-chip" role="status">
                    {highlightIds.size} match{highlightIds.size !== 1 ? 'es' : ''}
                    {search && <button onClick={clearSearch}>Clear</button>}
                  </div>
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
                  onReorder={handleReorder}
                  isAdmin={isAdmin}
                  suspended={!!editingPerson}
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
                actionsSlot={actionsSlot}
                viewMode={viewMode}
                onToggleView={() => setViewMode(m => m === 'tree' ? 'list' : 'tree')}
                activeFilterCount={activeFilterCount}
                filtersOpen={filtersOpen}
                setFiltersOpen={setFiltersOpen}
                filtersContent={
                  <FiltersPanel
                    lang={lang}
                    values={filterValues}
                    onChange={setFilter}
                    maxGen={maxGen}
                    setMaxGen={setMaxGen}
                    totalGen={totalGen}
                    resultCount={highlightIds ? highlightIds.size : people.length}
                    active={activeFilterCount > 0}
                    onReset={() => { resetFilters(); setMaxGen(null); }}
                    onDone={() => setFiltersOpen(false)}
                  />
                }
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
        </Suspense>
      </div>

    </div>
  );
}
