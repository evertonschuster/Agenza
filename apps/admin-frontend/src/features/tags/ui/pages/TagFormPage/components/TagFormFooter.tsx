import { ActionButton } from '@/shared/ui/action-button';
import { Button } from '@/shared/ui/button';
import { DialogClose, DialogFooter } from '@/shared/ui/dialog';
import { SAVE_SHORTCUT_ID } from '../useTagFormPage';

interface TagFormFooterProps {
  canSubmit: boolean;
  isSaving: boolean;
}

function TagFormFooter({ canSubmit, isSaving }: TagFormFooterProps) {
  return (
    <DialogFooter>
      <DialogClose render={<Button variant="outline" />}>Cancelar</DialogClose>
      <ActionButton
        type="submit"
        disabled={!canSubmit}
        pending={isSaving}
        shortcutId={SAVE_SHORTCUT_ID}
      >
        {isSaving ? 'Salvando…' : 'Salvar'}
      </ActionButton>
    </DialogFooter>
  );
}

export { TagFormFooter };
