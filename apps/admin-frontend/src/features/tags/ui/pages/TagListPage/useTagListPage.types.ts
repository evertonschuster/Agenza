import type { RefObject, SubmitEvent } from 'react';
import type {
  PaginatedListSectionPaging,
  PaginatedListState,
} from '@/widgets/paginated-list-section';
import type { Tag } from '../../../model/tag';

export interface UseTagListPageResult {
  list: PaginatedListState<Tag>;
  pagination: PaginatedListSectionPaging;
  searchTerm: string;
  searchInputRef: RefObject<HTMLInputElement | null>;
  onSearchSubmit: (event: SubmitEvent<HTMLFormElement>) => void;
  onClearSearch: () => void;
}
