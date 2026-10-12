import { Link } from 'react-router';
import { Button, buttonVariants } from '@/shared/ui/button';
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
        <Link to={cancelTo} className={buttonVariants({ variant: 'outline' })}>
          Cancelar
        </Link>
      )}
      <FormSubmitButton isSaving={isSaving} canSubmit={canSubmit} />
    </div>
  );
}

export { PageFormFooter };
