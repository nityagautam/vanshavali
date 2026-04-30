import { useState, useMemo, useEffect } from 'react';
import initialData from './data/family.json';
import FamilyTree from './components/FamilyTree';
import DetailPanel from './components/DetailPanel';
import Sidebar from './components/Sidebar';
import PrintView from './components/PrintView';

export default function App() {
  const [people, setPeople]           = useState(initialData.people);
  const [selectedPerson, setSelected] = useState(null);
  const [search, setSearch]           = useState('');

  const meta = initialData.meta;

  // Keep familyData object in sync with live people state (for export)
  const familyData = useMemo(() => ({ ...initialData, people }), [people]);

  // Sync browser tab title from JSON
  useEffect(() => {
    document.title = meta.pageTitle || `Vanshavali — ${meta.dynasty} Dynasty`;
  }, [meta.pageTitle, meta.dynasty]);

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
                <span style={{ color: 'var(--gold)', fontSize: '0.9rem' }}>⸗</span>&nbsp;Married
              </div>
            </div>

            {search && highlightIds && (
              <div className="toolbar-info">
                {highlightIds.size} result{highlightIds.size !== 1 ? 's' : ''}
                <button onClick={() => setSearch('')}
                  style={{ marginLeft: 8, color: 'var(--saffron)', fontSize: '0.75rem', textDecoration: 'underline', background: 'none', border: 'none', cursor: 'pointer' }}>
                  Clear
                </button>
              </div>
            )}
          </div>

          <div className="tree-canvas">
            <FamilyTree
              people={people}
              personMap={personMap}
              selectedId={selectedPerson?.id}
              onSelect={handleSelect}
              highlightIds={highlightIds}
            />
          </div>
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
