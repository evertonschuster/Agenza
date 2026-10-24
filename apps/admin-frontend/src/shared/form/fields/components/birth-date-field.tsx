import { useFormContext, useWatch, type FieldValues } from 'react-hook-form';
import { formatAge } from '@/shared/format/age';
import { ageFromBirthDate, birthDatePickerBounds } from '@/shared/values/birthDate';
import type { BirthDateFieldProps } from '../fields.types';
import { DateField } from './date-field';

export function BirthDateField<T extends FieldValues>({
  name,
  label = 'Data de nascimento',
  hint,
  ...props
}: BirthDateFieldProps<T>) {
  const { control } = useFormContext<T>();
  const birthDate: unknown = useWatch({ control, name });
  const age = ageFromBirthDate(birthDate instanceof Date ? birthDate : null);
  const { min, max } = birthDatePickerBounds();

  return (
    <DateField<T>
      name={name}
      label={label}
      hint={hint ?? (age === null ? 'opcional' : formatAge(age))}
      minDate={min}
      maxDate={max}
      autoComplete="off"
      {...props}
    />
  );
}
