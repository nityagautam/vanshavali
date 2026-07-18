import { useState } from 'react';
import { X, Sparkles, List } from 'lucide-react';

const STORAGE_KEY = 'vv-onboarding-dismissed';
const GEN_COLORS = ['#1a3a6b', '#1a6b3a', '#6b1a4a', '#7a4a00'];

export default function OnboardingLegend() {
  const [dismissed, setDismissed] = useState(() => localStorage.getItem(STORAGE_KEY) === 'true');

  if (dismissed) return null;

  const dismiss = () => {
    localStorage.setItem(STORAGE_KEY, 'true');
    setDismissed(true);
  };

  return (
    <div className="onboarding-card" role="note" aria-label="Quick guide to the family tree">
      <button className="onboarding-close" onClick={dismiss} aria-label="Dismiss guide"><X size={14} /></button>
      <div className="onboarding-title"><Sparkles size={14} /> Welcome</div>
      <ul className="onboarding-list">
        <li><div className="legend-dot male" aria-hidden="true" /> Male</li>
        <li><div className="legend-dot female" aria-hidden="true" /> Female</li>
        <li><div className="legend-line" aria-hidden="true" /> Parent–Child</li>
        <li><span aria-hidden="true" style={{ color: 'var(--gold)', fontSize: '0.9rem' }}>⚭</span> Married</li>
        <li>
          <span className="onboarding-swatches" aria-hidden="true">
            {GEN_COLORS.map(c => <span key={c} className="onboarding-swatch" style={{ background: c }} />)}
          </span>
          Card top color cycles by generation
        </li>
        <li>
          <span className="onboarding-swatch onboarding-swatch-ph" aria-hidden="true">?</span>
          A "?" avatar marks an unrecorded spouse
        </li>
        <li>Search, filter, and adjust Depth from the toolbar above</li>
        <li>
          <List size={14} aria-hidden="true" />
          Toggle the toolbar's view button for a tap-to-drill-down list — handy on small screens
        </li>
        <li>Click any card for full details</li>
      </ul>
    </div>
  );
}
