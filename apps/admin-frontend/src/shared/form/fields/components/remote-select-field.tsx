import type { FieldValues } from 'react-hook-form';
import { RemoteSelect, type RemoteSelectItem } from '@/shared/ui/remote-select';
import type { RemoteSelectFieldProps } from '../fields.types';
import { ControlledField } from './controlled-field';

export function RemoteSelectField<T extends FieldValues, I extends RemoteSelectItem>(
  props: RemoteSelectFieldProps<T, I>,
) {
  const { name, label, hint, ...selectProps } = props;

  return (
    <ControlledField<T> name={name} label={label} hint={hint}>
      {(field, controlProps) => (
        <RemoteSelect<I>
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
