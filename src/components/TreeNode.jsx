import { useState } from 'react';
import PersonCard from './PersonCard';

export default function TreeNode({ person, personMap, childrenMap, selectedId, onSelect, highlightIds }) {
  const [collapsed, setCollapsed] = useState(false);

  const children = (childrenMap[person.id] || []).filter(c => !c.spouseIds?.includes(person.id));
  const hasChildren = children.length > 0;

  const spouses = (person.spouseIds || [])
    .map(sid => personMap[sid])
    .filter(Boolean);

  const isSelected = selectedId === person.id || spouses.some(s => s.id === selectedId);
  const isHighlighted = highlightIds
    ? highlightIds.has(person.id) || spouses.some(s => highlightIds.has(s.id))
    : false;
  const isDimmed = highlightIds
    ? !highlightIds.has(person.id) && !spouses.some(s => highlightIds.has(s.id))
    : false;

  return (
    <li>
      {/* Couple row: person + spouses */}
      <div className="couple-row">
        <PersonCard
          person={person}
          selected={selectedId === person.id}
          highlighted={isHighlighted && !isDimmed}
          dimmed={isDimmed}
          onClick={() => onSelect(person)}
        />
        {spouses.map(spouse => (
          <div key={spouse.id} style={{ display: 'flex', alignItems: 'center' }}>
            <div className="marriage-line">
              <span style={{ fontSize: '0.8rem', color: 'var(--gold)', padding: '0 2px' }}>⸗</span>
            </div>
            <PersonCard
              person={spouse}
              selected={selectedId === spouse.id}
              highlighted={isHighlighted && !isDimmed}
              dimmed={isDimmed}
              onClick={() => onSelect(spouse)}
              isSpouse
            />
          </div>
        ))}
        {hasChildren && (
          <button
            className="card-collapse-btn"
            onClick={e => { e.stopPropagation(); setCollapsed(c => !c); }}
            title={collapsed ? 'Expand children' : 'Collapse children'}
            style={{ position: 'relative', bottom: 'auto', left: 'auto', transform: 'none', marginLeft: 4 }}
          >
            {collapsed ? '+' : '−'}
          </button>
        )}
      </div>

      {/* Children subtree */}
      {hasChildren && !collapsed && (
        <>
          <div className="node-stem" />
          <ul>
            {children.map((child, index) => (
              <TreeNode
                key={child.id}
                person={child}
                personMap={personMap}
                childrenMap={childrenMap}
                selectedId={selectedId}
                onSelect={onSelect}
                highlightIds={highlightIds}
              />
            ))}
          </ul>
        </>
      )}
    </li>
  );
}
