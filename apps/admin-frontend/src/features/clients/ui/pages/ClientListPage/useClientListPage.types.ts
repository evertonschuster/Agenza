import type { RefObject, SubmitEvent } from 'react';
import type { ApiResult } from '@/shared/api/servicesFacade';
import type { ListSectionStatus } from '@/widgets/list-section';
import type { PaginatedListSectionPaging } from '@/widgets/paginated-list-section';
import type { ClientListQuery } from '../../../api/clientsRepository';
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

export type ClientListPaging = Pick<PaginatedListSectionPaging, 'page' | 'pageSize' | 'totalCount'>;

export interface UseClientListPageResult extends ClientListState {
  query: string;
  paging: ClientListPaging;
  searchInputRef: RefObject<HTMLInputElement | null>;
  onSearchSubmit: (event: SubmitEvent<HTMLFormElement>) => void;
  onClearSearch: () => void;
  onRetry: () => void;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
}

export interface LoadResult {
  request: ClientListQuery;
  apiResult: ApiResult<ClientList>;
}
