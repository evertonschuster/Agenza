import type { RefObject, SubmitEvent } from 'react';
import type { ApiProblem } from '@/shared/api/servicesFacade';
import type { ListSectionStatus } from '@/widgets/list-section';
import type { ClientListItem } from '../../../model/clientList';

export interface ClientListFailure {
  message: string;
  code: string | undefined;
}

export interface UseClientListPageResult {
  status: ListSectionStatus;
  clients: ClientListItem[];
  totalCount: number;
  isTruncated: boolean;
  failure: ClientListFailure | null;
  query: string;
  searchInputRef: RefObject<HTMLInputElement | null>;
  onSearchSubmit: (event: SubmitEvent<HTMLFormElement>) => void;
  onClearSearch: () => void;
  onRetry: () => void;
}

export interface LoadResult {
  query: string;
  status: Exclude<ListSectionStatus, 'loading'>;
  clients: ClientListItem[];
  totalCount: number;
  problem: ApiProblem | null;
}
