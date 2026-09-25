import { useFormContext, type FieldValues } from 'react-hook-form';
import { Input } from '@/shared/ui/input';
import { Textarea } from '@/shared/ui/textarea';
import type { TextFieldProps, TextareaFieldProps } from '../form-field.types';
import { FormField } from './form-field';

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
