function pickLang(hindi, english, lang) {
  if (lang === 'hi') return { primary: hindi,   secondary: null };
  if (lang === 'en') return { primary: english,  secondary: null };
  return              { primary: hindi,   secondary: english };
}

export function printTree({ people, meta, about, lang, showToast }) {
  showToast?.('ok', 'Building tree…');

  // ── 1. Build lookup and children maps ──────────────────────────────────
  const pMap = Object.fromEntries(people.map(p => [p.id, p]));
  const childrenMap = {};
  people.forEach(p => {
    if (p.parentId) (childrenMap[p.parentId] = childrenMap[p.parentId] || []).push(p);
  });
  const allSpouseIds = new Set(people.flatMap(p => p.spouseIds || []));
  const roots = people.filter(
    p => !p.parentId && (p.gender === 'male' || !allSpouseIds.has(p.id))
  );

  // ── 2. 4-colour palette ─────────────────────────────────────────────────
  const PALETTE = ['#1a3a6b', '#1a6b3a', '#6b1a4a', '#7a4a00'];
  const col = depth => PALETTE[depth % 4];
  const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  // ── 3. Build one <div> per line via DFS ─────────────────────────────────
  const divs = [];
  const isDeceased = p => p.alive !== true && !p.tags?.includes('placeholder');

  const makeLine = (trunkSegments, connector, person, spouseNames, depth) => {
    const deceased = isDeceased(person);
    const c        = deceased ? '#888888' : col(depth);
    const prefix   = deceased ? 'स्व. ' : '';
    const trunkHtml = trunkSegments
      .map(({ text, d }) => `<span style="color:${col(d)}">${esc(text)}</span>`)
      .join('');
    const branchHtml = connector ? `<span style="color:${c}">${esc(connector)}</span>` : '';
    const nameStyle  = depth === 0
      ? `color:${c};font-weight:700;font-size:10pt`
      : `color:${c}`;
    const nameHtml   = `<span style="${nameStyle}">${esc(prefix + person.name)}</span>`;
    const spouseHtml = spouseNames.length
      ? `<span style="color:${c};font-style:italic"> ⚭ ${esc(spouseNames.join(', '))}</span>`
      : '';
    divs.push(
      `<div style="white-space:pre;line-height:1.55;margin:0;padding:0">`
      + trunkHtml + branchHtml + nameHtml + spouseHtml
      + `</div>`
    );
  };

  const walk = (id, segments, isLast, depth) => {
    const p = pMap[id];
    if (!p) return;
    const connector  = isLast ? '└─ ' : '├─ ';
    const spouseNames = (p.spouseIds || []).map(sid => pMap[sid]?.name).filter(Boolean);
    makeLine(segments, connector, p, spouseNames, depth);
    const children  = childrenMap[id] || [];
    const nextSeg   = { text: isLast ? '    ' : '│   ', d: depth };
    children.forEach((c, i) =>
      walk(c.id, [...segments, nextSeg], i === children.length - 1, depth + 1)
    );
  };

  roots.forEach(root => {
    const spouseNames = (root.spouseIds || []).map(sid => pMap[sid]?.name).filter(Boolean);
    makeLine([], '', root, spouseNames, 0);
    const children = childrenMap[root.id] || [];
    children.forEach((c, i) =>
      walk(c.id, [], i === children.length - 1, 1)
    );
  });

  // ── 4. Build header + footer ─────────────────────────────────────────────
  const e  = s => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const nl = s => e(s).replace(/\n/g, '<br>');

  const infoRows = about?.info
    ? Object.entries(about.info)
        .filter(([, v]) => v && String(v).trim())
        .map(([k, v]) => `<tr><td style="padding:1px 10px 1px 0;color:#555">${e(k)}</td><td style="padding:1px 0;color:#222">${e(v)}</td></tr>`)
        .join('')
    : '';

  const loc = about?.location
    ? [about.location.village, about.location.city, about.location.district, about.location.state, about.location.country]
        .filter(Boolean).join(', ')
    : '';

  const { primary: dclPrimary, secondary: dclSecondary } =
    pickLang(about?.disclaimerHindi, about?.disclaimer, lang);
  const disclaimerBlock = (dclPrimary || dclSecondary) ? `
    <div style="font-family:Arial,sans-serif;border:1px solid #c0392b;border-radius:3px;padding:8px 10px;margin-bottom:12px;background:#fff8f8">
      <div style="font-size:9pt;font-weight:700;color:#c0392b;margin-bottom:5px">अस्वीकरण / Disclaimer</div>
      ${dclPrimary   ? `<div style="font-size:7.5pt;color:#444;line-height:1.55;margin-bottom:${dclSecondary ? '4px' : '0'}">${nl(dclPrimary)}</div>`   : ''}
      ${dclSecondary ? `<div style="font-size:7.5pt;color:#555;line-height:1.55;font-style:italic">${nl(dclSecondary)}</div>` : ''}
    </div>` : '';

  const { primary: descPrimary, secondary: descSecondary } =
    pickLang(about?.descriptionHindi, about?.description, lang);
  const descriptionBlock = (descPrimary || descSecondary) ? `
    <div style="font-family:Arial,sans-serif;border:1px solid #c8a45a;border-radius:3px;padding:9px 11px;margin-bottom:10px;background:#fffbf4">
      ${descPrimary   ? `<div style="font-size:8pt;color:#3b2a10;line-height:1.65;margin-bottom:${descSecondary ? '6px' : '0'}">${nl(descPrimary)}</div>`   : ''}
      ${descSecondary ? `<div style="font-size:7.5pt;color:#7b4f2e;line-height:1.6;font-style:italic">${nl(descSecondary)}</div>` : ''}
    </div>` : '';

  const header = `
    ${disclaimerBlock}
    <div style="border-bottom:2px solid #1a3a6b;padding-bottom:8px;margin-bottom:10px">
      <div style="font-size:14pt;font-weight:700;color:#1a3a6b">${e(meta.pageTitle || meta.dynasty)}</div>
      ${meta.dynasty ? `<div style="font-size:9pt;color:#444;margin-top:2px">वंश: ${e(meta.dynasty)}</div>` : ''}
      ${loc ? `<div style="font-size:8.5pt;color:#555;margin-top:1px">📍 ${e(loc)}</div>` : ''}
    </div>
    ${infoRows ? `<table style="font-family:Arial,sans-serif;font-size:8pt;border-collapse:collapse;margin-bottom:10px">${infoRows}</table>` : ''}
    ${descriptionBlock}
    <div style="font-family:Arial,sans-serif;font-size:8pt;color:#777;margin-bottom:6px">
      ${meta.lastUpdated ? `अंतिम अद्यतन: ${e(meta.lastUpdated)}` : ''}
      ${meta.maintainer ? ` &nbsp;·&nbsp; संधारक: ${e(meta.maintainer)}` : ''}
      &nbsp;·&nbsp; कुल सदस्य: ${people.length}
    </div>
    <div style="font-family:Arial,sans-serif;font-size:8pt;color:#555;margin-bottom:8px;padding:4px 8px;background:#f5f5f5;border-radius:3px;display:inline-block">
      <span style="color:#888;font-family:'Courier New',monospace">स्व. नाम</span>
      &nbsp;= स्वर्गीय (दिवंगत) &nbsp;·&nbsp;
      <span style="color:#888;font-family:'Courier New',monospace">Prefix "स्व."</span>
      = Svargiya (Departed)
    </div>
    <div style="border-bottom:1px solid #ccc;margin-bottom:10px"></div>`;

  const footer = `
    <div style="border-top:1px solid #ccc;margin-top:14px;padding-top:6px;font-family:Arial,sans-serif">
      ${meta.blog ? `<div style="font-size:7.5pt;color:#1a5276">${e(meta.blog)}</div>` : ''}
    </div>`;

  // ── 5. Inject print-only overlay and trigger print ──────────────────────
  const OVERLAY_ID = '__vv_print_tree';
  const STYLE_ID   = '__vv_print_tree_style';
  document.getElementById(OVERLAY_ID)?.remove();
  document.getElementById(STYLE_ID)?.remove();

  const styleEl = document.createElement('style');
  styleEl.id = STYLE_ID;
  styleEl.textContent = `
    #${OVERLAY_ID} {
      display: none;
      font-family: "Courier New", Courier, monospace;
      font-size: 8.5pt;
      background: #fff;
      margin: 0; padding: 0;
    }
    @page { size: A4 portrait; margin: 15mm 12mm; }
    @media print {
      body > * { display: none !important; }
      #${OVERLAY_ID} { display: block !important; }
    }
  `;
  document.head.appendChild(styleEl);

  const wrap = document.createElement('div');
  wrap.id = OVERLAY_ID;
  wrap.innerHTML = header + divs.join('') + footer;
  document.body.appendChild(wrap);

  window.print();

  setTimeout(() => {
    document.getElementById(OVERLAY_ID)?.remove();
    document.getElementById(STYLE_ID)?.remove();
  }, 2000);
}
