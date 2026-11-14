import { TagFormShell } from '../../components/TagForm/TagFormShell';
import { useTagFormPage } from './useTagFormPage';
import { TagFormStatus } from './useTagFormPage.types';

export function TagFormPage() {
  const { status, isEdit, isSaving, canSubmit, methods, onOpenChange, onSubmit } = useTagFormPage();

  return (
    <TagFormShell
      methods={methods}
      isEdit={isEdit}
      isLoading={status === TagFormStatus.Loading}
      isSaving={isSaving}
      canSubmit={canSubmit}
      onOpenChange={onOpenChange}
      onSubmit={onSubmit}
    />
  );
}
