import type { FieldValues } from 'react-hook-form';
import { cpfDigits, maskCpf } from '@/shared/values/cpf';
import type { CpfFieldProps } from '../fields.types';
import { MaskedField } from './masked-field';

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
      unmask={cpfDigits}
      inputMode="numeric"
      placeholder="000.000.000-00"
      autoComplete="off"
      {...props}
    />
  );
}
