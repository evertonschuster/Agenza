import type { ClientStatusChange } from '../useClientFormPage.types';

export interface ClientFormHeaderProps {
  isSaving: boolean;
  statusChange: ClientStatusChange | undefined;
}
