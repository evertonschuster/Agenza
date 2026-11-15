import type { ComponentProps } from 'react';
import { useFormContext, type FieldValues } from 'react-hook-form';
import { FormField } from '@/shared/ui/form-field';
import { Input } from '@/shared/ui/input';
import { Textarea } from '@/shared/ui/textarea';
import type { BaseFieldProps, FormFieldOwnedProps, RegisterOwnedProps } from '../fields.types';

export type TextFieldProps<T extends FieldValues> = BaseFieldProps<T> &
  Omit<ComponentProps<typeof Input>, RegisterOwnedProps | FormFieldOwnedProps>;

export type TextareaFieldProps<T extends FieldValues> = BaseFieldProps<T> &
  Omit<ComponentProps<typeof Textarea>, RegisterOwnedProps | FormFieldOwnedProps>;

export function TextField<T extends FieldValues>({
  name,
  label,
  hint,
  ...inputProps
}: TextFieldProps<T>) {
  const { register, getFieldState, formState } = useFormContext<T>();
  const { error } = getFieldState(name, formState);

  return (
    <FormField label={label} hint={hint} error={error?.message}>
      {(controlProps) => <Input {...controlProps} {...register(name)} {...inputProps} />}
    </FormField>
  );
}

export function TextareaField<T extends FieldValues>({
  name,
  label,
  hint,
  ...textareaProps
}: TextareaFieldProps<T>) {
  const { register, getFieldState, formState } = useFormContext<T>();
  const { error } = getFieldState(name, formState);

  return (
    <FormField label={label} hint={hint} error={error?.message}>
      {(controlProps) => <Textarea {...controlProps} {...register(name)} {...textareaProps} />}
    </FormField>
  );
}
