import type { SubmitEvent } from 'react';
import type { UseFormReturn } from 'react-hook-form';
import type {
  PaginatedListSectionPaging,
  PaginatedListState,
} from '@/widgets/paginated-list-section';
import type { ClientListItem } from '../../../model/clientList';
import type { ClientListFilters } from '../../../model/clientListFilters';

export interface UseClientListPageResult {
  list: PaginatedListState<ClientListItem>;
  pagination: PaginatedListSectionPaging;
  searchTerm: string;
  filterForm: UseFormReturn<ClientListFilters>;
  hasPendingFilters: boolean;
  canClearFilters: boolean;
  onFiltersSubmit: (event: SubmitEvent<HTMLFormElement>) => void;
  onClearFilters: () => void;
}
