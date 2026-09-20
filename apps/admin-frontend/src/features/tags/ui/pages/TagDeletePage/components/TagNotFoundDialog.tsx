import { SearchXIcon } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/dialog';
import { Button } from '@/shared/ui/button';

interface TagNotFoundDialogProps {
  onClose: () => void;
}

function TagNotFoundDialog({ onClose }: TagNotFoundDialogProps) {
  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <div className="mb-1 flex size-9 items-center justify-center rounded-full bg-muted text-muted-foreground">
            <SearchXIcon aria-hidden="true" className="size-5" />
          </div>
          <DialogTitle>Etiqueta não encontrada</DialogTitle>
          <DialogDescription>
            Ela pode ter sido excluída por outra pessoa, ou não corresponde à busca ativa.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Voltar para a lista
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export { TagNotFoundDialog };
