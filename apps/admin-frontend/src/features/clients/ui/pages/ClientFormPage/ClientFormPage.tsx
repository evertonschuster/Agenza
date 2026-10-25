import { FormProvider } from 'react-hook-form';
import { FormErrorBanner } from '@/shared/form/fields';
import { PageFormFooter } from '@/widgets/form-footer';
import { ClientFormHeader } from './components/ClientFormHeader';
import { ClientFormSkeleton } from './components/ClientFormSkeleton';
import { ClientGuardiansSection } from './components/ClientGuardiansSection';
import { ClientPersonSection } from './components/ClientPersonSection';
import { ClientReferenceContactsSection } from './components/ClientReferenceContactsSection';
import { ClientStatusDialog } from './components/ClientStatusDialog';
import { useClientFormPage } from './useClientFormPage';
import { ClientFormStatus } from './useClientFormPage.types';

export function ClientFormPage() {
  const { status, methods, isSaving, canSubmit, statusChange, onSubmit, onCancel } =
    useClientFormPage();

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6">
      <ClientFormHeader isSaving={isSaving} statusChange={statusChange} />
      <FormProvider {...methods}>
        <form onSubmit={onSubmit} noValidate className="space-y-6">
          {status === ClientFormStatus.Loading ? (
            <ClientFormSkeleton />
          ) : (
            <>
              <ClientPersonSection />
              <ClientGuardiansSection />
              <ClientReferenceContactsSection />
            </>
          )}
          <FormErrorBanner />
          <PageFormFooter isSaving={isSaving} canSubmit={canSubmit} onCancel={onCancel} />
        </form>
      </FormProvider>
      {statusChange?.isConfirming && <ClientStatusDialog statusChange={statusChange} />}
    </div>
  );
}
