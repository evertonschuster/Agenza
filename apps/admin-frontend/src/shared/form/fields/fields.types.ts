import type { ReactNode } from 'react';
import type { ControllerRenderProps, FieldValues, Path } from 'react-hook-form';
import type { FormFieldControlProps } from '@/shared/ui/form-field';

export interface BaseFieldProps<T extends FieldValues> {
  name: Path<T>;
  label: string;
  hint?: string | undefined;
}

export interface FieldErrorProps<T extends FieldValues> {
  name: Path<T>;
}

export type RegisterOwnedProps = 'name' | 'onChange' | 'onBlur' | 'ref';
export type FormFieldOwnedProps = 'id' | 'aria-invalid' | 'aria-describedby';

export type WithOptionalLabel<P> = Omit<P, 'label'> & { label?: string | undefined };

export interface ControlledFieldProps<T extends FieldValues, N extends Path<T> = Path<T>> {
  name: N;
  label: string;
  hint?: string | undefined;
  labelHtmlFor?: boolean | undefined;
  children: (field: ControllerRenderProps<T, N>, controlProps: FormFieldControlProps) => ReactNode;
}

export type FieldLabelPlacement =
  | { labelPlacement?: 'top' | undefined; hint?: string | undefined }
  | { labelPlacement: 'inline'; hint?: never };
