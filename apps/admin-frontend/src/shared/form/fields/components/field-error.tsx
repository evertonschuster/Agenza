import { useFormContext, useFormState, type FieldValues, type Path } from 'react-hook-form';

export interface FieldErrorProps<T extends FieldValues> {
  name: Path<T>;
}

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
