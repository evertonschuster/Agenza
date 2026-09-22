import type { RefObject, SubmitEvent } from 'react';
import type { ShortcutHint } from '@/shared/keyboard/shortcuts';
import type { ListSectionStatus } from '@/shared/ui/list-section';
import type { Tag } from '../../../model/tag';

export interface UseTagListPageResult {
  status: ListSectionStatus;
  tags: Tag[];
  query: string;
  searchInputRef: RefObject<HTMLInputElement | null>;
  onSearchSubmit: (event: SubmitEvent<HTMLFormElement>) => void;
  newTagTo: { pathname: string; search: string };
  newTagHint: ShortcutHint;
}

export interface LoadResult {
  query: string;
  status: Exclude<ListSectionStatus, 'loading'>;
  tags: Tag[];
}
