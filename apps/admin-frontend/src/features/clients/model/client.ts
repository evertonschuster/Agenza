import { isMinorOn } from '@/shared/format/birthDate';
import { todayUtc } from '@/shared/format/date';
import type { ClientGuardian } from './clientGuardian';
import type { ClientReferenceContact } from './clientReferenceContact';

export const CLIENT_FULL_NAME_MIN_LENGTH = 2;
export const CLIENT_FULL_NAME_MAX_LENGTH = 150;
export const CLIENT_NOTES_MAX_LENGTH = 500;
export const MAX_GUARDIANS = 10;
export const MAX_REFERENCE_CONTACTS = 10;

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

export function needsGuardian(
  birthDate: Date | null,
  guardianCount: number,
  today: Date = todayUtc(),
): boolean {
  return birthDate !== null && isMinorOn(birthDate, today) && guardianCount === 0;
}
