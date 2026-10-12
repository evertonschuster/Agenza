import type { ContactPurpose } from './contactPurpose';

export interface ClientReferenceContact {
  id: string;
  name: string;
  relationship: string;
  phone: string | null;
  purposes: ContactPurpose[];
}
