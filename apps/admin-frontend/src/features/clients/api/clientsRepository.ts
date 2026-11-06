import { servicesApi } from '@/shared/api/servicesApi';
import type { ApiResult } from '@/shared/api/servicesFacade';
import type { Client, ClientInput } from '../model/client';
import type { ClientList } from '../model/clientList';
import type { ClientListQuery } from '../model/clientListFilters';

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
  return servicesApi.get('/api/v{version}/clients/{id}', { path: { id }, signal });
}

function create(input: ClientInput): Promise<ApiResult<Client>> {
  return servicesApi.post('/api/v{version}/clients', { body: input });
}

function update(id: string, input: ClientInput): Promise<ApiResult<Client>> {
  return servicesApi.put('/api/v{version}/clients/{id}', {
    path: { id },
    body: { clientId: id, ...input },
  });
}

function deactivate(id: string): Promise<ApiResult<Client>> {
  return servicesApi.post('/api/v{version}/clients/{id}/deactivate', { path: { id } });
}

function reactivate(id: string): Promise<ApiResult<Client>> {
  return servicesApi.post('/api/v{version}/clients/{id}/reactivate', { path: { id } });
}

function deleteClient(id: string): Promise<ApiResult<void>> {
  return servicesApi.del('/api/v{version}/clients/{id}', { path: { id } });
}

export const clientsRepository = {
  list,
  get,
  create,
  update,
  deactivate,
  reactivate,
  delete: deleteClient,
};
