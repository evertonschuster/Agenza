import { FormProvider } from 'react-hook-form';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/shared/ui/dialog';
import { FormFieldsSkeleton } from '@/shared/ui/form-field';
import { DialogFormFooter } from '@/widgets/form-footer';
import { TAG_FORM_FIELDS } from './tagForm';
import { TagFormBody } from './components/TagFormBody';
import type { TagFormShellProps } from './TagFormShell.types';

function TagFormShell(props: TagFormShellProps) {
  const { methods, isEdit, isLoading, isSaving, canSubmit, onOpenChange, onSubmit, finalFocus } =
    props;

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent showCloseButton={!isSaving} finalFocus={finalFocus}>
        <FormProvider {...methods}>
          <form onSubmit={onSubmit} className="contents">
            <DialogHeader>
              <DialogTitle>{isEdit ? 'Editar etiqueta' : 'Nova etiqueta'}</DialogTitle>
            </DialogHeader>
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

export { TagFormShell };
