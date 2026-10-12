import { PlusIcon } from 'lucide-react';
import { useFieldArray, useFormContext } from 'react-hook-form';
import { FieldError } from '@/shared/form/fields';
import { Button } from '@/shared/ui/button';
import { PageSection } from '@/widgets/page-section';
import {
  MAX_REFERENCE_CONTACTS,
  emptyReferenceContact,
  type ClientFormFieldValues,
} from '../../../../model/clientForm';
import { ClientReferenceContactItem } from './ClientReferenceContactItem';

function ClientReferenceContactsSection() {
  const { control } = useFormContext<ClientFormFieldValues>();
  const { fields, append, remove } = useFieldArray({ control, name: 'referenceContacts' });

  const hasReferenceContacts = fields.length > 0;
  const hasReachedReferenceContactLimit = fields.length >= MAX_REFERENCE_CONTACTS;

  return (
    <PageSection
      title="Pessoas de referência"
      description="Familiares, amigos ou pessoas de apoio. Registrar não dá acesso aos dados nem envia mensagens."
      action={
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={hasReachedReferenceContactLimit}
          onClick={() => append(emptyReferenceContact())}
        >
          <PlusIcon aria-hidden="true" />
          Adicionar pessoa de referência
        </Button>
      }
    >
      {hasReferenceContacts && (
        <div className="divide-y divide-border border-t border-border">
          {fields.map((field, index) => (
            <ClientReferenceContactItem
              key={field.id}
              index={index}
              onRemove={() => remove(index)}
            />
          ))}
        </div>
      )}

      <FieldError<ClientFormFieldValues> name="referenceContacts" />
    </PageSection>
  );
}

export { ClientReferenceContactsSection };
