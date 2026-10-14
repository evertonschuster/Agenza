import { SearchIcon } from 'lucide-react';
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from '@/shared/ui/input-group';
import { CLIENT_SEARCH_MAX_LENGTH } from '../../../../model/client';
import type { UseClientListPageResult } from '../useClientListPage.types';

type ClientListSearchProps = Pick<
  UseClientListPageResult,
  'query' | 'searchInputRef' | 'onSearchSubmit'
>;

export function ClientListSearch({ query, searchInputRef, onSearchSubmit }: ClientListSearchProps) {
  return (
    <form onSubmit={onSearchSubmit} role="search">
      <InputGroup>
        <InputGroupAddon>
          <SearchIcon aria-hidden="true" />
        </InputGroupAddon>
        <InputGroupInput
          ref={searchInputRef}
          name="q"
          defaultValue={query}
          maxLength={CLIENT_SEARCH_MAX_LENGTH}
          placeholder="Buscar por nome, e-mail ou CPF..."
          aria-label="Buscar pessoas por nome, e-mail ou CPF"
        />
        <InputGroupAddon align="inline-end">
          <InputGroupButton type="submit">Buscar</InputGroupButton>
        </InputGroupAddon>
      </InputGroup>
    </form>
  );
}
