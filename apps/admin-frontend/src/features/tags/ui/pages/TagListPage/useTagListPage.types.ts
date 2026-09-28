import type { RefObject, SubmitEvent } from 'react';
import type { ApiProblem } from '@/shared/api/servicesFacade';
import type { ListSectionStatus } from '@/widgets/list-section';
import type { Tag } from '../../../model/tag';

export interface TagListFailure {
  message: string;
  code: string | undefined;
}

export interface UseTagListPageResult {
  status: ListSectionStatus;
  tags: Tag[];
  failure: TagListFailure | null;
  query: string;
  searchInputRef: RefObject<HTMLInputElement | null>;
  onSearchSubmit: (event: SubmitEvent<HTMLFormElement>) => void;
  onRetry: () => void;
  newTagTo: { pathname: string; search: string };
}

export interface LoadResult {
  query: string;
  status: Exclude<ListSectionStatus, 'loading'>;
  tags: Tag[];
  problem: ApiProblem | null;
}
