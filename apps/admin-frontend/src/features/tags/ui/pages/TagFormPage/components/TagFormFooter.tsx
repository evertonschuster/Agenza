import { Loader2Icon } from 'lucide-react';
import { useFormState } from 'react-hook-form';
import type { ShortcutHint } from '@/shared/keyboard/shortcuts';
import { Button } from '@/shared/ui/button';
import { DialogClose, DialogFooter } from '@/shared/ui/dialog';
import { ShortcutKbd } from '@/shared/ui/kbd';

interface TagFormFooterProps {
  canSubmit: boolean;
  saveHint: ShortcutHint;
}

function TagFormFooter({ canSubmit, saveHint }: TagFormFooterProps) {
  const { isSubmitting } = useFormState();

  return (
    <DialogFooter>
      <DialogClose render={<Button variant="outline" />}>Cancelar</DialogClose>
      <Button type="submit" disabled={!canSubmit} aria-keyshortcuts={saveHint.ariaKeyshortcuts}>
        {isSubmitting && <Loader2Icon aria-hidden="true" className="animate-spin" />}
        {isSubmitting ? 'Salvando…' : 'Salvar'}
        <ShortcutKbd hint={saveHint} />
      </Button>
    </DialogFooter>
  );
}

export { TagFormFooter };
