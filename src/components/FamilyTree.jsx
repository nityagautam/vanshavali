import { useMemo } from 'react';
import TreeNode from './TreeNode';

export default function FamilyTree({ people, personMap, selectedId, onSelect, highlightIds, maxGen }) {
  // Build a map: parentId -> [children]
  const childrenMap = useMemo(() => {
    const map = {};
    people.forEach(p => {
      if (p.parentId) {
        if (!map[p.parentId]) map[p.parentId] = [];
        map[p.parentId].push(p);
      }
    });
    return map;
  }, [people]);

  // Find root nodes: people with no parentId who should be the "main" person in the tree.
  // Problem: spouses list each other in spouseIds, so we can't just exclude all spouseIds.
  // Fix: among people with no parentId, exclude those who appear in a *male* root's spouseIds
  // (the male is treated as primary; his wives render in the couple row beside him).
  // Also exclude spouses of non-root (parentId-having) people.
  const roots = useMemo(() => {
    const noParentPeople = people.filter(p => !p.parentId);

    // IDs that are spouses of a non-root lineage member (they should never be roots)
    const spouseIdsOfLineage = new Set(
      people.filter(p => p.parentId).flatMap(p => p.spouseIds || [])
    );

    // Among root-level people, treat the male as primary — his spouseIds are "attached" spouses
    const attachedRootSpouseIds = new Set(
      noParentPeople.filter(p => p.gender === 'male').flatMap(p => p.spouseIds || [])
    );

    return noParentPeople.filter(
      p => !spouseIdsOfLineage.has(p.id) && !attachedRootSpouseIds.has(p.id)
    );
  }, [people]);

  if (roots.length === 0) {
    return <div className="no-results">No root ancestor found. Check family.json — at least one person must have no parentId.</div>;
  }

  return (
    <div className="org-tree">
      <ul>
        {roots.map(root => (
          <TreeNode
            key={root.id}
            person={root}
            personMap={personMap}
            childrenMap={childrenMap}
            selectedId={selectedId}
            onSelect={onSelect}
            highlightIds={highlightIds}
            depth={0}
            maxGen={maxGen}
          />
        ))}
      </ul>
    </div>
  );
}
