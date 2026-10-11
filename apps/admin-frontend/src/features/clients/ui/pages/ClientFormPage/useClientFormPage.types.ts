import type { RefObject, SubmitEvent } from 'react';
import type { UseFormReturn } from 'react-hook-form';
import type { ClientFormFieldValues, ClientFormValues } from '../../../model/clientForm';

export interface UseClientFormPageResult {
  methods: UseFormReturn<ClientFormFieldValues, unknown, ClientFormValues>;
  age: number | null;
  isMinor: boolean;
  isSaving: boolean;
  addGuardianButtonRef: RefObject<HTMLButtonElement | null>;
  onSubmit: (event: SubmitEvent<HTMLFormElement>) => void;
}
