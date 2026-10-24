import type { ClientStatusChange } from '../useClientFormPage.types';

export interface ClientFormHeaderProps {
  isEdit: boolean;
  isSaving: boolean;
  statusChange: ClientStatusChange | undefined;
}
