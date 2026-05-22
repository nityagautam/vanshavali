import { useNavigate } from 'react-router-dom';

function pickLang(hindi, english, lang) {
  if (lang === 'hi') return { primary: hindi,   secondary: null };
  if (lang === 'en') return { primary: english,  secondary: null };
  return              { primary: hindi,   secondary: english };
}

function toLabel(key) {
  return key
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/[_-]/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase());
}

function renderValue(key, val) {
  if (val === null || val === undefined || val === '') return null;
  const str = String(val);
  if (/^https?:\/\//.test(str))
    return <a href={str} target="_blank" rel="noreferrer" className="about-link">{str.replace(/^https?:\/\//, '')}</a>;
  return str;
}

export default function AboutPage({ people, meta, about, lang, totalGen }) {
  const navigate = useNavigate();

  const livingCount   = people.filter(p => p.alive === true).length;
  const deceasedCount = people.filter(p => p.alive !== true && !p.tags?.includes('placeholder')).length;
  const realCount     = people.filter(p => !p.tags?.includes('placeholder')).length;

  const { primary: descPrimary, secondary: descSecondary } =
    pickLang(about?.descriptionHindi, about?.description, lang);

  const { primary: dclPrimary, secondary: dclSecondary } =
    pickLang(about?.disclaimerHindi, about?.disclaimer, lang);

  const locationStr = about?.location
    ? Object.entries(about.location)
        .filter(([k, v]) => v && !/^\d{5,}$/.test(String(v)) && !/lat|lng|lon|coord/i.test(k))
        .map(([, v]) => v)
        .join(', ')
    : '';

  const mapsUrl = 'https://maps.app.goo.gl/27YTdui9oNsZuxDDA';

  return (
    <div className="about-page">

      {/* Back button */}
      <button className="about-back" onClick={() => navigate('/')}>
        ← Back to Tree
      </button>

      {/* Dynasty banner */}
      <div className="about-banner">
        <div className="about-banner-dynasty">{meta.dynasty}</div>
        {meta.pageTitle && <div className="about-banner-title">{meta.pageTitle}</div>}
        <div className="about-banner-meta">
          {meta.gotra    && <span>{meta.gotra}</span>}
          {meta.subgotra && <span>{meta.subgotra}</span>}
          {meta.title    && <span>{meta.title}</span>}
        </div>
      </div>

      <div className="about-body">

        {/* Stats */}
        <div className="about-stats">
          <div className="about-stat">
            <span className="about-stat-num">{realCount}</span>
            <span className="about-stat-lbl">Members</span>
          </div>
          <div className="about-stat">
            <span className="about-stat-num">{totalGen}</span>
            <span className="about-stat-lbl">Generations</span>
          </div>
          <div className="about-stat">
            <span className="about-stat-num">{livingCount}</span>
            <span className="about-stat-lbl">Living</span>
          </div>
          <div className="about-stat">
            <span className="about-stat-num">{deceasedCount}</span>
            <span className="about-stat-lbl">Deceased</span>
          </div>
        </div>

        {/* Description */}
        {(descPrimary || descSecondary) && (
          <div className="about-section">
            <div className="about-section-title">About</div>
            {descPrimary   && <p className="about-description">{descPrimary}</p>}
            {descSecondary && <p className="about-description about-description-en">{descSecondary}</p>}
          </div>
        )}

        {/* Info table */}
        {about?.info && Object.entries(about.info).some(([, v]) => v) && (
          <div className="about-section">
            <div className="about-section-title">Gotra Info</div>
            <div className="about-info-table">
              {Object.entries(about.info)
                .filter(([, v]) => v && String(v).trim())
                .map(([k, v]) => (
                  <div key={k} className="about-info-row">
                    <span className="about-info-label">{k}</span>
                    <span className="about-info-value">{String(v)}</span>
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* Location */}
        {locationStr && (
          <div className="about-section">
            <div className="about-section-title">Location</div>
            <div className="about-location">
              <span className="about-location-icon">📍</span>
              <span className="about-location-text">{locationStr}</span>
            </div>
            <a href={mapsUrl} target="_blank" rel="noreferrer" className="about-maps-btn">
              View on Google Maps ↗
            </a>
          </div>
        )}

        {/* Disclaimer */}
        {(dclPrimary || dclSecondary) && (
          <div className="about-section">
            <div className="about-section-title">⚠ Disclaimer</div>
            <div className="about-disclaimer">
              {dclPrimary   && <p className="about-disclaimer-text">{dclPrimary}</p>}
              {dclSecondary && <p className="about-disclaimer-text about-disclaimer-en">{dclSecondary}</p>}
            </div>
          </div>
        )}

        {/* Maintainer credit */}
        {meta.maintainer && (
          <div className="about-credit">
            With &#x2764; by {meta.maintainer}
          </div>
        )}

      </div>
    </div>
  );
}
