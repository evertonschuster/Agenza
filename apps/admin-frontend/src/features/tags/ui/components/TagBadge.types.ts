import type { Tag } from '../../model/tag';

export interface TagBadgeProps {
  tag: Pick<Tag, 'name' | 'color'>;
}
