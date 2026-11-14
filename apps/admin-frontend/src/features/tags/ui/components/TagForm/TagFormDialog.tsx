import { FormProvider } from 'react-hook-form';
import { Dialog, DialogContent } from '@/shared/ui/dialog';
import { FormFieldsSkeleton } from '@/shared/ui/form-field';
import { DialogFormFooter } from '@/widgets/form-footer';
import { TAG_FORM_FIELDS } from './tagForm';
import { TagFormBody } from './TagFormBody';
import type { TagFormDialogProps } from './TagFormDialog.types';
import { TagFormHeader } from './TagFormHeader';

function TagFormDialog(props: TagFormDialogProps) {
  const { methods, isEdit, isLoading, isSaving, canSubmit, onOpenChange, onSubmit, finalFocus } =
    props;

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent showCloseButton={!isSaving} finalFocus={finalFocus}>
        <FormProvider {...methods}>
          <form onSubmit={onSubmit} className="contents">
            <TagFormHeader isEdit={isEdit} />
            {isLoading ? (
              <FormFieldsSkeleton fieldCount={TAG_FORM_FIELDS.length} />
            ) : (
              <TagFormBody />
            )}
            <DialogFormFooter canSubmit={canSubmit} isSaving={isSaving} />
          </form>
        </FormProvider>
      </DialogContent>
    </Dialog>
  );
}

export { TagFormDialog };
