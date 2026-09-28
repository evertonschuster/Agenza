import type { ListSectionListProps } from '../list-section.types';

function ListSectionList<T>({ items, renderItem, getKey, ariaLabel }: ListSectionListProps<T>) {
  return (
    <ul
      role="list"
      aria-label={ariaLabel}
      className="overflow-hidden rounded-xl border border-border bg-card"
    >
      {items.map((item) => (
        <li key={getKey(item)} role="listitem" className="border-b border-border last:border-b-0">
          {renderItem(item)}
        </li>
      ))}
    </ul>
  );
}

export { ListSectionList };
