import type { RefObject, SubmitEvent } from 'react';
import type { UseFieldArrayReturn, UseFormReturn } from 'react-hook-form';
import type { ClientFormFieldValues, ClientFormValues } from '../../../model/clientForm';

export interface UseClientFormPageResult {
  methods: UseFormReturn<ClientFormFieldValues, unknown, ClientFormValues>;
  guardians: UseFieldArrayReturn<ClientFormFieldValues, 'guardians'>;
  referenceContacts: UseFieldArrayReturn<ClientFormFieldValues, 'referenceContacts'>;
  age: number | null;
  isMinor: boolean;
  existingClientId: string | null;
  isSaving: boolean;
  addGuardianButtonRef: RefObject<HTMLButtonElement | null>;
  onSubmit: (event: SubmitEvent<HTMLFormElement>) => void;
  addGuardian: () => void;
  addReferenceContact: () => void;
}
