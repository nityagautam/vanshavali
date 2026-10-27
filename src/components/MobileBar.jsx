import { useState } from 'react';
import { Network, List, SlidersHorizontal, Plus, MoreHorizontal } from 'lucide-react';
import Sheet from './Sheet';

// Phone-only bottom bar (CSS hides it above 768px; the desktop keeps the
// toolbar + FAB). Add is admin-only, so it's only rendered when `addAction`
// is passed.
export default function MobileBar({
  viewMode, onToggleView, addAction, moreActions,
  filtersContent, activeFilterCount, filtersOpen, setFiltersOpen,
}) {
  const [moreOpen, setMoreOpen] = useState(false);
  const isTree = viewMode === 'tree';
  const ViewIcon = isTree ? Network : List;

  // Let the sheet finish closing before the action opens a dialog / prints.
  const runAfterClose = fn => () => { setMoreOpen(false); setTimeout(fn, 220); };

  return (
    <>
      <nav className="bottom-bar" aria-label="Main">
        <button className="tab on" onClick={onToggleView}
          aria-label={isTree ? 'Tree view — switch to list view' : 'List view — switch to tree view'}>
          <ViewIcon size={22} />{isTree ? 'Tree' : 'List'}
        </button>
        <button className="tab" onClick={() => setFiltersOpen(true)}>
          <SlidersHorizontal size={22} />Filters
          {activeFilterCount > 0 && <span className="tab-badge">{activeFilterCount}</span>}
        </button>
        {addAction && (
          <button className="tab tab-add" onClick={addAction.onClick} aria-label="Add member">
            <span className="tab-add-pill"><Plus size={22} /></span>Add
          </button>
        )}
        <button className="tab" onClick={() => setMoreOpen(true)}>
          <MoreHorizontal size={22} />More
        </button>
      </nav>

      <Sheet open={filtersOpen} onOpenChange={setFiltersOpen} title="Filters">
        {filtersContent}
      </Sheet>

      <Sheet open={moreOpen} onOpenChange={setMoreOpen} title="More">
        <ul className="more-list">
          {moreActions.map(a => (
            <li key={a.id}>
              <button className="more-row" onClick={runAfterClose(a.onClick)}>
                <a.icon size={20} /><span>{a.label}</span>
              </button>
            </li>
          ))}
        </ul>
      </Sheet>
    </>
  );
}
