import { z } from 'zod';
import { ADULT_AGE_IN_YEARS, isMinorOn } from '@/shared/format/birthDate';
import { todayUtc } from '@/shared/format/date';
import { birthDateSchema, cpfSchema, emailSchema, phoneSchema } from '@/shared/form/schemas';
import { CONTACT_PURPOSES } from './client';

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

const guardianSchema = z.object({
  name: nameField('do responsável'),
  relationship: relationshipField('do responsável'),
  phone: phoneSchema,
  cpf: cpfSchema,
});

const referenceContactSchema = z.object({
  name: nameField('da pessoa de referência'),
  relationship: relationshipField('da pessoa de referência'),
  phone: phoneSchema,
  purposes: z
    .array(z.enum(CONTACT_PURPOSES))
    .min(1, 'Informe ao menos uma finalidade para a pessoa de referência.'),
});

const clientFormObject = z.object({
  fullName: nameField('completo'),
  birthDate: birthDateSchema,
  phone: phoneSchema,
  email: emailSchema,
  cpf: cpfSchema,
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
    !value.birthDate || !isMinorOn(value.birthDate, todayUtc()) || value.guardians.length > 0,
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
