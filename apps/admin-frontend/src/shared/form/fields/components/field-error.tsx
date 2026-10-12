import { useFormContext, useFormState, type FieldValues } from 'react-hook-form';
import type { FieldErrorProps } from '../fields.types';

export function FieldError<T extends FieldValues>({ name }: FieldErrorProps<T>) {
  const { control, getFieldState } = useFormContext<T>();
  const formState = useFormState({ control, name });
  const { error } = getFieldState(name, formState);
  const message = error?.root?.message ?? error?.message;
  if (!message) return null;

  return (
    <p role="alert" className="text-sm text-destructive">
      {message}
    </p>
  );
}
