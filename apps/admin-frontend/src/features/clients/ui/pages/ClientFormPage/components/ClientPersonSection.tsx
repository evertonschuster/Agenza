import {
  BirthDateField,
  CpfField,
  EmailField,
  PhoneField,
  TextField,
  TextareaField,
} from '@/shared/form/fields';
import { PageSection } from '@/widgets/page-section';
import {
  CLIENT_NAME_MAX_LENGTH,
  CLIENT_NOTES_MAX_LENGTH,
  type ClientFormFieldValues,
} from '../../../../model/clientForm';

function ClientPersonSection() {
  return (
    <PageSection title="Dados da pessoa" hideTitle>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="md:col-span-2">
          <TextField<ClientFormFieldValues>
            name="fullName"
            label="Nome completo"
            hint="obrigatório"
            maxLength={CLIENT_NAME_MAX_LENGTH}
            autoComplete="off"
            autoFocus
          />
        </div>

        <BirthDateField<ClientFormFieldValues> name="birthDate" />
        <PhoneField<ClientFormFieldValues> name="phone" />
        <EmailField<ClientFormFieldValues> name="email" />
        <CpfField<ClientFormFieldValues> name="cpf" />

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
