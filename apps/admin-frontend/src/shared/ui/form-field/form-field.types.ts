import type { ComponentProps, ReactNode } from 'react';
import type { ControllerRenderProps, FieldValues, Path } from 'react-hook-form';
import type { Input } from '@/shared/ui/input';
import type { Textarea } from '@/shared/ui/textarea';
import type { ColorSwatchPickerOption } from '@/shared/ui/color-swatch-picker';

export interface FormFieldControlProps {
  id: string;
  'aria-invalid': boolean;
  'aria-describedby': string | undefined;
}

export interface FormFieldProps {
  name: string;
  label: string;
  hint?: string | undefined;
  error?: string | undefined;
  /** false quando o controle não aceita `id`/`htmlFor` (ex.: um radiogroup). Default: true. */
  labelHtmlFor?: boolean | undefined;
  children: (controlProps: FormFieldControlProps) => ReactNode;
}

interface BaseFieldProps<T extends FieldValues> {
  name: Path<T>;
  label: string;
  hint?: string | undefined;
}

export type TextFieldProps<T extends FieldValues> = BaseFieldProps<T> &
  Omit<ComponentProps<typeof Input>, 'id' | 'name' | 'aria-invalid' | 'aria-describedby'>;

export type TextareaFieldProps<T extends FieldValues> = BaseFieldProps<T> &
  Omit<ComponentProps<typeof Textarea>, 'id' | 'name' | 'aria-invalid' | 'aria-describedby'>;

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
