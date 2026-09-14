import { useEffect } from 'react';
import { useFetcher } from 'react-router';
import { AlertCircleIcon, Trash2Icon } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/dialog';
import { Button } from '@/shared/ui/button';
import { toast } from '@/shared/ui/toast';
import { NETWORK_PROBLEM, SERVER_PROBLEM, SESSION_PROBLEM } from '@/shared/api/servicesFacade';
import type { Tag } from '../../../model/tag';
import type { tagsAction } from './route';

interface DeleteTagDialogProps {
  tag: Tag;
  onOpenChange: (open: boolean) => void;
}

const TRANSIENT_ERROR_CODES = new Set(
  [NETWORK_PROBLEM.code, SESSION_PROBLEM.code, SERVER_PROBLEM.code].filter(
    (code): code is string => code != null,
  ),
);

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

  const failure = fetcher.data && !fetcher.data.ok ? fetcher.data.error : undefined;
  const failureMessage = failure
    ? (failure.errors?.['']?.[0]?.message ?? failure.title ?? undefined)
    : undefined;
  const isTransientFailure = !!failure?.code && TRANSIENT_ERROR_CODES.has(failure.code);
  const isBlocked = !!failureMessage && !isTransientFailure;
  const isSubmitting = fetcher.state !== 'idle';

  function handleDelete() {
    void fetcher.submit({ intent: 'delete', id: tag.id }, { method: 'post' });
  }

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent>
        {isBlocked ? (
          <>
            <DialogHeader>
              <div className="mb-1 flex size-9 items-center justify-center rounded-full bg-destructive/10 text-destructive">
                <AlertCircleIcon aria-hidden="true" className="size-5" />
              </div>
              <DialogTitle>Não é possível excluir</DialogTitle>
              <DialogDescription>{failureMessage}</DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Entendi
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Excluir etiqueta?</DialogTitle>
              <DialogDescription>
                Tem certeza que deseja excluir a etiqueta "{tag.name}"? Essa ação não pode ser
                desfeita.
              </DialogDescription>
            </DialogHeader>
            {isTransientFailure && (
              <div
                role="alert"
                className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
              >
                <AlertCircleIcon aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
                <span>{failureMessage}</span>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button variant="destructive" onClick={handleDelete} disabled={isSubmitting}>
                <Trash2Icon aria-hidden="true" />
                {isTransientFailure ? 'Tentar novamente' : 'Excluir'}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

export { DeleteTagDialog };
