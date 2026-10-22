import type { RefObject, SubmitEvent } from 'react';
import type {
  PaginatedListSectionPaging,
  PaginatedListState,
} from '@/widgets/paginated-list-section';
import type { ClientListItem } from '../../../model/clientList';
import type { ClientStatusFilter } from '../../../model/clientListFilters';

export interface UseClientListPageResult {
  list: PaginatedListState<ClientListItem>;
  pagination: PaginatedListSectionPaging;
  searchTerm: string;
  searchInputRef: RefObject<HTMLInputElement | null>;
  statusChoice: ClientStatusFilter;
  hasPendingFilters: boolean;
  canClearFilters: boolean;
  onStatusChoiceChange: (status: ClientStatusFilter) => void;
  onFiltersSubmit: (event: SubmitEvent<HTMLFormElement>) => void;
  onClearSearch: () => void;
  onClearFilters: () => void;
}
