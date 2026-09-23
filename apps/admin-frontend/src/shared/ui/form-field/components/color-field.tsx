import type { FieldValues } from 'react-hook-form';
import { ColorSwatchPicker } from '@/shared/ui/color-swatch-picker';
import type { ColorFieldProps } from '../form-field.types';
import { ControlledField } from './controlled-field';

export function ColorField<T extends FieldValues>({
  name,
  label,
  options,
  hint,
  ...rest
}: ColorFieldProps<T>) {
  return (
    <ControlledField name={name} label={label} hint={hint} labelHtmlFor={false}>
      {(field, controlProps) => (
        <ColorSwatchPicker
          options={options}
          value={field.value}
          onValueChange={field.onChange}
          aria-label={rest['aria-label'] ?? label}
          aria-describedby={controlProps['aria-describedby']}
        />
      )}
    </ControlledField>
  );
}
