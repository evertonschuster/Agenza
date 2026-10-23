import { servicesApi } from '@/shared/api/servicesApi';
import type { ApiResult } from '@/shared/api/servicesFacade';
import { parseIsoDate } from '@/shared/format/date';
import type { Paging } from '@/shared/pagination/paging';
import { ok } from '@/shared/result';
import type { Client, ClientInput } from '../model/client';
import type { ClientList } from '../model/clientList';
import type { ClientListFilters } from '../model/clientListFilters';

export type ClientListQuery = ClientListFilters & Paging;

type ClientResponse = Omit<Client, 'birthDate'> & { birthDate: string | null };

async function toClient(pending: Promise<ApiResult<ClientResponse>>): Promise<ApiResult<Client>> {
  const result = await pending;
  if (!result.ok) return result;

  const { birthDate } = result.data;
  return ok({ ...result.data, birthDate: birthDate === null ? null : parseIsoDate(birthDate) });
}

function list(
  { search, status, page, pageSize }: ClientListQuery,
  signal?: AbortSignal,
): Promise<ApiResult<ClientList>> {
  return servicesApi.get('/api/v{version}/clients', {
    query: {
      Page: page,
      PageSize: pageSize,
      Status: status,
      ...(search ? { Search: search } : {}),
    },
    signal,
  });
}

function get(id: string, signal?: AbortSignal): Promise<ApiResult<Client>> {
  return toClient(servicesApi.get('/api/v{version}/clients/{id}', { path: { id }, signal }));
}

function create(input: ClientInput): Promise<ApiResult<Client>> {
  return toClient(servicesApi.post('/api/v{version}/clients', { body: input }));
}

function update(id: string, input: ClientInput): Promise<ApiResult<Client>> {
  return toClient(
    servicesApi.put('/api/v{version}/clients/{id}', {
      path: { id },
      body: { clientId: id, ...input },
    }),
  );
}

function deactivate(id: string): Promise<ApiResult<Client>> {
  return toClient(servicesApi.post('/api/v{version}/clients/{id}/deactivate', { path: { id } }));
}

function reactivate(id: string): Promise<ApiResult<Client>> {
  return toClient(servicesApi.post('/api/v{version}/clients/{id}/reactivate', { path: { id } }));
}

export const clientsRepository = { list, get, create, update, deactivate, reactivate };
