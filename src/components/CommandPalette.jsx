import { useState, useEffect, useMemo, useRef } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { Search } from 'lucide-react';
import Avatar from './Avatar';

export default function CommandPalette({ open, onOpenChange, people, onSelect }) {
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef(null);
  const itemRefs = useRef([]);

  useEffect(() => {
    if (open) { setQuery(''); setActiveIndex(0); }
  }, [open]);

  const MAX_RESULTS = 50;
  const { results, truncated } = useMemo(() => {
    const q = query.trim().toLowerCase();
    const candidates = people.filter(p => !p.tags?.includes('placeholder'));
    // No query yet: show a short browsable default, not every person.
    if (!q) return { results: candidates.slice(0, 8), truncated: false };
    const matches = candidates.filter(p =>
      p.name.toLowerCase().includes(q) || p.occupation?.toLowerCase().includes(q)
    );
    return { results: matches.slice(0, MAX_RESULTS), truncated: matches.length > MAX_RESULTS };
  }, [query, people]);

  useEffect(() => {
    itemRefs.current[activeIndex]?.scrollIntoView({ block: 'nearest' });
  }, [activeIndex]);

  const handleKeyDown = (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setActiveIndex(i => Math.min(i + 1, results.length - 1)); }
    if (e.key === 'ArrowUp')   { e.preventDefault(); setActiveIndex(i => Math.max(i - 1, 0)); }
    if (e.key === 'Enter' && results[activeIndex]) {
      e.preventDefault();
      onSelect(results[activeIndex]);
      onOpenChange(false);
    }
  };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fab-modal-overlay" />
        <Dialog.Content
          className="cmdk-modal"
          onOpenAutoFocus={e => { e.preventDefault(); inputRef.current?.focus(); }}
        >
          <Dialog.Title asChild><span className="sr-only">Jump to a family member</span></Dialog.Title>
          <div className="cmdk-search-row">
            <Search size={15} />
            <input
              ref={inputRef}
              className="cmdk-input"
              placeholder="Jump to a family member…"
              value={query}
              onChange={e => { setQuery(e.target.value); setActiveIndex(0); }}
              onKeyDown={handleKeyDown}
            />
          </div>
          <div className="cmdk-list" role="listbox">
            {results.length === 0 && <div className="cmdk-empty">No matches</div>}
            {results.map((p, i) => (
              <button
                key={p.id}
                ref={el => { itemRefs.current[i] = el; }}
                type="button"
                role="option"
                aria-selected={i === activeIndex}
                className={`cmdk-item${i === activeIndex ? ' active' : ''}`}
                onMouseEnter={() => setActiveIndex(i)}
                onClick={() => { onSelect(p); onOpenChange(false); }}
              >
                <Avatar person={p} size="sm" />
                <div className="cmdk-item-text">
                  <div className="cmdk-item-name">{p.name}</div>
                  {p.occupation && <div className="cmdk-item-sub">{p.occupation}</div>}
                </div>
              </button>
            ))}
            {truncated && (
              <div className="cmdk-empty">Showing first {MAX_RESULTS} matches — keep typing to narrow it down</div>
            )}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
