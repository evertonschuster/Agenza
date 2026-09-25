import type { FieldValues } from 'react-hook-form';
import { ColorSwatchPicker } from '@/shared/ui/color-swatch-picker';
import type { ColorFieldProps } from '../form-field.types';
import { ControlledField } from './controlled-field';

export function ColorField<T extends FieldValues>({
  name,
  label,
  options,
  hint,
  'aria-label': ariaLabel = label,
}: ColorFieldProps<T>) {
  return (
    <ControlledField name={name} label={label} hint={hint} labelHtmlFor={false}>
      {(field, controlProps) => (
        <ColorSwatchPicker
          ref={field.ref}
          options={options}
          value={field.value}
          onValueChange={field.onChange}
          onBlur={field.onBlur}
          aria-label={ariaLabel}
          aria-invalid={controlProps['aria-invalid']}
          aria-describedby={controlProps['aria-describedby']}
        />
      )}
    </ControlledField>
  );
}
