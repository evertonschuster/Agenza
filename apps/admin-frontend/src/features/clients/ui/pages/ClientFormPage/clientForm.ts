import { z } from 'zod';
import { ADULT_AGE_IN_YEARS, birthDateSchema } from '@/shared/values/birthDate';
import { cpfSchema } from '@/shared/values/cpf';
import { emailSchema } from '@/shared/values/email';
import { phoneSchema } from '@/shared/values/phone';
import {
  CLIENT_FULL_NAME_MAX_LENGTH,
  CLIENT_FULL_NAME_MIN_LENGTH,
  CLIENT_NOTES_MAX_LENGTH,
  MAX_GUARDIANS,
  MAX_REFERENCE_CONTACTS,
  needsGuardian,
} from '../../../model/client';
import {
  CONTACT_NAME_MAX_LENGTH,
  CONTACT_NAME_MIN_LENGTH,
  CONTACT_RELATIONSHIP_MAX_LENGTH,
} from '../../../model/clientContact';
import { CONTACT_PURPOSES } from '../../../model/contactPurpose';

const nameField = (subject: string, minLength: number, maxLength: number) =>
  z
    .string()
    .trim()
    .min(1, `O nome ${subject} é obrigatório.`)
    .min(minLength, `O nome ${subject} deve ter pelo menos ${minLength} caracteres.`)
    .max(maxLength, `O nome ${subject} deve ter no máximo ${maxLength} caracteres.`);

const contactNameField = (subject: string) =>
  nameField(subject, CONTACT_NAME_MIN_LENGTH, CONTACT_NAME_MAX_LENGTH);

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
  name: contactNameField('do responsável'),
  relationship: relationshipField('do responsável'),
  phone: phoneSchema,
  cpf: cpfSchema,
});

const referenceContactSchema = z.object({
  name: contactNameField('da pessoa de referência'),
  relationship: relationshipField('da pessoa de referência'),
  phone: phoneSchema,
  purposes: z
    .array(z.enum(CONTACT_PURPOSES))
    .min(1, 'Informe ao menos uma finalidade para a pessoa de referência.'),
});

const clientFormObject = z.object({
  fullName: nameField('completo', CLIENT_FULL_NAME_MIN_LENGTH, CLIENT_FULL_NAME_MAX_LENGTH),
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
  (value) => !needsGuardian(value.birthDate, value.guardians.length),
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

export function emptyClientFormFieldValues(): ClientFormFieldValues {
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
