import type { FormEvent } from 'react';
import type { Tag } from '../../../model/tag';
import type { TagFormErrors } from '../../../model/tagForm';

export interface UseTagFormPageResult {
  tag: Tag | null;
  color: string | null;
  onColorChange: (value: string) => void;
  fieldErrors: TagFormErrors;
  formError: string | null;
  isSubmitting: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}
