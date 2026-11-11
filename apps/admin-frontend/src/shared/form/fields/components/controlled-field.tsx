import type { ReactNode } from 'react';
import {
  Controller,
  useFormContext,
  type ControllerRenderProps,
  type FieldValues,
  type Path,
} from 'react-hook-form';
import { FormField, type FormFieldControlProps } from '@/shared/ui/form-field';

export interface ControlledFieldProps<T extends FieldValues, N extends Path<T> = Path<T>> {
  name: N;
  label: string;
  hint?: string | undefined;
  labelHtmlFor?: boolean | undefined;
  children: (field: ControllerRenderProps<T, N>, controlProps: FormFieldControlProps) => ReactNode;
}

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
