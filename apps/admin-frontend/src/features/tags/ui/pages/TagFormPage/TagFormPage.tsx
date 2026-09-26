import { FormProvider } from 'react-hook-form';
import { Dialog, DialogContent } from '@/shared/ui/dialog';
import { FormFieldsSkeleton } from '@/shared/ui/form-field';
import { TAG_FORM_FIELDS } from '../../../model/tagForm';
import { TagFormBody } from './components/TagFormBody';
import { TagFormFooter } from './components/TagFormFooter';
import { TagFormHeader } from './components/TagFormHeader';
import { useTagFormPage } from './useTagFormPage';
import { TagFormStatus } from './useTagFormPage.types';

export function TagFormPage() {
  const { status, isEdit, isSaving, canSubmit, methods, onOpenChange, onSubmit } = useTagFormPage();
  const isLoading = status === TagFormStatus.Loading;

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent showCloseButton={!isSaving}>
        <FormProvider {...methods}>

          <form onSubmit={onSubmit} className="contents">
            <TagFormHeader isEdit={isEdit} />
            {isLoading ? (
              <FormFieldsSkeleton fieldCount={TAG_FORM_FIELDS.length} />
            ) : (
              <TagFormBody />
            )}
            <TagFormFooter canSubmit={canSubmit} isSaving={isSaving} />
          </form>
          
        </FormProvider>
      </DialogContent>
    </Dialog>
  );
}
