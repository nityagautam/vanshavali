import { memo, useEffect, useState } from 'react';
import { Plus, Minus } from 'lucide-react';
import PersonCard from './PersonCard';
import { registerReveal } from '../utils/progressiveReveal';

// Generations whose children render in the very first commit; deeper nodes
// are revealed progressively (see utils/progressiveReveal.js).
const EAGER_DEPTH = 2;

const GEN_COLORS = ['var(--g1)', 'var(--g2)', 'var(--g3)', 'var(--g4)'];

function TreeNode({
  person, personMap, childrenMap,
  onSelect, highlightIds,
  depth = 0, maxGen = null,
}) {
  const [collapsed, setCollapsed] = useState(false);
  const [childrenReady, setChildrenReady] = useState(depth < EAGER_DEPTH);

  const children = (childrenMap[person.id] || []).filter(c => !c.spouseIds?.includes(person.id));
  const hasChildren = children.length > 0;

  // forceCollapsed: maxGen limits how many generations are visible.
  // maxGen=1 → show only root (depth 0, no children)
  // maxGen=2 → show root + 1 level of children, etc.
  const forceCollapsed = maxGen !== null && depth >= maxGen - 1;
  const showChildren   = hasChildren && !collapsed && !forceCollapsed && childrenReady;

  useEffect(() => {
    if (childrenReady || !hasChildren) return undefined;
    return registerReveal(depth, () => setChildrenReady(true));
  }, [childrenReady, hasChildren, depth]);

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
              highlighted={isHighlighted && !isDimmed}
              dimmed={false}
              onSelect={onSelect}
            />
            {spouses.map(spouse => (
              <div key={spouse.id} className="couple-bubble-pair">
                <div className="couple-badge" aria-hidden="true">⚭</div>
                <PersonCard
                  person={spouse}
                  highlighted={isHighlighted && !isDimmed}
                  dimmed={false}
              onSelect={onSelect}
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
              aria-label={collapsed ? `Expand ${person.name}'s children` : `Collapse ${person.name}'s children`}
              aria-expanded={!collapsed}
            >
              {collapsed ? <Plus size={12} /> : <Minus size={12} />}
            </button>
          )}
        </div>
      ) : (
        /* ── Single person ── */
        <div className="single-node">
          <PersonCard
            person={person}
            highlighted={isHighlighted && !isDimmed}
            dimmed={isDimmed}
              onSelect={onSelect}
          />
          {canToggle && (
            <button
              className="card-collapse-btn"
              onClick={e => { e.stopPropagation(); setCollapsed(c => !c); }}
              title={collapsed ? 'Expand children' : 'Collapse children'}
              aria-label={collapsed ? `Expand ${person.name}'s children` : `Collapse ${person.name}'s children`}
              aria-expanded={!collapsed}
            >
              {collapsed ? <Plus size={12} /> : <Minus size={12} />}
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

export default memo(TreeNode);
