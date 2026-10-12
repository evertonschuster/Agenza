import { Button } from '@/shared/ui/button';
import { DialogClose, DialogFooter } from '@/shared/ui/dialog';
import type { DialogFormFooterProps } from '../form-footer.types';
import { FormSubmitButton } from './form-submit-button';

function DialogFormFooter({ isSaving, canSubmit = true }: DialogFormFooterProps) {
  return (
    <DialogFooter>
      <DialogClose disabled={isSaving} render={<Button variant="outline" />}>
        Cancelar
      </DialogClose>
      <FormSubmitButton isSaving={isSaving} canSubmit={canSubmit} />
    </DialogFooter>
  );
}

export { DialogFormFooter };
