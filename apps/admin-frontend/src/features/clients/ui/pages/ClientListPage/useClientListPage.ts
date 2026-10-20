import { useRef, type SubmitEvent } from 'react';
import { usePaginatedList } from '@/widgets/paginated-list-section';
import { clientsRepository } from '../../../api/clientsRepository';
import type { UseClientListPageResult } from './useClientListPage.types';

export function useClientListPage(): UseClientListPageResult {
  const { filters, applyFilters, list, pagination } = usePaginatedList({
    initialFilters: { search: '' },
    fetchPage: (query, signal) => clientsRepository.list(query, signal),
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
    query: filters.search,
    searchInputRef,
    onSearchSubmit,
    onClearSearch,
  };
}
