import { useId } from 'react';
import { XIcon } from 'lucide-react';
import { MaskedField, TextField } from '@/shared/form/fields';
import { Button } from '@/shared/ui/button';
import {
  CLIENT_NAME_MAX_LENGTH,
  CONTACT_RELATIONSHIP_MAX_LENGTH,
  type ClientFormFieldValues,
} from '../../../../model/clientForm';
import { PHONE_MAX_LENGTH } from '../../../../model/contactFormats';
import { formatCpf } from '../../../../model/cpf';

interface ClientGuardianItemProps {
  index: number;
  onRemove: () => void;
}

function ClientGuardianItem({ index, onRemove }: ClientGuardianItemProps) {
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
          Responsável {position}
        </h3>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onRemove}
          aria-label={`Remover responsável ${position}`}
        >
          <XIcon aria-hidden="true" />
          Remover
        </Button>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <TextField<ClientFormFieldValues>
          name={`guardians.${index}.name`}
          label="Nome"
          hint="obrigatório"
          maxLength={CLIENT_NAME_MAX_LENGTH}
          autoComplete="off"
        />
        <TextField<ClientFormFieldValues>
          name={`guardians.${index}.relationship`}
          label="Vínculo"
          hint="obrigatório"
          maxLength={CONTACT_RELATIONSHIP_MAX_LENGTH}
          placeholder="Ex.: mãe, pai, tutor legal"
          autoComplete="off"
        />
        <TextField<ClientFormFieldValues>
          name={`guardians.${index}.phone`}
          label="Telefone"
          hint="opcional"
          type="tel"
          maxLength={PHONE_MAX_LENGTH}
          autoComplete="off"
        />
        <MaskedField<ClientFormFieldValues>
          name={`guardians.${index}.cpf`}
          label="CPF"
          hint="opcional"
          mask={formatCpf}
          inputMode="numeric"
          placeholder="000.000.000-00"
          autoComplete="off"
        />
      </div>
    </div>
  );
}

export { ClientGuardianItem };
