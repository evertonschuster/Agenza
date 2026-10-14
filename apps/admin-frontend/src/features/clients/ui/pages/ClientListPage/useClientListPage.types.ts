import type { RefObject, SubmitEvent } from 'react';
import type { ApiResult } from '@/shared/api/servicesFacade';
import type { ListSectionStatus } from '@/widgets/list-section';
import type { ClientList, ClientListItem } from '../../../model/clientList';

export interface ClientListFailure {
  message: string;
  code: string | undefined;
}

export interface ClientListState {
  status: ListSectionStatus;
  clients: ClientListItem[];
  failure: ClientListFailure | null;
}

export interface UseClientListPageResult extends ClientListState {
  query: string;
  searchInputRef: RefObject<HTMLInputElement | null>;
  onSearchSubmit: (event: SubmitEvent<HTMLFormElement>) => void;
  onClearSearch: () => void;
  onRetry: () => void;
}

export interface LoadResult {
  query: string;
  apiResult: ApiResult<ClientList>;
}
