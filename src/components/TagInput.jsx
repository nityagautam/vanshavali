import { useId, useMemo, useState } from 'react';
import { X } from 'lucide-react';

/**
 * Tag chips with suggestions. Enter or comma adds; Backspace on an empty
 * input removes the last chip. `suggestions` is [{ tag, count }] sorted by
 * use; already-chosen tags are filtered out.
 */
export default function TagInput({ value, onChange, suggestions = [], placeholder = 'Add a tag…' }) {
  const [text, setText] = useState('');
  const listId = useId();

  const add = raw => {
    const tag = raw.trim().replace(/,+$/, '').trim();
    if (!tag || value.includes(tag)) { setText(''); return; }
    onChange([...value, tag]);
    setText('');
  };

  const shown = useMemo(() => {
    const q = text.trim().toLowerCase();
    return suggestions
      .filter(s => !value.includes(s.tag) && (!q || s.tag.toLowerCase().includes(q)))
      .slice(0, 6);
  }, [suggestions, value, text]);

  return (
    <div className="tag-input">
      <div className="tag-chips">
        {value.map(tag => (
          <span key={tag} className="tag-chip">
            {tag}
            <button type="button" onClick={() => onChange(value.filter(t => t !== tag))} aria-label={`Remove tag ${tag}`}>
              <X size={12} />
            </button>
          </span>
        ))}
        <input
          className="tag-text"
          value={text}
          placeholder={value.length ? '' : placeholder}
          aria-label="Add a tag"
          aria-controls={listId}
          onChange={e => (e.target.value.endsWith(',') ? add(e.target.value) : setText(e.target.value))}
          onKeyDown={e => {
            if (e.key === 'Enter') { e.preventDefault(); add(text); }
            else if (e.key === 'Backspace' && !text && value.length) onChange(value.slice(0, -1));
          }}
          onBlur={() => add(text)}
        />
      </div>
      {shown.length > 0 && (
        <div className="tag-suggest" id={listId} role="group" aria-label="Suggested tags">
          {shown.map(s => (
            <button key={s.tag} type="button" onMouseDown={e => e.preventDefault()} onClick={() => add(s.tag)}>
              + {s.tag}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
