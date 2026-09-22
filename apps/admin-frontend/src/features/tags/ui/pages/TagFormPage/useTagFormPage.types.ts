import type { FormEvent } from 'react';
import type { Tag } from '../../../model/tag';
import type { TagFormErrors } from '../../../model/tagForm';

export const TagFormMode = {
  NotFound: 'not-found',
  Form: 'form',
} as const;

export type UseTagFormPageResult =
  | { mode: typeof TagFormMode.NotFound; onClose: () => void }
  | {
      mode: typeof TagFormMode.Form;
      tag: Tag | null;
      color: string | null;
      onColorChange: (value: string) => void;
      fieldErrors: TagFormErrors;
      formError: string | null;
      isSubmitting: boolean;
      onOpenChange: (open: boolean) => void;
      onSubmit: (event: FormEvent<HTMLFormElement>) => void;
    };
