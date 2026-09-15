import { useState } from 'react';
import { Trash2Icon } from 'lucide-react';
import { ConfirmDialog, type ConfirmDialogFailure } from '@/shared/ui/confirm-dialog';
import { toast } from '@/shared/ui/toast';
import { extractErrorMessage, isTransientProblem } from '@/shared/api/servicesFacade';
import { tagsRepository } from '../../../api/tagsRepository';
import type { Tag } from '../../../model/tag';

interface DeleteTagDialogProps {
  tag: Tag;
  onOpenChange: (open: boolean) => void;
  onDeleted: () => void;
}

function DeleteTagDialog({ tag, onOpenChange, onDeleted }: DeleteTagDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [failure, setFailure] = useState<ConfirmDialogFailure>();

  function handleConfirm() {
    void deleteTag();
  }

  async function deleteTag() {
    setIsSubmitting(true);
    const result = await tagsRepository.remove(tag.id);
    setIsSubmitting(false);

    if (result.ok) {
      toast.add({
        title: 'Etiqueta excluída',
        description: `"${tag.name}" foi removida do catálogo.`,
        type: 'success',
      });
      onDeleted();
      onOpenChange(false);
      return;
    }

    setFailure({
      message: extractErrorMessage(result.error),
      transient: isTransientProblem(result.error),
    });
  }

  return (
    <ConfirmDialog
      open
      onOpenChange={onOpenChange}
      onConfirm={handleConfirm}
      isSubmitting={isSubmitting}
      title="Excluir etiqueta?"
      description={
        <>
          Tem certeza que deseja excluir a etiqueta "{tag.name}"? Essa ação não pode ser desfeita.
        </>
      }
      confirmLabel="Excluir"
      confirmIcon={Trash2Icon}
      blockedTitle="Não é possível excluir"
      failure={failure}
    />
  );
}

export { DeleteTagDialog };
