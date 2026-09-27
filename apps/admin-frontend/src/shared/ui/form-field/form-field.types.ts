import type { ReactNode } from 'react';

export interface FormFieldControlProps {
  id: string;
  'aria-invalid': boolean;
  'aria-describedby': string | undefined;
}

export interface FormFieldProps {
  label: string;
  hint?: string | undefined;
  error?: string | undefined;
  labelHtmlFor?: boolean | undefined;
  children: (controlProps: FormFieldControlProps) => ReactNode;
}

export interface FormFieldsSkeletonProps {
  fieldCount: number;
}
