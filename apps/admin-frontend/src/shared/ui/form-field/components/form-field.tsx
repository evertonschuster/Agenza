import { useId } from 'react';
import { Label } from '@/shared/ui/label';
import type { FormFieldControlProps, FormFieldProps } from '../form-field.types';

export function FormField({ label, hint, error, labelHtmlFor = true, children }: FormFieldProps) {
  const id = useId();
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;
  const describedBy = [hint && hintId, error && errorId].filter(Boolean).join(' ') || undefined;
  const controlProps: FormFieldControlProps = {
    id,
    'aria-invalid': !!error,
    'aria-describedby': describedBy,
  };

  return (
    <div className="space-y-1.5">
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
        <Label htmlFor={labelHtmlFor ? id : undefined}>{label}</Label>
        {hint && (
          <span id={hintId} className="ml-auto text-xs whitespace-nowrap text-muted-foreground">
            {hint}
          </span>
        )}
      </div>
      {children(controlProps)}
      {error && (
        <p id={errorId} className="text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
