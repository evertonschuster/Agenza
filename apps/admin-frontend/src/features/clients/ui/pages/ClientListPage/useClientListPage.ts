import { useRef, type SubmitEvent } from 'react';
import { usePaginatedList } from '@/widgets/paginated-list-section';
import { clientsRepository } from '../../../api/clientsRepository';
import type { ClientListFilters } from '../../../model/clientListFilters';
import type { UseClientListPageResult } from './useClientListPage.types';

const INITIAL_FILTERS: ClientListFilters = { search: '' };

export function useClientListPage(): UseClientListPageResult {
  const { filters, applyFilters, list, pagination } = usePaginatedList({
    initialFilters: INITIAL_FILTERS,
    fetchPage: clientsRepository.list,
  });
  const searchInputRef = useRef<HTMLInputElement>(null);

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
