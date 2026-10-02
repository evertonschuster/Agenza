import type { RefObject } from 'react';
import { PlusIcon } from 'lucide-react';
import { useFormContext } from 'react-hook-form';
import { Button } from '@/shared/ui/button';
import { ADULT_AGE_IN_YEARS } from '../../../../model/birthDate';
import { MAX_GUARDIANS, type ClientFormFieldValues } from '../../../../model/clientForm';
import { ClientFormSection } from './ClientFormSection';
import { ClientGuardianItem } from './ClientGuardianItem';

interface ClientGuardiansSectionProps {
  fieldIds: string[];
  isMinor: boolean;
  addButtonRef: RefObject<HTMLButtonElement | null>;
  onAdd: () => void;
  onRemove: (index: number) => void;
}

function ClientGuardiansSection({
  fieldIds,
  isMinor,
  addButtonRef,
  onAdd,
  onRemove,
}: ClientGuardiansSectionProps) {
  const {
    formState: { errors },
  } = useFormContext<ClientFormFieldValues>();
  const listError = errors.guardians?.root?.message ?? errors.guardians?.message;

  return (
    <ClientFormSection
      title="Responsáveis"
      description={`Quem responde pela pessoa. É obrigatório ter ao menos um quando a data de nascimento indicar menos de ${ADULT_AGE_IN_YEARS} anos.`}
      action={
        <Button
          ref={addButtonRef}
          type="button"
          variant="outline"
          size="sm"
          disabled={fieldIds.length >= MAX_GUARDIANS}
          onClick={onAdd}
        >
          <PlusIcon aria-hidden="true" />
          Adicionar responsável
        </Button>
      }
    >
      {isMinor && fieldIds.length === 0 && (
        <p role="status" className="rounded-md border border-border bg-muted p-3 text-sm">
          Esta pessoa tem menos de {ADULT_AGE_IN_YEARS} anos. Informe ao menos um responsável.
        </p>
      )}

      {fieldIds.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nenhum responsável adicionado ainda.</p>
      ) : (
        <div className="space-y-3">
          {fieldIds.map((id, index) => (
            <ClientGuardianItem key={id} index={index} onRemove={() => onRemove(index)} />
          ))}
        </div>
      )}

      {listError && (
        <p role="alert" className="text-sm text-destructive">
          {listError}
        </p>
      )}
    </ClientFormSection>
  );
}

export { ClientGuardiansSection };
