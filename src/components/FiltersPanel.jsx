import { Minus, Plus } from 'lucide-react';

// Shared by the desktop toolbar pills (short labels) and the phone filters
// sheet (long labels).
export function filterGroups(lang) {
  const en = lang === 'en';
  return [
    { key: 'gender', title: en ? 'Gender' : 'लिंग', options: [
      ['all', en ? 'All' : 'सभी', en ? 'All' : 'सभी'],
      ['male', en ? 'Male' : 'पु', en ? 'Male' : 'पुरुष'],
      ['female', en ? 'Female' : 'स्त्री', en ? 'Female' : 'स्त्री'],
    ] },
    { key: 'status', title: en ? 'Status' : 'स्थिति', options: [
      ['all', en ? 'All' : 'सभी', en ? 'All' : 'सभी'],
      ['living', en ? 'Living' : 'जी', en ? 'Living' : 'जीवित'],
      ['deceased', en ? 'Deceased' : 'मृ', en ? 'Deceased' : 'दिवंगत'],
    ] },
    { key: 'marriage', title: en ? 'Marriage' : 'वैवाहिक', options: [
      ['all', en ? 'All' : 'सभी', en ? 'All' : 'सभी'],
      ['married', en ? 'Married' : 'वि', en ? 'Married' : 'विवाहित'],
      ['unmarried', en ? 'Unmarried' : 'अवि', en ? 'Unmarried' : 'अविवाहित'],
    ] },
  ];
}

export function stepDepth(maxGen, totalGen, dir) {
  if (dir < 0) { const cur = maxGen ?? totalGen; return cur > 1 ? cur - 1 : cur; }
  if (maxGen === null) return null;
  const n = maxGen + 1;
  return n >= totalGen ? null : n;
}

export default function FiltersPanel({
  lang, values, onChange, maxGen, setMaxGen, totalGen,
  resultCount, active, onReset, onDone,
}) {
  return (
    <div className="filters-panel">
      {filterGroups(lang).map(g => (
        <section key={g.key}>
          <h4 className="group-title">{g.title}</h4>
          <div className="chips" role="group" aria-label={g.title}>
            {g.options.map(([v, , long]) => (
              <button
                key={v}
                type="button"
                className={`chip${values[g.key] === v ? ' on' : ''}`}
                aria-pressed={values[g.key] === v}
                onClick={() => onChange(g.key, v)}
              >{long}</button>
            ))}
          </div>
        </section>
      ))}
      <section>
        <h4 className="group-title">{lang === 'en' ? 'Special' : 'विशेष'}</h4>
        <div className="chips">
          <button type="button" className={`chip${values.keepers ? ' on' : ''}`} aria-pressed={!!values.keepers}
            onClick={() => onChange('keepers', !values.keepers)}>
            {lang === 'en' ? 'Record keepers only' : 'अभिलेख संरक्षक'}
          </button>
        </div>
      </section>
      <section>
        <h4 className="group-title">{lang === 'en' ? 'Generations shown' : 'पीढ़ियाँ'}</h4>
        <div className="stepper">
          <button type="button" className="stepper-btn" aria-label="Show one fewer generation"
            disabled={maxGen === 1} onClick={() => setMaxGen(stepDepth(maxGen, totalGen, -1))}><Minus size={16} /></button>
          <b>{maxGen ?? (lang === 'en' ? 'All' : 'सभी')}</b>
          <button type="button" className="stepper-btn" aria-label="Show one more generation"
            disabled={maxGen === null} onClick={() => setMaxGen(stepDepth(maxGen, totalGen, +1))}><Plus size={16} /></button>
        </div>
      </section>
      <div className="sheet-actions">
        <button type="button" className="btn-ghost" onClick={onReset} disabled={!active}>
          {lang === 'en' ? 'Reset' : 'रीसेट'}
        </button>
        <button type="button" className="btn-primary" onClick={onDone}>
          {active
            ? (lang === 'en' ? `Show ${resultCount} people` : `${resultCount} सदस्य दिखाएँ`)
            : (lang === 'en' ? 'Done' : 'ठीक है')}
        </button>
      </div>
    </div>
  );
}
