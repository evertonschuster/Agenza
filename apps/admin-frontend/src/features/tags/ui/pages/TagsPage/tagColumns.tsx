import type { CSSProperties } from 'react';
import type { ListSectionColumn } from '@/shared/ui/list-section';
import { TagActions } from './components/TagActions';
import type { Tag } from '../../../model/tag';

export function tagColumns(
  onEdit: (tag: Tag) => void,
  onDelete: (tag: Tag) => void,
): ListSectionColumn<Tag>[] {
  return [
    {
      key: 'name',
      header: 'Nome',
      cell: (tag) => (
        <span className="tag" style={{ '--tag': tag.color } as CSSProperties}>
          {tag.name}
        </span>
      ),
    },
    {
      key: 'description',
      header: 'Descrição',
      cell: (tag) => (
        <span
          className={
            tag.description
              ? 'text-sm text-muted-foreground'
              : 'text-sm text-muted-foreground italic opacity-70'
          }
        >
          {tag.description ?? 'Sem descrição'}
        </span>
      ),
    },
    {
      key: 'actions',
      header: 'Ações',
      align: 'end',
      cell: (tag) => <TagActions tag={tag} onEdit={onEdit} onDelete={onDelete} />,
    },
  ];
}
