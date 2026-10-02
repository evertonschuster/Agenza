import { useId } from 'react';
import { XIcon } from 'lucide-react';
import { ControlledField, TextField } from '@/shared/form/fields';
import { Button } from '@/shared/ui/button';
import { CheckboxGroup } from '@/shared/ui/checkbox-group';
import { CONTACT_PURPOSE_OPTIONS } from '../../../../model/client';
import {
  CLIENT_NAME_MAX_LENGTH,
  CONTACT_RELATIONSHIP_MAX_LENGTH,
  type ClientFormFieldValues,
} from '../../../../model/clientForm';
import { PHONE_MAX_LENGTH } from '../../../../model/contactFormats';

interface ClientReferenceContactItemProps {
  index: number;
  onRemove: () => void;
}

function ClientReferenceContactItem({ index, onRemove }: ClientReferenceContactItemProps) {
  const headingId = useId();
  const position = index + 1;

  return (
    <div
      role="group"
      aria-labelledby={headingId}
      className="space-y-3 rounded-lg border border-border p-3"
    >
      <div className="flex items-center justify-between gap-2">
        <h3 id={headingId} className="text-sm font-medium">
          Pessoa de referência {position}
        </h3>
        <Button
          type="button"
          variant="ghost"
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
        <TextField<ClientFormFieldValues>
          name={`referenceContacts.${index}.phone`}
          label="Telefone"
          hint="opcional"
          type="tel"
          maxLength={PHONE_MAX_LENGTH}
          autoComplete="off"
        />
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
