import type { CSSProperties } from 'react';
import { PencilIcon, Trash2Icon } from 'lucide-react';
import { Button } from '@/shared/ui/button';
import type { Tag } from '../../../model/tag';

interface TagRowProps {
  tag: Tag;
  onEdit: (tag: Tag) => void;
  onDelete: (tag: Tag) => void;
}

function TagRow({ tag, onEdit, onDelete }: TagRowProps) {
  return (
    <div className="flex items-center gap-3 border-b border-border px-4 py-3 last:border-b-0">
      <span className="tag" style={{ '--tag': tag.color } as CSSProperties}>
        {tag.name}
      </span>
      <span
        className={
          tag.description
            ? 'min-w-0 flex-1 truncate text-sm text-muted-foreground'
            : 'min-w-0 flex-1 truncate text-sm text-muted-foreground italic opacity-70'
        }
      >
        {tag.description ?? 'Sem descrição'}
      </span>
      <div className="flex shrink-0 gap-1">
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={`Editar ${tag.name}`}
          onClick={() => onEdit(tag)}
        >
          <PencilIcon aria-hidden="true" />
        </Button>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={`Excluir ${tag.name}`}
          onClick={() => onDelete(tag)}
        >
          <Trash2Icon aria-hidden="true" />
        </Button>
      </div>
    </div>
  );
}

export { TagRow };
