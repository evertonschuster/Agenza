import type { CSSProperties } from 'react';
import type { TagBadgeProps } from './TagBadge.types';

function TagBadge({ tag }: TagBadgeProps) {
  return (
    <span className="tag max-w-full min-w-0" style={{ '--tag': tag.color } as CSSProperties}>
      <span className="min-w-0 truncate">{tag.name}</span>
    </span>
  );
}

export { TagBadge };
