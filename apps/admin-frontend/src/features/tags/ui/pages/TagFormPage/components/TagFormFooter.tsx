import { ActionButton } from '@/shared/ui/action-button';
import { Button } from '@/shared/ui/button';
import { DialogClose, DialogFooter } from '@/shared/ui/dialog';

interface TagFormFooterProps {
  canSubmit: boolean;
  isSaving: boolean;
}

function TagFormFooter({ canSubmit, isSaving }: TagFormFooterProps) {
  return (
    <DialogFooter>
      <DialogClose disabled={isSaving} render={<Button variant="outline" />}>
        Cancelar
      </DialogClose>
      <ActionButton type="submit" disabled={!canSubmit} pending={isSaving}>
        {isSaving ? 'Salvando…' : 'Salvar'}
      </ActionButton>
    </DialogFooter>
  );
}

export { TagFormFooter };
