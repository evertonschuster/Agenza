import { TagFormDialog } from '../../components/TagForm/TagFormDialog';
import type { TagCreationDialogProps } from './TagCreationDialog.types';
import { useTagCreationDialog } from './useTagCreationDialog';

function TagCreationDialog(props: TagCreationDialogProps) {
  const { methods, isSaving, onOpenChange, onSubmit } = useTagCreationDialog(props);

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

export { TagCreationDialog };
