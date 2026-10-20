import type { RefObject, SubmitEvent } from 'react';
import type { ListSectionStatus } from '@/widgets/list-section';
import type { Tag } from '../../../model/tag';

export interface TagListFailure {
  message: string;
  code: string | undefined;
}

export interface TagListState {
  status: ListSectionStatus;
  tags: Tag[];
  failure: TagListFailure | null;
}

export interface UseTagListPageResult extends TagListState {
  query: string;
  searchInputRef: RefObject<HTMLInputElement | null>;
  onSearchSubmit: (event: SubmitEvent<HTMLFormElement>) => void;
  onClearSearch: () => void;
  onRetry: () => void;
}
