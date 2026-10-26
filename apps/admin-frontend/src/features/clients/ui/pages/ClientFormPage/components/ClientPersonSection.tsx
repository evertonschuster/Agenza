import { Link } from 'react-router';
import { ExternalLinkIcon } from 'lucide-react';
import { useFormContext, useFormState } from 'react-hook-form';
import type { ApiFormFieldError } from '@/shared/form/applyApiProblem';
import {
  BirthDateField,
  CpfField,
  EmailField,
  PhoneField,
  TextField,
  TextareaField,
} from '@/shared/form/fields';
import { PageSection } from '@/widgets/page-section';
import { CLIENT_FULL_NAME_MAX_LENGTH, CLIENT_NOTES_MAX_LENGTH } from '../../../../model/client';
import type { ClientFormFieldValues } from '../clientForm';
import { editClientPath } from '../../../clientsPaths';

function ClientPersonSection() {
  const { control } = useFormContext<ClientFormFieldValues>();
  const { errors } = useFormState({ control, name: 'cpf', exact: true });
  const error = errors.cpf as ApiFormFieldError | undefined;
  const existingClientId = error?.type === 'Client.DuplicateCpf' ? error.meta?.clientId : undefined;

  return (
    <PageSection title="Dados da pessoa" hideTitle>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="md:col-span-2">
          <TextField<ClientFormFieldValues>
            name="fullName"
            label="Nome completo"
            hint="obrigatório"
            maxLength={CLIENT_FULL_NAME_MAX_LENGTH}
            autoComplete="off"
            autoFocus
          />
        </div>

        <BirthDateField<ClientFormFieldValues> name="birthDate" />
        <PhoneField<ClientFormFieldValues> name="phone" />
        <EmailField<ClientFormFieldValues> name="email" />
        <div className="space-y-1.5">
          <CpfField<ClientFormFieldValues> name="cpf" />
          {existingClientId && (
            <Link
              to={editClientPath(encodeURIComponent(existingClientId))}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 rounded-sm text-sm font-medium text-primary underline-offset-4 outline-none hover:underline focus-visible:ring-[3px] focus-visible:ring-ring/50"
            >
              Abrir cadastro existente (nova aba)
              <ExternalLinkIcon className="size-3.5" aria-hidden="true" />
            </Link>
          )}
        </div>

        <div className="space-y-1.5 md:col-span-2">
          <TextareaField<ClientFormFieldValues>
            name="administrativeNotes"
            label="Observações administrativas"
            hint={`opcional · até ${CLIENT_NOTES_MAX_LENGTH} caracteres`}
            maxLength={CLIENT_NOTES_MAX_LENGTH}
            placeholder="Ex.: prefere contato por WhatsApp pela manhã."
          />
          <p className="text-xs text-muted-foreground">
            Use só para informações administrativas. Não registre prontuário, diagnóstico ou outros
            dados clínicos.
          </p>
        </div>
      </div>
    </PageSection>
  );
}

export { ClientPersonSection };
