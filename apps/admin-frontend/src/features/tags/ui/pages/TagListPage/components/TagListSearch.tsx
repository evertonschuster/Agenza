import { SearchIcon } from 'lucide-react';
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from '@/shared/ui/input-group';
import { TAG_SEARCH_MAX_LENGTH } from '../../../../model/tag';
import type { UseTagListPageResult } from '../useTagListPage.types';

type TagListSearchProps = Pick<UseTagListPageResult, 'searchInputRef' | 'onSearchSubmit'>;

export function TagListSearch({ searchInputRef, onSearchSubmit }: TagListSearchProps) {
  return (
    <form onSubmit={onSearchSubmit} role="search">
      <InputGroup>
        <InputGroupAddon>
          <SearchIcon aria-hidden="true" />
        </InputGroupAddon>
        <InputGroupInput
          ref={searchInputRef}
          name="search"
          maxLength={TAG_SEARCH_MAX_LENGTH}
          placeholder="Buscar etiquetas por nome..."
          aria-label="Buscar etiquetas por nome"
        />
        <InputGroupAddon align="inline-end">
          <InputGroupButton type="submit">Buscar</InputGroupButton>
        </InputGroupAddon>
      </InputGroup>
    </form>
  );
}
