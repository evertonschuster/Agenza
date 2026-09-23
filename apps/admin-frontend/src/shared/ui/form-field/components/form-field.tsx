import { Label } from '@/shared/ui/label';
import type { FormFieldControlProps, FormFieldProps } from '../form-field.types';

export function FormField({
  name,
  label,
  hint,
  error,
  labelHtmlFor = true,
  children,
}: FormFieldProps) {
  const id = `field-${name}`;
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;
  const describedBy = error ? errorId : hint ? hintId : undefined;
  const controlProps: FormFieldControlProps = {
    id,
    'aria-invalid': !!error,
    'aria-describedby': describedBy,
  };

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <Label htmlFor={labelHtmlFor ? id : undefined}>{label}</Label>
        {hint && (
          <span id={hintId} className="text-xs text-muted-foreground">
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
