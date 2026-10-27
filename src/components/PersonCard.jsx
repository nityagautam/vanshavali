import Avatar from './Avatar';

const yearOf = y => (!y ? null : typeof y === 'number' ? y : y.toString().slice(0, 4));

export default function PersonCard({ person, selected, highlighted, dimmed, onClick }) {
  const isPlaceholder = person.tags?.includes('placeholder');
  const isDeceased = person.alive !== true && !isPlaceholder;

  const born = yearOf(person.born);
  const died = yearOf(person.died);
  const years = isDeceased
    ? (born || died ? `${born || '?'} – ${died || '?'}` : null)
    : born;

  const name = isDeceased && !/^स्व/.test(person.name) ? `स्व. ${person.name}` : person.name;

  const cls = [
    'person-card',
    selected      ? 'selected'         : '',
    highlighted   ? 'highlighted'      : '',
    dimmed        ? 'dimmed'           : '',
    isPlaceholder ? 'placeholder-card' : '',
    isDeceased    ? 'deceased-card'    : '',
  ].filter(Boolean).join(' ');

  const status = isPlaceholder ? '' : isDeceased ? ', deceased' : ', living';
  const ariaLabel = `${person.name}${status}${years ? `, ${years}` : ''}`;

  return (
    <button
      type="button"
      className={cls}
      onClick={onClick}
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
      {highlighted && <span className="card-hit" aria-hidden="true" />}
    </button>
  );
}
