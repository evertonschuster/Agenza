import { Controller, useFormContext, type FieldValues, type Path } from 'react-hook-form';
import { FormField } from '@/shared/ui/form-field';
import type { ControlledFieldProps } from '../fields.types';

export function ControlledField<T extends FieldValues, N extends Path<T> = Path<T>>({
  name,
  label,
  hint,
  labelHtmlFor,
  children,
}: ControlledFieldProps<T, N>) {
  const { control } = useFormContext<T>();

  return (
    <Controller<T, N>
      name={name}
      control={control}
      render={({ field, fieldState }) => (
        <FormField
          label={label}
          hint={hint}
          error={fieldState.error?.message}
          labelHtmlFor={labelHtmlFor}
        >
          {(controlProps) => children(field, controlProps)}
        </FormField>
      )}
    />
  );
}
