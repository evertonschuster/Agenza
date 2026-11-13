import type { FieldValues, Path } from 'react-hook-form';

export interface BaseFieldProps<T extends FieldValues> {
  name: Path<T>;
  label: string;
  hint?: string | undefined;
}

export type RegisterOwnedProps = 'name' | 'onChange' | 'onBlur' | 'ref';
export type FormFieldOwnedProps = 'id' | 'aria-invalid' | 'aria-describedby';

export type WithOptionalLabel<P> = Omit<P, 'label'> & { label?: string | undefined };

export type FieldLabelPlacement =
  | { labelPlacement?: 'top' | undefined; hint?: string | undefined }
  | { labelPlacement: 'inline'; hint?: never };
