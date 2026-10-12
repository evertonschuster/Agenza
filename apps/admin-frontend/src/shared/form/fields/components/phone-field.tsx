import type { FieldValues } from 'react-hook-form';
import { PHONE_MAX_LENGTH } from '@/shared/format/phone';
import type { PhoneFieldProps } from '../fields.types';
import { TextField } from './text-fields';

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
