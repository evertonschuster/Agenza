import { PlusIcon } from 'lucide-react';
import { useFieldArray, useFormContext, useWatch } from 'react-hook-form';
import { FieldError } from '@/shared/form/fields';
import { Button } from '@/shared/ui/button';
import { PageSection } from '@/widgets/page-section';
import { ADULT_AGE_IN_YEARS } from '@/shared/format/birthDate';
import { isMinorBirthDate } from '@/shared/form/schemas';
import {
  MAX_GUARDIANS,
  emptyGuardian,
  type ClientFormFieldValues,
} from '../../../../model/clientForm';
import { ClientGuardianItem } from './ClientGuardianItem';

function ClientGuardiansSection() {
  const { control } = useFormContext<ClientFormFieldValues>();
  const { fields, append, remove } = useFieldArray({ control, name: 'guardians' });
  const birthDate = useWatch({ control, name: 'birthDate' });

  const hasGuardians = fields.length > 0;
  const hasReachedGuardianLimit = fields.length >= MAX_GUARDIANS;

  const needsGuardian = isMinorBirthDate(birthDate) && !hasGuardians;

  return (
    <PageSection
      title="Responsáveis"
      description={`Quem responde pela pessoa. Obrigatório para menores de ${ADULT_AGE_IN_YEARS} anos.`}
      action={
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={hasReachedGuardianLimit}
          onClick={() => append(emptyGuardian())}
        >
          <PlusIcon aria-hidden="true" />
          Adicionar responsável
        </Button>
      }
    >
      {needsGuardian && (
        <p role="status" className="rounded-md border border-border bg-muted p-3 text-sm">
          Esta pessoa tem menos de {ADULT_AGE_IN_YEARS} anos. Informe ao menos um responsável.
        </p>
      )}

      {hasGuardians && (
        <div className="divide-y divide-border border-t border-border">
          {fields.map((field, index) => (
            <ClientGuardianItem key={field.id} index={index} onRemove={() => remove(index)} />
          ))}
        </div>
      )}

      <FieldError<ClientFormFieldValues> name="guardians" />
    </PageSection>
  );
}

export { ClientGuardiansSection };
