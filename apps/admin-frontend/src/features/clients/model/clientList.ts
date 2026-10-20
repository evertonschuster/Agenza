import type { PagedResult } from '@/shared/pagination/paging';
import type { ClientStatus } from './clientStatus';

export interface ClientListItem {
  id: string;
  fullName: string;
  phone: string | null;
  email: string | null;
  cpf: string | null;
  status: ClientStatus;
}

export type ClientList = PagedResult<ClientListItem>;
