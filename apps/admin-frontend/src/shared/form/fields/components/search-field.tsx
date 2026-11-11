import type { ComponentProps } from 'react';
import { SearchIcon } from 'lucide-react';
import { useFormContext, type FieldValues, type Path } from 'react-hook-form';
import { cn } from '@/shared/lib/utils';
import { FormField } from '@/shared/ui/form-field';
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/shared/ui/input-group';
import type { FieldLabelPlacement, FormFieldOwnedProps, RegisterOwnedProps } from '../fields.types';

export type SearchFieldProps<T extends FieldValues> = {
  name: Path<T>;
  label: string;
  className?: string | undefined;
} & Omit<
  ComponentProps<typeof InputGroupInput>,
  RegisterOwnedProps | FormFieldOwnedProps | 'aria-label' | 'className' | 'type'
> &
  FieldLabelPlacement;

export function SearchField<T extends FieldValues>({
  name,
  label,
  className,
  labelPlacement,
  hint,
  ...inputProps
}: SearchFieldProps<T>) {
  const { register, getFieldState, formState } = useFormContext<T>();
  const { error } = getFieldState(name, formState);
  const groupClassName = cn('pointer-coarse:h-11', className);

  if (labelPlacement === 'inline') {
    return (
      <InputGroup className={groupClassName}>
        <InputGroupAddon>
          <SearchIcon aria-hidden="true" />
        </InputGroupAddon>
        <InputGroupInput
          {...register(name)}
          {...inputProps}
          aria-label={label}
          aria-invalid={!!error}
        />
      </InputGroup>
    );
  }

  return (
    <FormField label={label} hint={hint} error={error?.message}>
      {(controlProps) => (
        <InputGroup className={groupClassName}>
          <InputGroupAddon>
            <SearchIcon aria-hidden="true" />
          </InputGroupAddon>
          <InputGroupInput {...controlProps} {...register(name)} {...inputProps} />
        </InputGroup>
      )}
    </FormField>
  );
}
