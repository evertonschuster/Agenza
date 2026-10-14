import type { ClientStatus } from './clientStatus';

export interface ClientListItem {
  id: string;
  fullName: string;
  phone: string | null;
  email: string | null;
  cpf: string | null;
  status: ClientStatus;
}

export interface ClientList {
  items: ClientListItem[];
  totalCount: number;
  page: number;
  pageSize: number;
}
