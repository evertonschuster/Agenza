import { FormProvider } from 'react-hook-form';
import { Dialog, DialogContent } from '@/shared/ui/dialog';
import { FormFieldsSkeleton } from '@/shared/ui/form-field';
import { TagFormBody } from './components/TagFormBody';
import { TagFormFooter } from './components/TagFormFooter';
import { TagFormHeader } from './components/TagFormHeader';
import { useTagFormPage } from './useTagFormPage';

export function TagFormPage() {
  const { status, tag, methods, onOpenChange, onSubmit } = useTagFormPage();
  const isLoading = status === 'loading';
  const isEdit = isLoading || tag !== null;

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent>
        <FormProvider {...methods}>
          <form onSubmit={onSubmit} className="contents">
            <TagFormHeader isEdit={isEdit} />
            {isLoading ? <FormFieldsSkeleton fieldCount={3} /> : <TagFormBody />}
            <TagFormFooter
              onCancel={() => onOpenChange(false)}
              submitDisabled={isLoading || methods.formState.isSubmitting}
              isSubmitting={methods.formState.isSubmitting}
            />
          </form>
        </FormProvider>
      </DialogContent>
    </Dialog>
  );
}
