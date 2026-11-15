import type { ComponentProps } from 'react';
import type { FieldValues } from 'react-hook-form';
import { Input } from '@/shared/ui/input';
import type { BaseFieldProps, FormFieldOwnedProps, RegisterOwnedProps } from '../fields.types';
import { ControlledField } from './controlled-field';

export type MaskedFieldProps<T extends FieldValues> = BaseFieldProps<T> &
  Omit<ComponentProps<typeof Input>, RegisterOwnedProps | FormFieldOwnedProps | 'value'> & {
    mask: (value: string) => string;
    unmask: (typed: string) => string;
  };

export function MaskedField<T extends FieldValues>({
  name,
  label,
  hint,
  mask,
  unmask,
  ...inputProps
}: MaskedFieldProps<T>) {
  return (
    <ControlledField<T> name={name} label={label} hint={hint}>
      {(field, controlProps) => (
        <Input
          {...controlProps}
          {...inputProps}
          ref={field.ref}
          name={field.name}
          value={mask(typeof field.value === 'string' ? field.value : '')}
          onBlur={field.onBlur}
          onChange={(event) => field.onChange(unmask(event.target.value))}
        />
      )}
    </ControlledField>
  );
}
