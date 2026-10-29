import { useFormContext, useFormState } from 'react-hook-form';
import type { ApiFormFieldError } from '@/shared/form/applyApiProblem';
import { tagsRepository } from '@/features/tags';
import { NewTabLink } from '@/shared/ui/new-tab-link';
import {
  BirthDateField,
  CpfField,
  EmailField,
  PhoneField,
  RemoteSearchSelectField,
  TextField,
  TextareaField,
} from '@/shared/form/fields';
import { PageSection } from '@/widgets/page-section';
import {
  CLIENT_FULL_NAME_MAX_LENGTH,
  CLIENT_MAX_TAGS,
  CLIENT_NOTES_MAX_LENGTH,
} from '../../../../model/client';
import type { ClientTag } from '../../../../model/clientTag';
import type { ClientFormFieldValues } from '../clientForm';
import { editClientPath } from '../../../clientsPaths';

function ClientPersonSection() {
  const { control } = useFormContext<ClientFormFieldValues>();
  const { errors } = useFormState({ control, name: ['cpf', 'email'], exact: true });
  const cpfError = errors.cpf as ApiFormFieldError | undefined;
  const emailError = errors.email as ApiFormFieldError | undefined;
  const existingCpfClientId =
    cpfError?.type === 'Client.DuplicateCpf' ? cpfError.meta?.clientId : undefined;
  const existingEmailClientId =
    emailError?.type === 'Client.DuplicateEmail' ? emailError.meta?.clientId : undefined;

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
        <div className="space-y-1.5">
          <EmailField<ClientFormFieldValues> name="email" />
          {existingEmailClientId && (
            <NewTabLink to={editClientPath(encodeURIComponent(existingEmailClientId))}>
              Abrir cadastro existente
            </NewTabLink>
          )}
        </div>
        <div className="space-y-1.5">
          <CpfField<ClientFormFieldValues> name="cpf" />
          {existingCpfClientId && (
            <NewTabLink to={editClientPath(encodeURIComponent(existingCpfClientId))}>
              Abrir cadastro existente
            </NewTabLink>
          )}
        </div>

        <div className="md:col-span-2">
          <RemoteSearchSelectField<ClientFormFieldValues, ClientTag>
            name="tags"
            label="Etiquetas"
            hint={`opcional · até ${CLIENT_MAX_TAGS}`}
            loadItems={tagsRepository.list}
            multiple
            maxSelected={CLIENT_MAX_TAGS}
            placeholder="Selecione ou busque etiquetas"
            emptyMessage="Nenhuma etiqueta cadastrada."
            errorMessage="Não foi possível carregar as etiquetas."
          />
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
