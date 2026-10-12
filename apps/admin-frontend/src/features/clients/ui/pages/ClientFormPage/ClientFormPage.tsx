import { FormProvider } from 'react-hook-form';
import { FormErrorBanner } from '@/shared/form/fields';
import { PageFormFooter } from '@/widgets/form-footer';
import { PageHeader } from '@/widgets/page-header';
import { CLIENTS_PATH } from '../../clientsPaths';
import { ClientGuardiansSection } from './components/ClientGuardiansSection';
import { ClientPersonSection } from './components/ClientPersonSection';
import { ClientReferenceContactsSection } from './components/ClientReferenceContactsSection';
import { useClientFormPage } from './useClientFormPage';

const PAGE_PARENTS = [{ label: 'Pessoas', to: CLIENTS_PATH }];

export function ClientFormPage() {
  const { methods, isSaving, onSubmit } = useClientFormPage();

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6">
      <PageHeader parents={PAGE_PARENTS} title="Nova pessoa" />
      <FormProvider {...methods}>
        <form onSubmit={onSubmit} noValidate className="space-y-6">
          <ClientPersonSection />
          <ClientGuardiansSection />
          <ClientReferenceContactsSection />
          <FormErrorBanner />
          <PageFormFooter isSaving={isSaving} cancelTo={CLIENTS_PATH} />
        </form>
      </FormProvider>
    </div>
  );
}
