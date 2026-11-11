import type { FieldValues, Path } from 'react-hook-form';
import { ColorSwatchPicker, type ColorSwatchPickerOption } from '@/shared/ui/color-swatch-picker';
import { ControlledField } from './controlled-field';

export interface ColorFieldProps<T extends FieldValues> {
  name: Path<T>;
  label: string;
  'aria-label'?: string | undefined;
  options: readonly ColorSwatchPickerOption[];
  hint?: string | undefined;
}

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
