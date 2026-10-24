import { ActionLink } from '@/shared/ui/action-link';
import { Button } from '@/shared/ui/button';
import type { PageFormFooterProps } from '../form-footer.types';
import { FormSubmitButton } from './form-submit-button';

function PageFormFooter({ isSaving, canSubmit = true, cancelTo }: PageFormFooterProps) {
  return (
    <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
      {isSaving ? (
        <Button type="button" variant="outline" disabled>
          Cancelar
        </Button>
      ) : (
        <ActionLink to={cancelTo} variant="outline">
          Cancelar
        </ActionLink>
      )}
      <FormSubmitButton isSaving={isSaving} canSubmit={canSubmit} />
    </div>
  );
}

export { PageFormFooter };
