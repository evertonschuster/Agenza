import { useEffect } from 'react';
import { useFetcher } from 'react-router';
import { Trash2Icon } from 'lucide-react';
import { ConfirmDialog } from '@/shared/ui/confirm-dialog';
import { toast } from '@/shared/ui/toast';
import { isTransientProblem } from '@/shared/api/servicesFacade';
import type { Tag } from '../../../model/tag';
import type { tagsAction } from './route';

interface DeleteTagDialogProps {
  tag: Tag;
  onOpenChange: (open: boolean) => void;
}

function DeleteTagDialog({ tag, onOpenChange }: DeleteTagDialogProps) {
  const fetcher = useFetcher<typeof tagsAction>();

  useEffect(() => {
    if (fetcher.state === 'idle' && fetcher.data?.ok) {
      toast.add({
        title: 'Etiqueta excluída',
        description: `"${tag.name}" foi removida do catálogo.`,
        type: 'success',
      });
      onOpenChange(false);
    }
  }, [fetcher.state, fetcher.data, onOpenChange, tag.name]);

  const problem = fetcher.data && !fetcher.data.ok ? fetcher.data.error : undefined;
  const failureMessage = problem
    ? (problem.errors?.['']?.[0]?.message ?? problem.title ?? undefined)
    : undefined;
  const failure =
    problem && failureMessage
      ? { message: failureMessage, transient: isTransientProblem(problem) }
      : undefined;
  const isSubmitting = fetcher.state !== 'idle';

  function handleConfirm() {
    void fetcher.submit({ intent: 'delete', id: tag.id }, { method: 'post' });
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
