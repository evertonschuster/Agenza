import type { SubmitEvent } from 'react';
import type { UseFormReturn } from 'react-hook-form';
import type {
  PaginatedListSectionPaging,
  PaginatedListState,
} from '@/widgets/paginated-list-section';
import type { Tag } from '../../../model/tag';
import type { TagListFilters } from '../../../model/tagListFilters';

export interface UseTagListPageResult {
  list: PaginatedListState<Tag>;
  pagination: PaginatedListSectionPaging;
  searchTerm: string;
  filterForm: UseFormReturn<TagListFilters>;
  canClearFilters: boolean;
  onFiltersSubmit: (event: SubmitEvent<HTMLFormElement>) => void;
  onClearFilters: () => void;
}
