import type { SubmitEvent } from 'react';
import type { UseFormReturn } from 'react-hook-form';
import type { TagFormFieldValues, TagFormValues } from './tagForm';

export interface TagFormDialogProps {
  readonly methods: UseFormReturn<TagFormFieldValues, unknown, TagFormValues>;
  readonly isEdit: boolean;
  readonly isLoading: boolean;
  readonly isSaving: boolean;
  readonly canSubmit: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly onSubmit: (event: SubmitEvent<HTMLFormElement>) => void;
  readonly finalFocus?: (() => HTMLElement | null) | undefined;
}
