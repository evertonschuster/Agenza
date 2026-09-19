import { PencilIcon, Trash2Icon } from 'lucide-react';
import { Button } from '@/shared/ui/button';
import type { Tag } from '../../../../model/tag';

interface TagActionsProps {
  tag: Tag;
  onEdit: (tag: Tag) => void;
  onDelete: (tag: Tag) => void;
}

function TagActions({ tag, onEdit, onDelete }: TagActionsProps) {
  return (
    <div className="flex justify-end gap-1">
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
  );
}

export { TagActions };
