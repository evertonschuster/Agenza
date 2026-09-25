import type { FormEvent } from 'react';
import type { UseFormReturn } from 'react-hook-form';
import type { Tag } from '../../../model/tag';
import type { TagFormFieldValues, TagFormValues } from '../../../model/tagForm';

export interface UseTagFormPageResult {
  status: 'loading' | 'ready';
  tag: Tag | null;
  methods: UseFormReturn<TagFormFieldValues, unknown, TagFormValues>;
  onOpenChange: (open: boolean) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}
