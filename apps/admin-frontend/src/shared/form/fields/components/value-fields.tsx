import { useFormContext, useWatch, type FieldValues } from 'react-hook-form';
import { formatAge } from '@/shared/format/age';
import { birthDatePickerBounds } from '@/shared/format/birthDate';
import { maskCpf } from '@/shared/format/cpf';
import { EMAIL_MAX_LENGTH } from '@/shared/format/email';
import { PHONE_MAX_LENGTH } from '@/shared/format/phone';
import { ageFromBirthDate } from '@/shared/form/schemas';
import type {
  BirthDateFieldProps,
  CpfFieldProps,
  EmailFieldProps,
  PhoneFieldProps,
} from '../fields.types';
import { DateField } from './date-field';
import { MaskedField } from './masked-field';
import { TextField } from './text-fields';

export function CpfField<T extends FieldValues>({
  label = 'CPF',
  hint = 'opcional',
  ...props
}: CpfFieldProps<T>) {
  return (
    <MaskedField<T>
      label={label}
      hint={hint}
      mask={maskCpf}
      inputMode="numeric"
      placeholder="000.000.000-00"
      autoComplete="off"
      {...props}
    />
  );
}

export function PhoneField<T extends FieldValues>({
  label = 'Telefone',
  hint = 'opcional',
  ...props
}: PhoneFieldProps<T>) {
  return (
    <TextField<T>
      label={label}
      hint={hint}
      type="tel"
      maxLength={PHONE_MAX_LENGTH}
      placeholder="(11) 91234-5678"
      autoComplete="off"
      {...props}
    />
  );
}

export function EmailField<T extends FieldValues>({
  label = 'E-mail',
  hint = 'opcional',
  ...props
}: EmailFieldProps<T>) {
  return (
    <TextField<T>
      label={label}
      hint={hint}
      type="email"
      maxLength={EMAIL_MAX_LENGTH}
      placeholder="nome@exemplo.com"
      autoComplete="off"
      {...props}
    />
  );
}

export function BirthDateField<T extends FieldValues>({
  name,
  label = 'Data de nascimento',
  hint,
  ...props
}: BirthDateFieldProps<T>) {
  const { control } = useFormContext<T>();
  const typed: unknown = useWatch({ control, name });
  const age = ageFromBirthDate(typeof typed === 'string' ? typed : '');
  const { min, max } = birthDatePickerBounds();

  return (
    <DateField<T>
      name={name}
      label={label}
      hint={hint ?? (age === null ? 'opcional' : formatAge(age))}
      minDate={min}
      maxDate={max}
      autoComplete="off"
      {...props}
    />
  );
}
