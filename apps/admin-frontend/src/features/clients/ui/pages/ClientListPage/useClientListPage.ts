import { useEffect, useRef, type SubmitEvent } from 'react';
import { usePaginatedList } from '@/widgets/paginated-list-section';
import { clientsRepository } from '../../../api/clientsRepository';
import { readClientListFilters } from '../../../model/clientListFilters';
import type { UseClientListPageResult } from './useClientListPage.types';

export function useClientListPage(): UseClientListPageResult {
  const { filters, setFilters, list, pagination } = usePaginatedList({
    readFilters: readClientListFilters,
    fetchPage: clientsRepository.list,
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
