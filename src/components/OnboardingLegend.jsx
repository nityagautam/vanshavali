import { useState } from 'react';
import { X, Sparkles, List } from 'lucide-react';

const STORAGE_KEY = 'vv-onboarding-dismissed';
const GEN_COLORS = ['var(--g1)', 'var(--g2)', 'var(--g3)', 'var(--g4)'];

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
        <li><div className="legend-line" aria-hidden="true" /> Parent–Child</li>
        <li><span aria-hidden="true" style={{ color: 'var(--ink-2)', fontSize: '0.9rem' }}>⚭</span> Married</li>
        <li>
          <span className="onboarding-swatches" aria-hidden="true">
            {GEN_COLORS.map(c => <span key={c} className="onboarding-swatch" style={{ background: c }} />)}
          </span>
          Avatar ring colour cycles by generation
        </li>
        <li>
          <span className="onboarding-swatch onboarding-swatch-ph" aria-hidden="true">?</span>
          A "?" avatar marks an unrecorded spouse
        </li>
        <li>Search above; use Filters for gender, status, marriage and depth</li>
        <li>
          <List size={14} aria-hidden="true" />
          Switch to a tap-to-drill-down list with the list button — handy on small screens
        </li>
        <li>Tap any card for full details; drag to pan, pinch to zoom</li>
      </ul>
    </div>
  );
}
