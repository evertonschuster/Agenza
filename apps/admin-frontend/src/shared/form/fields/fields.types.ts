import type { ComponentProps, ReactNode } from 'react';
import type { ControllerRenderProps, FieldValues, Path } from 'react-hook-form';
import type { ColorSwatchPickerOption } from '@/shared/ui/color-swatch-picker';
import type { FormFieldControlProps } from '@/shared/ui/form-field';
import type { Input } from '@/shared/ui/input';
import type { Textarea } from '@/shared/ui/textarea';

interface BaseFieldProps<T extends FieldValues> {
  name: Path<T>;
  label: string;
  hint?: string | undefined;
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
    minDate: string;
    maxDate: string;
  };

export interface ControlledFieldProps<T extends FieldValues> {
  name: Path<T>;
  label: string;
  hint?: string | undefined;
  labelHtmlFor?: boolean | undefined;
  children: (
    field: ControllerRenderProps<T, Path<T>>,
    controlProps: FormFieldControlProps,
  ) => ReactNode;
}

export interface ColorFieldProps<T extends FieldValues> {
  name: Path<T>;
  label: string;
  'aria-label'?: string | undefined;
  options: readonly ColorSwatchPickerOption[];
  hint?: string | undefined;
}
