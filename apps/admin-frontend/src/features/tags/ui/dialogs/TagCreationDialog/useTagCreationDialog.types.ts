import type { SubmitEvent } from 'react';
import type { UseFormReturn } from 'react-hook-form';
import type { TagFormFieldValues, TagFormValues } from '../../components/TagForm/tagForm';

export interface UseTagCreationDialogResult {
  methods: UseFormReturn<TagFormFieldValues, unknown, TagFormValues>;
  isSaving: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (event: SubmitEvent<HTMLFormElement>) => void;
}
