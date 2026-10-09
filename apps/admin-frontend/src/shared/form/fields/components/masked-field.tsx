import type { FieldValues } from 'react-hook-form';
import { Input } from '@/shared/ui/input';
import type { MaskedFieldProps } from '../fields.types';
import { ControlledField } from './controlled-field';

export function MaskedField<T extends FieldValues>({
  name,
  label,
  hint,
  mask,
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
          value={typeof field.value === 'string' ? field.value : ''}
          onBlur={field.onBlur}
          onChange={(event) => field.onChange(mask(event.target.value))}
        />
      )}
    </ControlledField>
  );
}
