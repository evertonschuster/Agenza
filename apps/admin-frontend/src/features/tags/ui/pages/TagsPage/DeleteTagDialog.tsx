import { ConfirmDialog } from '@/shared/ui/confirm-dialog';
import { tagsRepository } from '../../../api/tagsRepository';
import type { Tag } from '../../../model/tag';

interface DeleteTagDialogProps {
  tag: Tag;
  onOpenChange: (open: boolean) => void;
  onDeleted: () => void;
}

function DeleteTagDialog({ tag, onOpenChange, onDeleted }: DeleteTagDialogProps) {
  function handleConfirm() {
    return tagsRepository.remove(tag.id);
  }

  return (
    <ConfirmDialog
      onOpenChange={onOpenChange}
      onConfirm={handleConfirm}
      onSuccess={onDeleted}
      confirmation={{
        description: `Tem certeza que deseja excluir a etiqueta "${tag.name}"? Essa ação não pode ser desfeita.`,
      }}
      success={{
        description: `"${tag.name}" foi removida do catálogo.`,
      }}
    />
  );
}

export { DeleteTagDialog };
