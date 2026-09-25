import type { SubmitEvent } from 'react';
import type { UseFormReturn } from 'react-hook-form';
import type { ShortcutHint } from '@/shared/keyboard/shortcuts';
import type { TagFormFieldValues, TagFormValues } from '../../../model/tagForm';

export const TagFormStatus = {
  Loading: 'loading',
  Ready: 'ready',
} as const;

export type TagFormStatus = (typeof TagFormStatus)[keyof typeof TagFormStatus];

export interface UseTagFormPageResult {
  status: TagFormStatus;
  isEdit: boolean;
  canSubmit: boolean;
  saveHint: ShortcutHint;
  methods: UseFormReturn<TagFormFieldValues, unknown, TagFormValues>;
  onOpenChange: (open: boolean) => void;
  onSubmit: (event: SubmitEvent<HTMLFormElement>) => void;
}
