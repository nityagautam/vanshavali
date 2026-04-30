/**
 * PrintView — hidden on screen, visible only when printing.
 * Renders a generation-by-generation genealogy report.
 */

function toLabel(key) {
  return key
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/[_-]/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase());
}

// Build a map of generation depth for every person (BFS from roots)
function buildGenMap(people, personMap) {
  const childrenOf = {};
  people.forEach(p => {
    if (p.parentId) {
      if (!childrenOf[p.parentId]) childrenOf[p.parentId] = [];
      childrenOf[p.parentId].push(p.id);
    }
  });

  // Roots = people with no parentId who are not a spouse of someone with a parentId
  const spouseIdsOfLineage = new Set(
    people.filter(p => p.parentId).flatMap(p => p.spouseIds || [])
  );
  const roots = people.filter(p => !p.parentId && !spouseIdsOfLineage.has(p.id));

  const genMap = {};
  const queue = roots.map(r => ({ id: r.id, gen: 1 }));
  while (queue.length) {
    const { id, gen } = queue.shift();
    if (genMap[id] !== undefined) continue;
    genMap[id] = gen;
    (childrenOf[id] || []).forEach(cid => queue.push({ id: cid, gen: gen + 1 }));
  }

  // Assign spouses the same generation as their partner
  people.forEach(p => {
    if (genMap[p.id] === undefined) {
      (p.spouseIds || []).forEach(sid => {
        if (genMap[sid] !== undefined) genMap[p.id] = genMap[sid];
      });
    }
  });

  // Fallback: anyone still unmapped gets gen 0 (unknown)
  people.forEach(p => {
    if (genMap[p.id] === undefined) genMap[p.id] = 0;
  });

  return genMap;
}

function formatYears(person) {
  const b = person.born  ? `b. ${person.born}`  : null;
  const d = person.died  ? `d. ${person.died}`  : null;
  if (b && d) return `${b}  ·  ${d}`;
  if (b)      return b;
  if (d)      return d;
  return null;
}

function PersonBlock({ person, spouse, personMap }) {
  const isPlaceholder = person.tags?.includes('placeholder');
  const years  = formatYears(person);
  const father = person.parentId ? personMap[person.parentId] : null;

  return (
    <div className={`pv-person ${isPlaceholder ? 'pv-placeholder' : ''}`}>
      <div className="pv-person-header">
        <span className="pv-name">{person.name}</span>
        {spouse && (
          <>
            <span className="pv-spouse-sep">⚭</span>
            <span className="pv-name pv-spouse-name">{spouse.name}</span>
          </>
        )}
        {person.alive === false && !isPlaceholder && (
          <span className="pv-deceased">✝</span>
        )}
      </div>

      <div className="pv-details">
        {father && <span className="pv-detail-item pv-father">S/o {father.name}</span>}
        {years  && <span className="pv-detail-item">{years}</span>}
        {person.occupation && <span className="pv-detail-item">{person.occupation}</span>}
        {person.location && typeof person.location === 'string' && (
          <span className="pv-detail-item pv-location">{person.location}</span>
        )}
        {person.tags?.length > 0 && !isPlaceholder && (
          <span className="pv-tags">
            {person.tags.filter(t => t !== 'placeholder').join('  ·  ')}
          </span>
        )}
      </div>

      {person.bio && !isPlaceholder && (
        <div className="pv-bio">{person.bio}</div>
      )}

      {spouse && spouse.occupation && (
        <div className="pv-spouse-detail">
          Spouse's occupation: {spouse.occupation}
        </div>
      )}
    </div>
  );
}

export default function PrintView({ people, meta }) {
  const personMap = Object.fromEntries(people.map(p => [p.id, p]));
  const genMap    = buildGenMap(people, personMap);

  // Group people by generation, skipping spouses (they are rendered inline)
  const spouseIdsAll = new Set(people.flatMap(p => p.spouseIds || []));

  const byGen = {};
  people.forEach(p => {
    // Skip people who are only spouses and have no parentId — they render inline
    if (spouseIdsAll.has(p.id) && !p.parentId) return;
    const g = genMap[p.id] ?? 0;
    if (!byGen[g]) byGen[g] = [];
    byGen[g].push(p);
  });

  const genNums = Object.keys(byGen).map(Number).sort((a, b) => a - b);

  const today = new Date().toLocaleDateString('en-IN', {
    day: 'numeric', month: 'long', year: 'numeric',
  });

  // Build address string from meta.location object if present
  let locationStr = '';
  if (meta.location && typeof meta.location === 'object') {
    locationStr = Object.entries(meta.location)
      .filter(([k, v]) => v && !/^https?:\/\//.test(String(v)) && !/^\d{5,}$/.test(String(v)) && !/lat|lng|lon|coord/i.test(k))
      .map(([, v]) => v)
      .join(', ');
  }

  // All object-type meta entries (skip location — already rendered as string above)
  const COVER_SKIP = new Set(['pageTitle', 'dynasty', 'gotra', 'subgotra', 'title',
                               'description', 'lastUpdated', 'disclaimer', 'maintainer', 'blog', 'location']);
  const metaObjects = Object.entries(meta).filter(
    ([k, v]) => !COVER_SKIP.has(k) && v && typeof v === 'object' && !Array.isArray(v)
  );

  return (
    <div id="print-view">

      {/* Cover / Dynasty Header */}
      <div className="pv-cover">
        {meta.disclaimer && (
          <div className="pv-cover-disclaimer">
            <span className="pv-disclaimer-label">⚠ Disclaimer</span>
            {meta.disclaimer}
          </div>
        )}
        {meta.maintainer && (
          <div className="pv-cover-maintainer">Maintained by: {meta.maintainer}</div>
        )}
        {meta.lastUpdated && (
          <div className="pv-cover-last-updated">Last updated: {meta.lastUpdated}</div>
        )}

        <div className="pv-cover-title">{meta.dynasty} Dynasty — Vanshavali</div>
        {meta.pageTitle && <div className="pv-cover-subtitle">{meta.pageTitle}</div>}
        <div className="pv-cover-meta">
          {meta.gotra    && <span>Gotra: {meta.gotra}</span>}
          {meta.subgotra && <span>Sub-gotra: {meta.subgotra}</span>}
          {meta.title    && <span>Title: {meta.title}</span>}
        </div>
        {locationStr && <div className="pv-cover-location">{locationStr}</div>}
        {meta.description && (
          <div className="pv-cover-desc">{meta.description}</div>
        )}

        {/* Dynamic object sections from meta (e.g. info, rituals, etc.) */}
        {metaObjects.map(([key, obj]) => (
          <div key={key} className="pv-cover-info-block">
            <div className="pv-cover-info-title">{toLabel(key)}</div>
            <div className="pv-cover-info-rows">
              {Object.entries(obj)
                .filter(([, v]) => v !== null && v !== undefined && v !== '')
                .map(([k, v]) => (
                  <div key={k} className="pv-cover-info-row">
                    <span className="pv-cover-info-label">{toLabel(k)}</span>
                    <span className="pv-cover-info-value">{String(v)}</span>
                  </div>
                ))}
            </div>
          </div>
        ))}

        <div className="pv-cover-info-block">
          <div className="pv-cover-info-title">Census</div>
          <div className="pv-cover-info-rows">
            <div className="pv-cover-info-row">
              <span className="pv-cover-info-label">Total Members</span>
              <span className="pv-cover-info-value">{people.length}</span>
            </div>
            <div className="pv-cover-info-row">
              <span className="pv-cover-info-label">Living</span>
              <span className="pv-cover-info-value">{people.filter(p => p.alive === true).length}</span>
            </div>
            <div className="pv-cover-info-row">
              <span className="pv-cover-info-label">Deceased</span>
              <span className="pv-cover-info-value">{people.filter(p => p.alive === false && !p.tags?.includes('placeholder')).length}</span>
            </div>
            <div className="pv-cover-info-row">
              <span className="pv-cover-info-label">Generations</span>
              <span className="pv-cover-info-value">{genNums.length}</span>
            </div>
          </div>
        </div>
        <div className="pv-cover-date">Printed: {today}</div>
      </div>

      {/* One section per generation */}
      {genNums.map(gen => {
        const label = gen === 0 ? 'Unknown Generation'
                    : gen === 1 ? 'Generation I — Founding Ancestor'
                    : `Generation ${toRoman(gen)}`;

        return (
          <div key={gen} className="pv-generation">
            <div className="pv-gen-heading">{label}</div>
            <div className="pv-gen-members">
              {byGen[gen].map(person => {
                const spouseId = person.spouseIds?.[0];
                const spouse   = spouseId ? personMap[spouseId] : null;
                return (
                  <PersonBlock
                    key={person.id}
                    person={person}
                    spouse={spouse}
                    personMap={personMap}
                  />
                );
              })}
            </div>
          </div>
        );
      })}

      <div className="pv-footer">
        {meta.blog && <span>{meta.blog}</span>}
        <span>Printed: {today}</span>
        {meta.maintainer && <span>Maintained by {meta.maintainer}</span>}
      </div>
    </div>
  );
}

function toRoman(n) {
  const vals = [1000,900,500,400,100,90,50,40,10,9,5,4,1];
  const syms = ['M','CM','D','CD','C','XC','L','XL','X','IX','V','IV','I'];
  let result = '';
  vals.forEach((v, i) => { while (n >= v) { result += syms[i]; n -= v; } });
  return result;
}
