import { AlertCircleIcon, SearchXIcon } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/dialog';
import { Button } from '@/shared/ui/button';

interface TagUnavailableDialogProps {
  reason: 'not-found' | 'error';
  onClose: () => void;
  onRetry?: (() => void) | undefined;
}

function TagUnavailableDialog({ reason, onClose, onRetry }: TagUnavailableDialogProps) {
  const isNotFound = reason === 'not-found';

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <div className="mb-1 flex size-9 items-center justify-center rounded-full bg-muted text-muted-foreground">
            {isNotFound ? (
              <SearchXIcon aria-hidden="true" className="size-5" />
            ) : (
              <AlertCircleIcon aria-hidden="true" className="size-5" />
            )}
          </div>
          <DialogTitle>
            {isNotFound ? 'Etiqueta não encontrada' : 'Não foi possível carregar'}
          </DialogTitle>
          <DialogDescription>
            {isNotFound
              ? 'Ela pode ter sido removida por outra pessoa, ou o link não é mais válido.'
              : 'Não foi possível carregar os dados desta etiqueta. Tente novamente.'}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          {!isNotFound && onRetry && (
            <Button variant="outline" onClick={onRetry}>
              Tentar novamente
            </Button>
          )}
          <Button variant={isNotFound ? 'outline' : 'default'} onClick={onClose}>
            Voltar para a lista
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export { TagUnavailableDialog };
