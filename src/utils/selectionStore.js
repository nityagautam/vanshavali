import { createContext, useContext, useSyncExternalStore } from 'react';

// Which person is selected, kept outside React state so that selecting a card
// re-renders only the card that was selected and the one that becomes
// selected — not all 344 (see PRD 009). TreeNode/PersonCard stay memoised
// because no `selectedId` prop flows through them.
export function createSelectionStore() {
  let current = null;
  const listeners = new Set();
  return {
    get: () => current,
    set(next) {
      if (next === current) return;
      current = next;
      listeners.forEach(fn => fn());
    },
    subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); },
  };
}

export const SelectionContext = createContext(createSelectionStore());

export function useIsSelected(personId) {
  const store = useContext(SelectionContext);
  return useSyncExternalStore(store.subscribe, () => store.get() === personId);
}
