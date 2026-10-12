import type { ClientGuardian } from './clientGuardian';
import type { ClientReferenceContact } from './clientReferenceContact';

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

export interface ClientInput {
  fullName: string;
  birthDate: Date | null;
  phone: string | null;
  email: string | null;
  cpf: string | null;
  administrativeNotes: string | null;
  guardians: Omit<ClientGuardian, 'id'>[];
  referenceContacts: Omit<ClientReferenceContact, 'id'>[];
}
