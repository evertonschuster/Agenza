import { useFormContext, useWatch, type FieldValues } from 'react-hook-form';
import { formatAge } from '@/shared/format/age';
import { ageFromBirthDate, birthDatePickerBounds } from '@/shared/values/birthDate';
import type { WithOptionalLabel } from '../fields.types';
import { DateField, type DateFieldProps } from './date-field';

export type BirthDateFieldProps<T extends FieldValues> = WithOptionalLabel<
  Omit<DateFieldProps<T>, 'minDate' | 'maxDate'>
>;

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
