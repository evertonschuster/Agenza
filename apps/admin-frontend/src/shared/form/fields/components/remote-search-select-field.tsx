import type { FieldValues } from 'react-hook-form';
import { RemoteSearchSelect } from '@/shared/ui/remote-search-select';
import type { SearchSelectItem } from '@/shared/ui/search-select';
import type { RemoteSearchSelectFieldProps } from '../fields.types';
import { ControlledField } from './controlled-field';

export function RemoteSearchSelectField<T extends FieldValues, I extends SearchSelectItem>(
  props: RemoteSearchSelectFieldProps<T, I>,
) {
  const { name, label, hint, ...selectProps } = props;

  return (
    <ControlledField<T> name={name} label={label} hint={hint}>
      {(field, controlProps) => (
        <RemoteSearchSelect<I>
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
