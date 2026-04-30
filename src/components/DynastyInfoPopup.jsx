import { useState, useEffect, useRef } from 'react';

export default function DynastyInfoPopup({ meta }) {
  const [open, setOpen] = useState(false);
  const popupRef = useRef(null);
  const btnRef = useRef(null);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (!popupRef.current?.contains(e.target) && !btnRef.current?.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open]);

  const { location } = meta;

  // Build a human-readable label from a camelCase / lowercase key
  const toLabel = (key) =>
    key
      .replace(/([a-z])([A-Z])/g, '$1 $2')   // camelCase → words
      .replace(/_/g, ' ')                      // snake_case → words
      .replace(/\b\w/g, c => c.toUpperCase()); // Title Case

  // Determine how to render a value
  const renderValue = (key, val) => {
    if (!val && val !== 0) return null;
    const str = String(val);

    // URL
    if (/^https?:\/\//.test(str))
      return <a href={str} target="_blank" rel="noreferrer" className="info-link">{str.replace(/^https?:\/\//, '')}</a>;

    // Lat/Long — key contains "lat" & "long" / "lng" / "coord"
    const lowerKey = key.toLowerCase();
    if (/lat/.test(lowerKey) && /l(on|ng)/.test(lowerKey)) {
      const [lat, lng] = str.split(/[,/\s]+/).map(Number);
      if (!isNaN(lat) && !isNaN(lng))
        return (
          <a href={`https://www.google.com/maps?q=${lat},${lng}`} target="_blank" rel="noreferrer" className="info-link">
            {str} ↗
          </a>
        );
    }
    if (/^(lat|lng|lon|latitude|longitude|coord)/i.test(key)) {
      return <span className="info-value info-value-mono">{str}</span>;
    }

    return str;
  };

  // Address summary line: use values that are short plain strings (skip URLs, coords, pins)
  const addressSummaryKeys = Object.keys(location).filter(k => {
    const v = String(location[k] ?? '');
    return v && !/^https?:\/\//.test(v) && !/^\d{5,}$/.test(v) && !/lat|lng|lon|coord/i.test(k);
  });
  const fullAddress = addressSummaryKeys.map(k => location[k]).filter(Boolean).join(', ');

  return (
    <span className="info-btn-wrap">
      <button
        ref={btnRef}
        className={`info-btn ${open ? 'active' : ''}`}
        onClick={() => setOpen(o => !o)}
        title="Dynasty details"
        aria-label="Show dynasty information"
      >
        i
      </button>

      {open && (
        <div ref={popupRef} className="info-popup" role="dialog" aria-label="Dynasty information">
          <div className="info-popup-header">
            <span className="info-popup-title">Dynasty Information</span>
            <button className="info-popup-close" onClick={() => setOpen(false)} aria-label="Close">✕</button>
          </div>

          <div className="info-popup-body">
            <Section title="Lineage">
              <Row label="Dynasty" value={meta.dynasty} />
              <Row label="Gotra" value={meta.gotra} />
              {meta.subgotra && <Row label="Sub-gotra" value={meta.subgotra} />}
              {meta.title    && <Row label="Title"     value={meta.title} />}
            </Section>

            <Section title="Native Address">
              {Object.entries(location).map(([key, val]) => {
                const rendered = renderValue(key, val);
                return rendered ? <Row key={key} label={toLabel(key)} value={rendered} /> : null;
              })}
              {fullAddress && (
                <div className="info-full-address">
                  <span className="info-address-icon">📍</span>
                  {fullAddress}
                </div>
              )}
            </Section>

            {meta.description && (
              <Section title="About">
                <p className="info-description">{meta.description}</p>
              </Section>
            )}

            {(meta.maintainer || meta.blog) && (
              <Section title="Maintained by">
                {meta.maintainer && <Row label="Author" value={meta.maintainer} />}
                {meta.blog && (
                  <Row label="Blog" value={
                    <a href={meta.blog} target="_blank" rel="noreferrer" className="info-link">
                      {meta.blog.replace(/^https?:\/\//, '')}
                    </a>
                  } />
                )}
              </Section>
            )}
          </div>
        </div>
      )}
    </span>
  );
}

function Section({ title, children }) {
  return (
    <div className="info-section">
      <div className="info-section-title">{title}</div>
      {children}
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div className="info-row">
      <span className="info-label">{label}</span>
      <span className="info-value">{value}</span>
    </div>
  );
}
