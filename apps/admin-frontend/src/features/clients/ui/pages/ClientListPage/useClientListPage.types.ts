import type { RefObject, SubmitEvent } from 'react';
import type { PaginatedListPagination, PaginatedListState } from '@/widgets/paginated-list-section';
import type { ClientListItem } from '../../../model/clientList';

export interface UseClientListPageResult {
  list: PaginatedListState<ClientListItem>;
  pagination: PaginatedListPagination;
  query: string;
  searchInputRef: RefObject<HTMLInputElement | null>;
  onSearchSubmit: (event: SubmitEvent<HTMLFormElement>) => void;
  onClearSearch: () => void;
}
