import type { FieldValues } from 'react-hook-form';
import { SearchSelect, type SearchSelectItem } from '@/shared/ui/search-select';
import type { SearchSelectFieldProps } from '../fields.types';
import { ControlledField } from './controlled-field';

export function SearchSelectField<T extends FieldValues, I extends SearchSelectItem>(
  props: SearchSelectFieldProps<T, I>,
) {
  const { name, label, hint, ...selectProps } = props;

  return (
    <ControlledField<T> name={name} label={label} hint={hint}>
      {(field, controlProps) => (
        <SearchSelect<I>
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
