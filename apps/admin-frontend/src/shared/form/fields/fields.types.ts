import type { ComponentProps, ReactNode } from 'react';
import type { ControllerRenderProps, FieldValues, Path, PathValue } from 'react-hook-form';
import type { ColorSwatchPickerOption } from '@/shared/ui/color-swatch-picker';
import type { FormFieldControlProps } from '@/shared/ui/form-field';
import type { Input } from '@/shared/ui/input';
import type { InputGroupInput } from '@/shared/ui/input-group';
import type { Textarea } from '@/shared/ui/textarea';

interface BaseFieldProps<T extends FieldValues> {
  name: Path<T>;
  label: string;
  hint?: string | undefined;
}

export interface FieldErrorProps<T extends FieldValues> {
  name: Path<T>;
}

type RegisterOwnedProps = 'name' | 'onChange' | 'onBlur' | 'ref';
type FormFieldOwnedProps = 'id' | 'aria-invalid' | 'aria-describedby';

export type TextFieldProps<T extends FieldValues> = BaseFieldProps<T> &
  Omit<ComponentProps<typeof Input>, RegisterOwnedProps | FormFieldOwnedProps>;

export type TextareaFieldProps<T extends FieldValues> = BaseFieldProps<T> &
  Omit<ComponentProps<typeof Textarea>, RegisterOwnedProps | FormFieldOwnedProps>;

export type MaskedFieldProps<T extends FieldValues> = BaseFieldProps<T> &
  Omit<ComponentProps<typeof Input>, RegisterOwnedProps | FormFieldOwnedProps | 'value'> & {
    mask: (value: string) => string;
  };

export type DateFieldProps<T extends FieldValues> = BaseFieldProps<T> &
  Omit<
    ComponentProps<typeof Input>,
    RegisterOwnedProps | FormFieldOwnedProps | 'value' | 'type' | 'inputMode'
  > & {
    minDate: Date;
    maxDate: Date;
  };

type WithOptionalLabel<P> = Omit<P, 'label'> & { label?: string | undefined };

export type CpfFieldProps<T extends FieldValues> = WithOptionalLabel<
  Omit<MaskedFieldProps<T>, 'mask'>
>;

export type PhoneFieldProps<T extends FieldValues> = WithOptionalLabel<
  Omit<TextFieldProps<T>, 'type'>
>;

export type EmailFieldProps<T extends FieldValues> = WithOptionalLabel<
  Omit<TextFieldProps<T>, 'type'>
>;

export type BirthDateFieldProps<T extends FieldValues> = WithOptionalLabel<
  Omit<DateFieldProps<T>, 'minDate' | 'maxDate'>
>;

export interface ControlledFieldProps<T extends FieldValues, N extends Path<T> = Path<T>> {
  name: N;
  label: string;
  hint?: string | undefined;
  labelHtmlFor?: boolean | undefined;
  children: (field: ControllerRenderProps<T, N>, controlProps: FormFieldControlProps) => ReactNode;
}

export interface ColorFieldProps<T extends FieldValues> {
  name: Path<T>;
  label: string;
  'aria-label'?: string | undefined;
  options: readonly ColorSwatchPickerOption[];
  hint?: string | undefined;
}

type FieldLabelPlacement =
  | { labelPlacement?: 'top' | undefined; hint?: string | undefined }
  | { labelPlacement: 'inline'; hint?: never };

export interface SelectFieldOption<V> {
  value: V;
  label: string;
}

interface SelectFieldBaseProps<T extends FieldValues, N extends Path<T>> {
  name: N;
  label: string;
  options: readonly SelectFieldOption<PathValue<T, N>>[];
  className?: string | undefined;
}

export type SelectFieldProps<
  T extends FieldValues,
  N extends Path<T> = Path<T>,
> = SelectFieldBaseProps<T, N> & FieldLabelPlacement;

export type SearchFieldProps<T extends FieldValues> = {
  name: Path<T>;
  label: string;
  className?: string | undefined;
} & Omit<
  ComponentProps<typeof InputGroupInput>,
  RegisterOwnedProps | FormFieldOwnedProps | 'aria-label' | 'className' | 'type'
> &
  FieldLabelPlacement;
