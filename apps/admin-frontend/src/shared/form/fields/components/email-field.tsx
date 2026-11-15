import type { FieldValues } from 'react-hook-form';
import { EMAIL_MAX_LENGTH } from '@/shared/values/email';
import type { WithOptionalLabel } from '../fields.types';
import { TextField, type TextFieldProps } from './text-fields';

export type EmailFieldProps<T extends FieldValues> = WithOptionalLabel<
  Omit<TextFieldProps<T>, 'type'>
>;

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
