import type { CSSProperties } from 'react';
import { OptionalText } from '@/shared/ui/optional-text';
import { Skeleton } from '@/shared/ui/skeleton';
import type { ListSectionColumn } from '@/widgets/list-section';
import { TagDeleteLink } from './TagDeleteLink';
import { TagEditLink } from './TagEditLink';
import type { Tag } from '../../../../model/tag';

export function tagColumns(): ListSectionColumn<Tag>[] {
  return [
    {
      key: 'name',
      header: 'Nome',
      skeleton: <Skeleton className="h-6 w-24" />,
      cell: (tag) => (
        <span className="tag" style={{ '--tag': tag.color } as CSSProperties}>
          {tag.name}
        </span>
      ),
    },
    {
      key: 'description',
      header: 'Descrição',
      skeleton: <Skeleton className="h-5 w-48" />,
      cell: (tag) => (
        <OptionalText
          value={tag.description}
          fallback="Sem descrição"
          className="text-sm text-muted-foreground"
        />
      ),
    },
    {
      key: 'actions',
      header: 'Ações',
      align: 'end',
      skeleton: (
        <div className="flex items-center gap-1">
          <Skeleton className="size-7" />
          <Skeleton className="size-7" />
        </div>
      ),
      cell: (tag) => (
        <div className="flex items-center gap-1">
          <TagEditLink tag={tag} />
          <TagDeleteLink tag={tag} />
        </div>
      ),
    },
  ];
}
