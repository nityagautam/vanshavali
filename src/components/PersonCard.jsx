import { memo } from 'react';
import { ScrollText } from 'lucide-react';
import Avatar from './Avatar';
import { isRecordKeeper } from '../utils/recordKeeper';
import { useIsSelected } from '../utils/selectionStore';

const yearOf = y => (!y ? null : typeof y === 'number' ? y : y.toString().slice(0, 4));

function PersonCard({ person, highlighted, dimmed, onSelect }) {
  const selected = useIsSelected(person.id);
  const isPlaceholder = person.tags?.includes('placeholder');
  const isDeceased = person.alive !== true && !isPlaceholder;

  const born = yearOf(person.born);
  const died = yearOf(person.died);
  const years = isDeceased
    ? (born || died ? `${born || '?'} – ${died || '?'}` : null)
    : born;

  const name = isDeceased && !/^स्व/.test(person.name) ? `स्व. ${person.name}` : person.name;

  const keeper = isRecordKeeper(person);
  const cls = [
    'person-card',
    selected      ? 'selected'         : '',
    highlighted   ? 'highlighted'      : '',
    dimmed        ? 'dimmed'           : '',
    isPlaceholder ? 'placeholder-card' : '',
    isDeceased    ? 'deceased-card'    : '',
    keeper        ? 'keeper-card'      : '',
  ].filter(Boolean).join(' ');

  const status = isPlaceholder ? '' : isDeceased ? ', deceased' : ', living';
  const ariaLabel = `${person.name}${status}${years ? `, ${years}` : ''}${keeper ? ', record keeper' : ''}`;

  return (
    <button
      type="button"
      className={cls}
      onClick={() => onSelect(person)}
      title={person.name}
      aria-label={ariaLabel}
      aria-pressed={selected}
      data-person-id={person.id}
    >
      <Avatar person={person} size="sm" />
      <span className="card-text">
        <span className="card-name">{name}</span>
        {years && <span className="card-years">{years}</span>}
      </span>
      {keeper && <span className="card-seal" title="Record keeper" aria-hidden="true"><ScrollText size={12} /></span>}
      {highlighted && <span className="card-hit" aria-hidden="true" />}
    </button>
  );
}

export default memo(PersonCard);
