import { PlusIcon } from 'lucide-react';
import { useFormContext } from 'react-hook-form';
import { Button } from '@/shared/ui/button';
import { MAX_REFERENCE_CONTACTS, type ClientFormFieldValues } from '../../../../model/clientForm';
import { ClientFormSection } from './ClientFormSection';
import { ClientReferenceContactItem } from './ClientReferenceContactItem';

interface ClientReferenceContactsSectionProps {
  fieldIds: string[];
  onAdd: () => void;
  onRemove: (index: number) => void;
}

function ClientReferenceContactsSection({
  fieldIds,
  onAdd,
  onRemove,
}: ClientReferenceContactsSectionProps) {
  const {
    formState: { errors },
  } = useFormContext<ClientFormFieldValues>();
  const listError = errors.referenceContacts?.root?.message ?? errors.referenceContacts?.message;

  return (
    <ClientFormSection
      title="Pessoas de referência"
      description="Familiares, amigos ou outras pessoas de apoio. Não são cadastros de pessoas atendidas: registrar um contato não dá acesso aos dados da pessoa nem envia mensagens."
      action={
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={fieldIds.length >= MAX_REFERENCE_CONTACTS}
          onClick={onAdd}
        >
          <PlusIcon aria-hidden="true" />
          Adicionar pessoa de referência
        </Button>
      }
    >
      {fieldIds.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Nenhuma pessoa de referência adicionada ainda.
        </p>
      ) : (
        <div className="space-y-3">
          {fieldIds.map((id, index) => (
            <ClientReferenceContactItem key={id} index={index} onRemove={() => onRemove(index)} />
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

export { ClientReferenceContactsSection };
