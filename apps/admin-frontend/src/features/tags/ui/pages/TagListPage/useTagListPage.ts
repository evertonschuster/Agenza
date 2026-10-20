import { useRef, type SubmitEvent } from 'react';
import { useTopic } from '@/shared/pubsub/useTopic';
import { usePaginatedList } from '@/widgets/paginated-list-section';
import { tagsRepository } from '../../../api/tagsRepository';
import { tagDeleted, tagSaved } from '../../../model/tagEvents';
import type { TagListFilters } from '../../../model/tagListFilters';
import type { UseTagListPageResult } from './useTagListPage.types';

const INITIAL_FILTERS: TagListFilters = { search: '' };

export function useTagListPage(): UseTagListPageResult {
  const { filters, applyFilters, reload, list, pagination } = usePaginatedList({
    initialFilters: INITIAL_FILTERS,
    fetchPage: tagsRepository.list,
  });
  const searchInputRef = useRef<HTMLInputElement>(null);

  useTopic(tagDeleted, reload);
  useTopic(tagSaved, reload);

  function onSearchSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    applyFilters({ search: searchInputRef.current?.value ?? '' });
  }

  function onClearSearch() {
    if (searchInputRef.current) searchInputRef.current.value = '';
    applyFilters({ search: '' });
  }

  return {
    list,
    pagination,
    searchTerm: filters.search,
    searchInputRef,
    onSearchSubmit,
    onClearSearch,
  };
}
