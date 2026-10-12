import { useId } from 'react';
import { XIcon } from 'lucide-react';
import { ControlledField, PhoneField, TextField } from '@/shared/form/fields';
import { Button } from '@/shared/ui/button';
import { CheckboxGroup } from '@/shared/ui/checkbox-group';
import { CONTACT_PURPOSE_OPTIONS } from '../../../../model/contactPurpose';
import {
  CLIENT_NAME_MAX_LENGTH,
  CONTACT_RELATIONSHIP_MAX_LENGTH,
  type ClientFormFieldValues,
} from '../clientForm';

interface ClientReferenceContactItemProps {
  index: number;
  onRemove: () => void;
}

function ClientReferenceContactItem({ index, onRemove }: ClientReferenceContactItemProps) {
  const headingId = useId();
  const position = index + 1;

  return (
    <div role="group" aria-labelledby={headingId} className="space-y-3 py-4 last:pb-0">
      <div className="flex items-center justify-between gap-2">
        <h3 id={headingId} className="text-sm font-medium">
          Pessoa de referência {position}
        </h3>
        <Button
          type="button"
          variant="destructive"
          size="sm"
          onClick={onRemove}
          aria-label={`Remover pessoa de referência ${position}`}
        >
          <XIcon aria-hidden="true" />
          Remover
        </Button>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <TextField<ClientFormFieldValues>
          name={`referenceContacts.${index}.name`}
          label="Nome"
          hint="obrigatório"
          maxLength={CLIENT_NAME_MAX_LENGTH}
          autoComplete="off"
        />
        <TextField<ClientFormFieldValues>
          name={`referenceContacts.${index}.relationship`}
          label="Vínculo"
          hint="obrigatório"
          maxLength={CONTACT_RELATIONSHIP_MAX_LENGTH}
          placeholder="Ex.: tio, vizinha, amigo"
          autoComplete="off"
        />
        <PhoneField<ClientFormFieldValues> name={`referenceContacts.${index}.phone`} />
        <ControlledField<ClientFormFieldValues>
          name={`referenceContacts.${index}.purposes`}
          label="Finalidades"
          hint="escolha ao menos uma"
          labelHtmlFor={false}
        >
          {(field, controlProps) => (
            <CheckboxGroup
              ref={field.ref}
              options={CONTACT_PURPOSE_OPTIONS}
              value={Array.isArray(field.value) ? (field.value as string[]) : []}
              onValueChange={field.onChange}
              onBlur={field.onBlur}
              aria-label={`Finalidades da pessoa de referência ${position}`}
              aria-invalid={controlProps['aria-invalid']}
              aria-describedby={controlProps['aria-describedby']}
            />
          )}
        </ControlledField>
      </div>
    </div>
  );
}

export { ClientReferenceContactItem };
