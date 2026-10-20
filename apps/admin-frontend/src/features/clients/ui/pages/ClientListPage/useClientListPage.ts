import { useEffect, useRef, type SubmitEvent } from 'react';
import { usePaginatedList } from '@/widgets/paginated-list-section';
import { clientsRepository } from '../../../api/clientsRepository';
import type { UseClientListPageResult } from './useClientListPage.types';

export function useClientListPage(): UseClientListPageResult {
  const { filters, setFilters, list, pagination } = usePaginatedList({
    initialFilters: { q: '' },
    fetchPage: (query, signal) => clientsRepository.list(query, signal),
  });
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const input = searchInputRef.current;
    if (input && input.value !== filters.q) input.value = filters.q;
  }, [filters.q]);

  function onSearchSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    setFilters({ q: searchInputRef.current?.value ?? '' });
  }

  function onClearSearch() {
    setFilters({ q: '' });
  }

  return {
    list,
    pagination,
    query: filters.q,
    searchInputRef,
    onSearchSubmit,
    onClearSearch,
  };
}
