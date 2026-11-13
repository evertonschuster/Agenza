import type { FieldValues } from 'react-hook-form';
import {
  SearchSelect,
  type SearchSelectItem,
  type SearchSelectProps,
} from '@/shared/ui/search-select';
import type { BaseFieldProps, FormFieldOwnedProps } from '../fields.types';
import { ControlledField } from './controlled-field';

type SearchSelectOwnedProps =
  | 'value'
  | 'onValueChange'
  | 'inputRef'
  | 'onBlur'
  | 'disabled'
  | 'aria-label'
  | FormFieldOwnedProps;

export type SearchSelectFieldProps<T extends FieldValues, I> = BaseFieldProps<T> &
  Omit<SearchSelectProps<I & SearchSelectItem>, SearchSelectOwnedProps>;

export function SearchSelectField<T extends FieldValues, I>(props: SearchSelectFieldProps<T, I>) {
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
