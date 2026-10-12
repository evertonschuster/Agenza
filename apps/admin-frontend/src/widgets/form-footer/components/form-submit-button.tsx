import { ActionButton } from '@/shared/ui/action-button';
import type { FormSubmitButtonProps } from '../form-footer.types';

function FormSubmitButton({ isSaving, canSubmit }: FormSubmitButtonProps) {
  return (
    <ActionButton type="submit" disabled={!canSubmit} pending={isSaving}>
      {isSaving ? 'Salvando…' : 'Salvar'}
    </ActionButton>
  );
}

export { FormSubmitButton };
