import { Link } from 'react-router';
import { ActionButton } from '@/shared/ui/action-button';
import { Button, buttonVariants } from '@/shared/ui/button';
import { DialogClose, DialogFooter } from '@/shared/ui/dialog';

interface FormFooterProps {
  isSaving: boolean;
  canSubmit?: boolean;
  cancelTo?: string;
}

function FormFooter({ isSaving, canSubmit = true, cancelTo }: FormFooterProps) {
  const submit = (
    <ActionButton type="submit" disabled={!canSubmit} pending={isSaving}>
      {isSaving ? 'Salvando…' : 'Salvar'}
    </ActionButton>
  );

  if (cancelTo === undefined) {
    return (
      <DialogFooter>
        <DialogClose disabled={isSaving} render={<Button variant="outline" />}>
          Cancelar
        </DialogClose>
        {submit}
      </DialogFooter>
    );
  }

  return (
    <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
      {isSaving ? (
        <Button type="button" variant="outline" disabled>
          Cancelar
        </Button>
      ) : (
        <Link to={cancelTo} className={buttonVariants({ variant: 'outline' })}>
          Cancelar
        </Link>
      )}
      {submit}
    </div>
  );
}

export { FormFooter };
export type { FormFooterProps };
