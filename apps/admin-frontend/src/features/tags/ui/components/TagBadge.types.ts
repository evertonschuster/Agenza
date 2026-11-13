import type { Tag } from '../../model/tag';

export interface TagBadgeProps {
  readonly tag: Pick<Tag, 'name' | 'color'>;
}
