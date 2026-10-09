import { Link } from 'react-router';
import { todayLocal } from '@/shared/format/date';
import { DateField, MaskedField, TextField, TextareaField } from '@/shared/form/fields';
import { buttonVariants } from '@/shared/ui/button';
import { earliestBirthDate, formatAge, latestBirthDate } from '../../../../model/birthDate';
import {
  CLIENT_NAME_MAX_LENGTH,
  CLIENT_NOTES_MAX_LENGTH,
  type ClientFormFieldValues,
} from '../../../../model/clientForm';
import { EMAIL_MAX_LENGTH, PHONE_MAX_LENGTH } from '../../../../model/contactFormats';
import { formatCpf } from '../../../../model/cpf';
import { ClientFormSection } from './ClientFormSection';

interface ClientPersonSectionProps {
  age: number | null;
  existingClientId: string | null;
}

function ClientPersonSection({ age, existingClientId }: ClientPersonSectionProps) {
  const today = todayLocal();

  return (
    <ClientFormSection title="Dados da pessoa" hideTitle>
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

        <DateField<ClientFormFieldValues>
          name="birthDate"
          label="Data de nascimento"
          hint={age === null ? 'opcional' : formatAge(age)}
          minDate={earliestBirthDate(today)}
          maxDate={latestBirthDate(today)}
          autoComplete="off"
        />

        <TextField<ClientFormFieldValues>
          name="phone"
          label="Telefone"
          hint="opcional"
          type="tel"
          maxLength={PHONE_MAX_LENGTH}
          placeholder="(11) 91234-5678"
          autoComplete="off"
        />

        <TextField<ClientFormFieldValues>
          name="email"
          label="E-mail"
          hint="opcional"
          type="email"
          maxLength={EMAIL_MAX_LENGTH}
          placeholder="nome@exemplo.com"
          autoComplete="off"
        />

        <div className="space-y-1.5">
          <MaskedField<ClientFormFieldValues>
            name="cpf"
            label="CPF"
            hint="opcional"
            mask={formatCpf}
            inputMode="numeric"
            placeholder="000.000.000-00"
            autoComplete="off"
          />
          {existingClientId && (
            <Link
              to={`/pessoas/${existingClientId}`}
              target="_blank"
              rel="noreferrer"
              className={buttonVariants({ variant: 'link', size: 'sm' })}
            >
              Abrir cadastro existente
              <span className="sr-only"> (abre em outra aba)</span>
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
    </ClientFormSection>
  );
}

export { ClientPersonSection };
