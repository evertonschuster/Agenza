import type { FieldValues } from 'react-hook-form';
import { EMAIL_MAX_LENGTH } from '@/shared/values/email';
import type { EmailFieldProps } from '../fields.types';
import { TextField } from './text-fields';

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
