import * as Popover from '@radix-ui/react-popover';
import { SlidersHorizontal, Plus, MoreHorizontal } from 'lucide-react';

// App-bar controls on screens wider than a phone (see the "Desktop" mock):
// Filters popover · + Add member (admin only) · More menu.
export default function DesktopActions({
  addAction, moreActions, filtersContent, activeFilterCount, filtersOpen, setFiltersOpen,
}) {
  return (
    <>
      <Popover.Root open={filtersOpen} onOpenChange={setFiltersOpen}>
        <Popover.Trigger className="chip header-chip" aria-label="Filters">
          <SlidersHorizontal size={15} />
          Filters{activeFilterCount > 0 && <> · {activeFilterCount}</>}
        </Popover.Trigger>
        <Popover.Portal>
          <Popover.Content className="popover-card filters-popover" align="end" sideOffset={8} collisionPadding={12}>
            {filtersContent}
          </Popover.Content>
        </Popover.Portal>
      </Popover.Root>

      {addAction && (
        <button className="btn-primary btn-compact" onClick={addAction.onClick}>
          <Plus size={16} /> Add member
        </button>
      )}

      <Popover.Root>
        <Popover.Trigger className="header-icon-btn" aria-label="More actions">
          <MoreHorizontal size={20} />
        </Popover.Trigger>
        <Popover.Portal>
          <Popover.Content className="popover-card more-popover" align="end" sideOffset={8} collisionPadding={12}>
            <ul className="more-list">
              {moreActions.map(a => (
                <li key={a.id}>
                  <Popover.Close asChild>
                    <button className="more-row" onClick={() => (a.immediate ? a.onClick() : setTimeout(a.onClick, 120))}>
                      <a.icon size={18} /><span>{a.label}</span>
                    </button>
                  </Popover.Close>
                </li>
              ))}
            </ul>
          </Popover.Content>
        </Popover.Portal>
      </Popover.Root>
    </>
  );
}
