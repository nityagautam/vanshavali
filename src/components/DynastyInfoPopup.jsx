import * as Popover from '@radix-ui/react-popover';
import { Info, X, MapPin, ExternalLink } from 'lucide-react';

export default function DynastyInfoPopup({ meta }) {
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
            {str} <ExternalLink size={12} />
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
    <Popover.Root>
      <Popover.Trigger asChild>
        <button className="info-btn" title="Dynasty details" aria-label="Show dynasty information">
          <Info size={11} />
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          className="info-popup"
          side="bottom"
          align="start"
          sideOffset={10}
          collisionPadding={16}
        >
          <Popover.Arrow className="info-popup-arrow" width={14} height={7} />
          <div className="info-popup-header">
            <span className="info-popup-title">Dynasty Information</span>
            <Popover.Close asChild>
              <button className="info-popup-close" aria-label="Close"><X size={14} /></button>
            </Popover.Close>
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
                  <span className="info-address-icon"><MapPin size={13} /></span>
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
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
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
