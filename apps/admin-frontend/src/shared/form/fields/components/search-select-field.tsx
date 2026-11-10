import type { FieldValues } from 'react-hook-form';
import { SearchSelect } from '@/shared/ui/search-select';
import type { SearchSelectFieldProps } from '../fields.types';
import { ControlledField } from './controlled-field';

export function SearchSelectField<T extends FieldValues>(props: SearchSelectFieldProps<T>) {
  const { name, label, hint, ...selectProps } = props;

  return (
    <ControlledField<T> name={name} label={label} hint={hint}>
      {(field, controlProps) => (
        <SearchSelect
          {...selectProps}
          {...controlProps}
          value={field.value}
          onValueChange={field.onChange}
          inputRef={field.ref}
          onBlur={field.onBlur}
          disabled={field.disabled}
        />
      )}
    </ControlledField>
  );
}
