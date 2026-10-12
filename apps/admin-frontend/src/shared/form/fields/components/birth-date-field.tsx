import { useFormContext, useWatch, type FieldValues } from 'react-hook-form';
import { formatAge } from '@/shared/format/age';
import { birthDatePickerBounds } from '@/shared/format/birthDate';
import { ageFromBirthDate } from '@/shared/form/schemas';
import type { BirthDateFieldProps } from '../fields.types';
import { DateField } from './date-field';

export function BirthDateField<T extends FieldValues>({
  name,
  label = 'Data de nascimento',
  hint,
  ...props
}: BirthDateFieldProps<T>) {
  const { control } = useFormContext<T>();
  const typed: unknown = useWatch({ control, name });
  const age = ageFromBirthDate(typeof typed === 'string' ? typed : '');
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
