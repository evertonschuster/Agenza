import { FormProvider } from 'react-hook-form';
import { FormErrorBanner } from '@/shared/form/fields';
import { ClientFormFooter } from './components/ClientFormFooter';
import { ClientFormHeader } from './components/ClientFormHeader';
import { ClientGuardiansSection } from './components/ClientGuardiansSection';
import { ClientPersonSection } from './components/ClientPersonSection';
import { ClientReferenceContactsSection } from './components/ClientReferenceContactsSection';
import { useClientFormPage } from './useClientFormPage';

export function ClientFormPage() {
  const {
    methods,
    guardians,
    referenceContacts,
    age,
    isMinor,
    existingClientId,
    isSaving,
    addGuardianButtonRef,
    onSubmit,
    addGuardian,
    addReferenceContact,
  } = useClientFormPage();

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6">
      <ClientFormHeader />
      <FormProvider {...methods}>
        <form onSubmit={onSubmit} noValidate className="space-y-6">
          <ClientPersonSection age={age} existingClientId={existingClientId} />
          <ClientGuardiansSection
            fieldIds={guardians.fields.map((field) => field.id)}
            isMinor={isMinor}
            addButtonRef={addGuardianButtonRef}
            onAdd={addGuardian}
            onRemove={guardians.remove}
          />
          <ClientReferenceContactsSection
            fieldIds={referenceContacts.fields.map((field) => field.id)}
            onAdd={addReferenceContact}
            onRemove={referenceContacts.remove}
          />
          <FormErrorBanner />
          <ClientFormFooter isSaving={isSaving} />
        </form>
      </FormProvider>
    </div>
  );
}
