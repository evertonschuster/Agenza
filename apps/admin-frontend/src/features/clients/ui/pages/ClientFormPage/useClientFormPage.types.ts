import type { SubmitEvent } from 'react';
import type { UseFormReturn } from 'react-hook-form';
import type { ClientFormFieldValues, ClientFormValues } from './clientForm';

export interface UseClientFormPageResult {
  methods: UseFormReturn<ClientFormFieldValues, unknown, ClientFormValues>;
  isSaving: boolean;
  listPath: string;
  onSubmit: (event: SubmitEvent<HTMLFormElement>) => void;
}
