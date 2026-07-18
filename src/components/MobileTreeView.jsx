import { useState, useEffect, useMemo } from 'react';
import { ChevronRight, ChevronLeft, Home, Users } from 'lucide-react';
import Avatar from './Avatar';

// Opt-in alternative to the pannable/zoomable org-tree (toggled via the
// toolbar view-mode button, not auto-switched by screen size): drill into
// one person at a time (their card + spouses + a tappable children list),
// with a breadcrumb trail back to the root — no panning required. Handy on
// small screens, but available at any width.
export default function MobileTreeView({ people, personMap, selectedPerson, onSelect, highlightIds }) {
  const childrenMap = useMemo(() => {
    const map = {};
    people.forEach(p => {
      if (p.parentId) (map[p.parentId] = map[p.parentId] || []).push(p);
    });
    return map;
  }, [people]);

  const roots = useMemo(() => {
    const noParentPeople = people.filter(p => !p.parentId);
    const spouseIdsOfLineage = new Set(
      people.filter(p => p.parentId).flatMap(p => p.spouseIds || [])
    );
    const attachedRootSpouseIds = new Set(
      noParentPeople.filter(p => p.gender === 'male').flatMap(p => p.spouseIds || [])
    );
    return noParentPeople.filter(
      p => !spouseIdsOfLineage.has(p.id) && !attachedRootSpouseIds.has(p.id)
    );
  }, [people]);

  const [focusId, setFocusId] = useState(() => roots[0]?.id ?? null);

  useEffect(() => {
    if (!focusId && roots[0]) setFocusId(roots[0].id);
  }, [roots, focusId]);

  const focus = focusId ? personMap[focusId] : null;
  const spouses = focus ? (focus.spouseIds || []).map(id => personMap[id]).filter(Boolean) : [];
  const children = focus ? (childrenMap[focus.id] || []).filter(c => !c.spouseIds?.includes(focus.id)) : [];

  // Tapping the focus card or a spouse to view details also calls onSelect,
  // which would otherwise bounce straight back into this effect and yank
  // the view up to the parent. Only reposition for genuinely external
  // selection changes (search-to-center, Ctrl+K) landing outside what's
  // already on screen.
  useEffect(() => {
    if (!selectedPerson || !focus) return;
    const visibleIds = new Set([focus.id, ...spouses.map(s => s.id), ...children.map(c => c.id)]);
    if (visibleIds.has(selectedPerson.id)) return;
    setFocusId(selectedPerson.parentId || selectedPerson.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPerson?.id]);

  const breadcrumb = useMemo(() => {
    const chain = [];
    let cur = focus;
    while (cur) {
      chain.unshift(cur);
      cur = cur.parentId ? personMap[cur.parentId] : null;
    }
    return chain;
  }, [focus, personMap]);

  if (!focus) {
    return <div className="no-results">No root ancestor found. Check family.json — at least one person must have no parentId.</div>;
  }

  const parent = breadcrumb.length > 1 ? breadcrumb[breadcrumb.length - 2] : null;
  const isDim = (p) => highlightIds ? !highlightIds.has(p.id) : false;

  return (
    <div className="mobile-tree">
      {/* Breadcrumb */}
      <div className="mobile-breadcrumb" role="navigation" aria-label="Ancestor path">
        {parent && (
          <button className="mobile-back-btn" onClick={() => setFocusId(parent.id)}>
            <ChevronLeft size={14} /> Back
          </button>
        )}
        <div className="mobile-crumb-track">
          {breadcrumb.map((p, i) => (
            <span key={p.id} className="mobile-crumb-wrap">
              {i > 0 && <ChevronRight size={11} className="mobile-crumb-sep" aria-hidden="true" />}
              <button
                className={`mobile-crumb${p.id === focus.id ? ' current' : ''}`}
                onClick={() => setFocusId(p.id)}
              >
                {i === 0 && <Home size={11} aria-hidden="true" />} {p.name}
              </button>
            </span>
          ))}
        </div>
      </div>

      {/* Focus card + spouses */}
      <div className="mobile-focus-row">
        <button className="mobile-focus-card" onClick={() => onSelect(focus)} title="View details">
          <Avatar person={focus} size="sm" />
          <div className="mobile-focus-name">{focus.name}</div>
        </button>
        {spouses.map(s => (
          <button key={s.id} className="mobile-focus-card mobile-focus-spouse" onClick={() => onSelect(s)} title="View details">
            <Avatar person={s} size="sm" />
            <div className="mobile-focus-name">{s.name}</div>
          </button>
        ))}
      </div>

      {/* Children list */}
      <div className="mobile-children-section">
        <div className="mobile-children-title">
          <Users size={13} aria-hidden="true" />
          {children.length ? `${children.length} ${children.length === 1 ? 'child' : 'children'}` : 'No children recorded'}
        </div>
        <div className="mobile-children-list">
          {children.map(child => (
            <button
              key={child.id}
              className={`mobile-child-row${isDim(child) ? ' dimmed' : ''}`}
              onClick={() => setFocusId(child.id)}
            >
              <Avatar person={child} size="sm" />
              <div className="mobile-child-text">
                <div className="mobile-child-name">{child.name}</div>
                {child.spouseIds?.length > 0 && <div className="mobile-child-sub">Married</div>}
              </div>
              <ChevronRight size={16} className="mobile-child-arrow" aria-hidden="true" />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
