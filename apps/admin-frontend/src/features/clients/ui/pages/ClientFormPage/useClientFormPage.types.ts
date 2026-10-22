import type { SubmitEvent } from 'react';
import type { UseFormReturn } from 'react-hook-form';
import type { ApiResult } from '@/shared/api/servicesFacade';
import type { Client } from '../../../model/client';
import type { ClientStatus } from '../../../model/clientStatus';
import type { ClientFormFieldValues, ClientFormValues } from './clientForm';

export const ClientFormStatus = {
  Loading: 'loading',
  Ready: 'ready',
} as const;

export type ClientFormStatus = (typeof ClientFormStatus)[keyof typeof ClientFormStatus];

export interface ClientStatusChange {
  fullName: string;
  status: ClientStatus;
  isConfirming: boolean;
  onOpen: () => void;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => Promise<ApiResult<Client>>;
  onChanged: (client: Client) => void;
}

export interface UseClientFormPageResult {
  status: ClientFormStatus;
  isEdit: boolean;
  methods: UseFormReturn<ClientFormFieldValues, unknown, ClientFormValues>;
  isSaving: boolean;
  canSubmit: boolean;
  statusChange: ClientStatusChange | undefined;
  onSubmit: (event: SubmitEvent<HTMLFormElement>) => void;
}
