import { PlusIcon } from 'lucide-react';
import { useFieldArray, useFormContext, useFormState, useWatch } from 'react-hook-form';
import { Button } from '@/shared/ui/button';
import { PageSection } from '@/widgets/page-section';
import { ADULT_AGE_IN_YEARS } from '../../../../model/birthDate';
import {
  MAX_GUARDIANS,
  ageFromBirthDate,
  emptyGuardian,
  type ClientFormFieldValues,
} from '../../../../model/clientForm';
import { ClientGuardianItem } from './ClientGuardianItem';

function ClientGuardiansSection() {
  const { control } = useFormContext<ClientFormFieldValues>();
  const { fields, append, remove } = useFieldArray({ control, name: 'guardians' });
  const { errors } = useFormState({ control, name: 'guardians' });
  const birthDate = useWatch({ control, name: 'birthDate' });
  const age = ageFromBirthDate(birthDate);
  const isMinor = age !== null && age < ADULT_AGE_IN_YEARS;
  const listError = errors.guardians?.root?.message ?? errors.guardians?.message;

  return (
    <PageSection
      title="Responsáveis"
      description={`Quem responde pela pessoa. Obrigatório para menores de ${ADULT_AGE_IN_YEARS} anos.`}
      action={
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={fields.length >= MAX_GUARDIANS}
          onClick={() => append(emptyGuardian())}
        >
          <PlusIcon aria-hidden="true" />
          Adicionar responsável
        </Button>
      }
    >
      {isMinor && fields.length === 0 && (
        <p role="status" className="rounded-md border border-border bg-muted p-3 text-sm">
          Esta pessoa tem menos de {ADULT_AGE_IN_YEARS} anos. Informe ao menos um responsável.
        </p>
      )}

      {fields.length > 0 && (
        <div className="divide-y divide-border border-t border-border">
          {fields.map((field, index) => (
            <ClientGuardianItem key={field.id} index={index} onRemove={() => remove(index)} />
          ))}
        </div>
      )}

      {listError && (
        <p role="alert" className="text-sm text-destructive">
          {listError}
        </p>
      )}
    </PageSection>
  );
}

export { ClientGuardiansSection };
