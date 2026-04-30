import Avatar from './Avatar';
import { getTagStyle } from '../utils/tagColor';

export default function PersonCard({ person, selected, highlighted, dimmed, onClick }) {
  const isPlaceholder = person.tags?.includes('placeholder');
  const isDeceased = person.alive === false && !isPlaceholder;

  const formatYear = (y) => {
    if (!y) return null;
    return typeof y === 'number' ? y : y.toString().slice(0, 4);
  };

  const bornYear = formatYear(person.born);
  const diedYear = formatYear(person.died);
  let yearsText = null;
  if (bornYear || diedYear) {
    yearsText = `${bornYear || '?'} – ${isDeceased ? (diedYear || '?') : 'present'}`;
  }

  const primaryTag = person.tags?.find(t => !['root', 'verified-source'].includes(t));

  const cls = [
    'person-card',
    selected     ? 'selected'     : '',
    highlighted  ? 'highlighted'  : '',
    dimmed       ? 'dimmed'       : '',
    isPlaceholder ? 'placeholder-card' : '',
    isDeceased   ? 'deceased-card' : '',
  ].filter(Boolean).join(' ');

  return (
    <div className={cls} onClick={onClick} title={person.name}>
      <Avatar person={person} size="sm" />
      <div className="card-name">{person.name}</div>
      {yearsText && <div className="card-years">{yearsText}</div>}
      {person.occupation && !isPlaceholder && (
        <div className="card-occupation">{person.occupation}</div>
      )}
      {primaryTag && (
        <span className="card-tag" style={getTagStyle(primaryTag)}>{primaryTag}</span>
      )}
    </div>
  );
}
