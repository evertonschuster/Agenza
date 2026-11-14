import { TagFormDialog } from '../../components/TagForm/TagFormDialog';
import type { TagCreateDialogProps } from './TagCreateDialog.types';
import { useTagCreateDialog } from './useTagCreateDialog';

function TagCreateDialog(props: TagCreateDialogProps) {
  const { methods, isSaving, onOpenChange, onSubmit } = useTagCreateDialog(props);

  return (
    <TagFormDialog
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

export { TagCreateDialog };
