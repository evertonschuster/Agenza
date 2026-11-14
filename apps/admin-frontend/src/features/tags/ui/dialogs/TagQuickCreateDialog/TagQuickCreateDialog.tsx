import { TagFormShell } from '../../components/TagForm/TagFormShell';
import type { TagQuickCreateDialogProps } from './TagQuickCreateDialog.types';
import { useTagQuickCreateDialog } from './useTagQuickCreateDialog';

function TagQuickCreateDialog(props: TagQuickCreateDialogProps) {
  const { methods, isSaving, onOpenChange, onSubmit } = useTagQuickCreateDialog(props);

  return (
    <TagFormShell
      methods={methods}
      isEdit={false}
      isLoading={false}
      isSaving={isSaving}
      canSubmit={!isSaving}
      onOpenChange={onOpenChange}
      onSubmit={onSubmit}
      finalFocus={props.finalFocus}
    />
  );
}

export { TagQuickCreateDialog };
