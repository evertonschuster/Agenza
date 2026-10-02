export interface ClientGuardian {
  id: string;
  name: string;
  relationship: string;
  phone: string | null;
  cpf: string | null;
}

export interface ClientReferenceContact {
  id: string;
  name: string;
  relationship: string;
  phone: string | null;
  purposes: string[];
}

export interface Client {
  id: string;
  fullName: string;
  birthDate: string | null;
  phone: string | null;
  email: string | null;
  cpf: string | null;
  administrativeNotes: string | null;
  status: string;
  guardians: ClientGuardian[];
  referenceContacts: ClientReferenceContact[];
}

export type GuardianInput = Pick<ClientGuardian, 'name' | 'relationship' | 'phone' | 'cpf'>;

export type ReferenceContactInput = Pick<
  ClientReferenceContact,
  'name' | 'relationship' | 'phone' | 'purposes'
>;

export interface ClientInput {
  fullName: string;
  birthDate: string | null;
  phone: string | null;
  email: string | null;
  cpf: string | null;
  administrativeNotes: string | null;
  guardians: GuardianInput[];
  referenceContacts: ReferenceContactInput[];
}

export interface ContactPurposeOption {
  value: string;
  label: string;
}

export const CONTACT_PURPOSE_OPTIONS: readonly ContactPurposeOption[] = [
  { value: 'emergency', label: 'Emergência' },
  { value: 'operationalSupport', label: 'Apoio operacional' },
  { value: 'dailyCommunication', label: 'Comunicação cotidiana' },
];
