import { FormProvider } from 'react-hook-form';
import { FormErrorBanner } from '@/shared/form/fields';
import { FormFooter } from '@/widgets/form-footer';
import { PageHeader } from '@/widgets/page-header';
import { ClientGuardiansSection } from './components/ClientGuardiansSection';
import { ClientPersonSection } from './components/ClientPersonSection';
import { ClientReferenceContactsSection } from './components/ClientReferenceContactsSection';
import { useClientFormPage } from './useClientFormPage';

const PAGE_PARENTS = [{ label: 'Pessoas', to: '/pessoas' }];

export function ClientFormPage() {
  const { methods, age, isMinor, isSaving, addGuardianButtonRef, onSubmit } = useClientFormPage();

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6">
      <PageHeader parents={PAGE_PARENTS} title="Nova pessoa" />
      <FormProvider {...methods}>
        <form onSubmit={onSubmit} noValidate className="space-y-6">
          <ClientPersonSection age={age} />
          <ClientGuardiansSection isMinor={isMinor} addButtonRef={addGuardianButtonRef} />
          <ClientReferenceContactsSection />
          <FormErrorBanner />
          <FormFooter isSaving={isSaving} cancelTo="/pessoas" />
        </form>
      </FormProvider>
    </div>
  );
}
