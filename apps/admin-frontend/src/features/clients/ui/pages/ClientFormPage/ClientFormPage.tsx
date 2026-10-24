import { FormProvider } from 'react-hook-form';
import { FormErrorBanner } from '@/shared/form/fields';
import { PageFormFooter } from '@/widgets/form-footer';
import { PageHeader } from '@/widgets/page-header';
import { ClientGuardiansSection } from './components/ClientGuardiansSection';
import { ClientPersonSection } from './components/ClientPersonSection';
import { ClientReferenceContactsSection } from './components/ClientReferenceContactsSection';
import { useClientFormPage } from './useClientFormPage';

export function ClientFormPage() {
  const { methods, isSaving, listPath, onSubmit } = useClientFormPage();

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6">
      <PageHeader parents={[{ label: 'Pessoas', to: listPath }]} title="Nova pessoa" />
      <FormProvider {...methods}>
        <form onSubmit={onSubmit} noValidate className="space-y-6">
          <ClientPersonSection />
          <ClientGuardiansSection />
          <ClientReferenceContactsSection />
          <FormErrorBanner />
          <PageFormFooter isSaving={isSaving} cancelTo={listPath} />
        </form>
      </FormProvider>
    </div>
  );
}
