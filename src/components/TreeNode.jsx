import { useState } from 'react';
import PersonCard from './PersonCard';

const GEN_COLORS = ['#1a3a6b', '#1a6b3a', '#6b1a4a', '#7a4a00'];

export default function TreeNode({
  person, personMap, childrenMap,
  selectedId, onSelect, highlightIds,
  depth = 0, maxGen = null,
}) {
  const [collapsed, setCollapsed] = useState(false);

  const children = (childrenMap[person.id] || []).filter(c => !c.spouseIds?.includes(person.id));
  const hasChildren = children.length > 0;

  // forceCollapsed: maxGen limits how many generations are visible.
  // maxGen=1 → show only root (depth 0, no children)
  // maxGen=2 → show root + 1 level of children, etc.
  const forceCollapsed = maxGen !== null && depth >= maxGen - 1;
  const showChildren   = hasChildren && !collapsed && !forceCollapsed;

  const spouses = (person.spouseIds || [])
    .map(sid => personMap[sid])
    .filter(Boolean);

  const isHighlighted = highlightIds
    ? highlightIds.has(person.id) || spouses.some(s => highlightIds.has(s.id))
    : false;
  const isDimmed = highlightIds
    ? !highlightIds.has(person.id) && !spouses.some(s => highlightIds.has(s.id))
    : false;

  const genColor  = GEN_COLORS[depth % GEN_COLORS.length];
  // Only show individual collapse btn when not force-collapsed by maxGen
  const canToggle = hasChildren && !forceCollapsed;

  return (
    <li style={{ '--gen-color': genColor }}>
      {spouses.length > 0 ? (
        /* ── Couple bubble ── */
        <div className={`couple-bubble ${isDimmed ? 'dimmed' : ''} ${isHighlighted && !isDimmed ? 'highlighted' : ''}`}>
          <div className="couple-bubble-inner">
            <PersonCard
              person={person}
              selected={selectedId === person.id}
              highlighted={isHighlighted && !isDimmed}
              dimmed={false}
              onClick={() => onSelect(person)}
            />
            {spouses.map(spouse => (
              <div key={spouse.id} className="couple-bubble-pair">
                <div className="couple-badge">⚭</div>
                <PersonCard
                  person={spouse}
                  selected={selectedId === spouse.id}
                  highlighted={isHighlighted && !isDimmed}
                  dimmed={false}
                  onClick={() => onSelect(spouse)}
                  isSpouse
                />
              </div>
            ))}
          </div>
          {canToggle && (
            <button
              className="card-collapse-btn couple-collapse-btn"
              onClick={e => { e.stopPropagation(); setCollapsed(c => !c); }}
              title={collapsed ? 'Expand children' : 'Collapse children'}
            >
              {collapsed ? '+' : '−'}
            </button>
          )}
        </div>
      ) : (
        /* ── Single person ── */
        <div className="single-node">
          <PersonCard
            person={person}
            selected={selectedId === person.id}
            highlighted={isHighlighted && !isDimmed}
            dimmed={isDimmed}
            onClick={() => onSelect(person)}
          />
          {canToggle && (
            <button
              className="card-collapse-btn"
              onClick={e => { e.stopPropagation(); setCollapsed(c => !c); }}
              title={collapsed ? 'Expand children' : 'Collapse children'}
            >
              {collapsed ? '+' : '−'}
            </button>
          )}
        </div>
      )}

      {/* Children subtree */}
      {showChildren && (
        <>
          <div className="node-stem" />
          <ul>
            {children.map(child => (
              <TreeNode
                key={child.id}
                person={child}
                personMap={personMap}
                childrenMap={childrenMap}
                selectedId={selectedId}
                onSelect={onSelect}
                highlightIds={highlightIds}
                depth={depth + 1}
                maxGen={maxGen}
              />
            ))}
          </ul>
        </>
      )}

      {/* Badge showing hidden children count when capped by maxGen */}
      {hasChildren && forceCollapsed && (
        <div className="gen-limit-badge" title={`${children.length} children hidden — increase Depth to show`}>
          +{children.length}
        </div>
      )}
    </li>
  );
}
