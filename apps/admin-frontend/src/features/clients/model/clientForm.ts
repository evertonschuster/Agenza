import { z } from 'zod';
import { todayInSaoPaulo } from '@/shared/format/date';
import {
  ADULT_AGE_IN_YEARS,
  MAX_AGE_IN_YEARS,
  calculateAge,
  isInThePast,
  isMinorOn,
  isWithinMaxAge,
  parseBirthDate,
} from './birthDate';
import { CONTACT_PURPOSES } from './client';
import { EMAIL_MAX_LENGTH, PHONE_MAX_LENGTH, isValidEmail, isValidPhone } from './contactFormats';
import { isValidCpf, stripCpfMask } from './cpf';

// Mirrors the backend limits (ServicesService.Domain.Entities.Client / ClientContact). UX pre-check
// only - the backend response stays the source of truth.
export const CLIENT_NAME_MIN_LENGTH = 2;
export const CLIENT_NAME_MAX_LENGTH = 150;
export const CLIENT_NOTES_MAX_LENGTH = 500;
export const CONTACT_RELATIONSHIP_MAX_LENGTH = 60;
export const MAX_GUARDIANS = 10;
export const MAX_REFERENCE_CONTACTS = 10;

const nameField = (subject: string) =>
  z
    .string()
    .trim()
    .min(1, `O nome ${subject} é obrigatório.`)
    .min(
      CLIENT_NAME_MIN_LENGTH,
      `O nome ${subject} deve ter pelo menos ${CLIENT_NAME_MIN_LENGTH} caracteres.`,
    )
    .max(
      CLIENT_NAME_MAX_LENGTH,
      `O nome ${subject} deve ter no máximo ${CLIENT_NAME_MAX_LENGTH} caracteres.`,
    );

const relationshipField = (subject: string) =>
  z
    .string()
    .trim()
    .min(1, `O vínculo ${subject} é obrigatório.`)
    .max(
      CONTACT_RELATIONSHIP_MAX_LENGTH,
      `O vínculo ${subject} deve ter no máximo ${CONTACT_RELATIONSHIP_MAX_LENGTH} caracteres.`,
    );

const phoneField = z
  .string()
  .trim()
  .refine(
    (value) => value === '' || isValidPhone(value),
    `Informe um telefone válido, com até ${PHONE_MAX_LENGTH} caracteres entre dígitos, espaços, +, parênteses e hífen.`,
  )
  .transform((value) => value || null);

const cpfField = z
  .string()
  .trim()
  .refine((value) => value === '' || isValidCpf(value), 'Informe um CPF válido.')
  .transform((value) => (value ? stripCpfMask(value) : null));

const emailField = z
  .string()
  .trim()
  .toLowerCase()
  .max(EMAIL_MAX_LENGTH, `O e-mail deve ter no máximo ${EMAIL_MAX_LENGTH} caracteres.`)
  .refine((value) => value === '' || isValidEmail(value), 'Informe um e-mail válido.')
  .transform((value) => value || null);

const birthDateField = z.string().transform((value, ctx) => {
  if (value.trim() === '') return null;

  const fail = (message: string) => {
    ctx.addIssue({ code: 'custom', message });
    return z.NEVER;
  };

  const birthDate = parseBirthDate(value);
  if (birthDate === null) return fail('Informe uma data válida no formato dd/mm/aaaa.');

  const today = todayInSaoPaulo();
  if (!isInThePast(birthDate, today)) return fail('A data de nascimento deve estar no passado.');
  if (!isWithinMaxAge(birthDate, today)) {
    return fail(`A data de nascimento não pode indicar idade superior a ${MAX_AGE_IN_YEARS} anos.`);
  }

  return birthDate;
});

const guardianSchema = z.object({
  name: nameField('do responsável'),
  relationship: relationshipField('do responsável'),
  phone: phoneField,
  cpf: cpfField,
});

const referenceContactSchema = z.object({
  name: nameField('da pessoa de referência'),
  relationship: relationshipField('da pessoa de referência'),
  phone: phoneField,
  purposes: z
    .array(z.enum(CONTACT_PURPOSES))
    .min(1, 'Informe ao menos uma finalidade para a pessoa de referência.'),
});

const clientFormObject = z.object({
  fullName: nameField('completo'),
  birthDate: birthDateField,
  phone: phoneField,
  email: emailField,
  cpf: cpfField,
  administrativeNotes: z
    .string()
    .trim()
    .max(
      CLIENT_NOTES_MAX_LENGTH,
      `As observações administrativas devem ter no máximo ${CLIENT_NOTES_MAX_LENGTH} caracteres.`,
    )
    .transform((value) => value || null),
  guardians: z
    .array(guardianSchema)
    .max(MAX_GUARDIANS, `Informe no máximo ${MAX_GUARDIANS} responsáveis.`),
  referenceContacts: z
    .array(referenceContactSchema)
    .max(
      MAX_REFERENCE_CONTACTS,
      `Informe no máximo ${MAX_REFERENCE_CONTACTS} pessoas de referência.`,
    ),
});

export const clientFormSchema = clientFormObject.refine(
  (value) =>
    !value.birthDate ||
    !isMinorOn(value.birthDate, todayInSaoPaulo()) ||
    value.guardians.length > 0,
  {
    path: ['guardians'],
    message: `Informe ao menos um responsável para pessoas menores de ${ADULT_AGE_IN_YEARS} anos.`,
    // Zod skips object refinements once any field fails; the person would only learn about the
    // missing guardian on a second submit. Only an invalid birth date makes the rule meaningless.
    when: (payload) => payload.issues.every((issue) => issue.path?.[0] !== 'birthDate'),
  },
);

export type ClientFormFieldValues = z.input<typeof clientFormSchema>;
export type ClientFormValues = z.output<typeof clientFormSchema>;
export type GuardianFormFieldValues = ClientFormFieldValues['guardians'][number];
export type ReferenceContactFormFieldValues = ClientFormFieldValues['referenceContacts'][number];

export const CLIENT_FORM_FIELDS = clientFormObject.keyof().options;
export const GUARDIAN_FORM_FIELDS = guardianSchema.keyof().options;
export const REFERENCE_CONTACT_FORM_FIELDS = referenceContactSchema.keyof().options;

export function toClientFormFieldValues(): ClientFormFieldValues {
  return {
    fullName: '',
    birthDate: '',
    phone: '',
    email: '',
    cpf: '',
    administrativeNotes: '',
    guardians: [],
    referenceContacts: [],
  };
}

export function emptyGuardian(): GuardianFormFieldValues {
  return { name: '', relationship: '', phone: '', cpf: '' };
}

export function emptyReferenceContact(): ReferenceContactFormFieldValues {
  return { name: '', relationship: '', phone: '', purposes: [] };
}

export function ageFromBirthDate(masked: string): number | null {
  const birthDate = parseBirthDate(masked);
  const today = todayInSaoPaulo();
  if (birthDate === null || !isInThePast(birthDate, today) || !isWithinMaxAge(birthDate, today)) {
    return null;
  }

  return calculateAge(birthDate, today);
}
