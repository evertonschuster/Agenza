import { Button } from '@/shared/ui/button';
import type { PageFormFooterProps } from '../form-footer.types';
import { FormSubmitButton } from './form-submit-button';

function PageFormFooter({ isSaving, canSubmit = true, onCancel }: PageFormFooterProps) {
  return (
    <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
      <Button type="button" variant="outline" disabled={isSaving} onClick={onCancel}>
        Cancelar
      </Button>
      <FormSubmitButton isSaving={isSaving} canSubmit={canSubmit} />
    </div>
  );
}

export { PageFormFooter };
