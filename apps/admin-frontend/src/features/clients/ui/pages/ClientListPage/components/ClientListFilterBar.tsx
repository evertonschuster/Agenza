import { SearchIcon, XIcon } from 'lucide-react';
import { Button } from '@/shared/ui/button';
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/shared/ui/input-group';
import { CLIENT_SEARCH_MAX_LENGTH } from '../../../../model/client';
import type { UseClientListPageResult } from '../useClientListPage.types';
import { ClientStatusFilterSelect } from './ClientStatusFilterSelect';

type ClientListFilterBarProps = Pick<
  UseClientListPageResult,
  | 'searchInputRef'
  | 'statusChoice'
  | 'hasPendingFilters'
  | 'canClearFilters'
  | 'onStatusChoiceChange'
  | 'onFiltersSubmit'
  | 'onClearFilters'
>;

export function ClientListFilterBar({
  searchInputRef,
  statusChoice,
  hasPendingFilters,
  canClearFilters,
  onStatusChoiceChange,
  onFiltersSubmit,
  onClearFilters,
}: ClientListFilterBarProps) {
  return (
    <form onSubmit={onFiltersSubmit} role="search" className="@container">
      <div className="flex flex-col gap-2 @pagination:flex-row @pagination:flex-wrap @pagination:items-center">
        <InputGroup className="pointer-coarse:h-11 @pagination:min-w-64 @pagination:flex-1">
          <InputGroupAddon>
            <SearchIcon aria-hidden="true" />
          </InputGroupAddon>
          <InputGroupInput
            ref={searchInputRef}
            name="search"
            maxLength={CLIENT_SEARCH_MAX_LENGTH}
            placeholder="Buscar por nome, e-mail ou CPF..."
            aria-label="Buscar pessoas por nome, e-mail ou CPF"
          />
        </InputGroup>
        <ClientStatusFilterSelect
          statusChoice={statusChoice}
          onStatusChoiceChange={onStatusChoiceChange}
        />
        <Button
          type="submit"
          variant={hasPendingFilters ? 'default' : 'outline'}
          className="pointer-coarse:h-11"
        >
          <SearchIcon aria-hidden="true" data-icon="inline-start" />
          Buscar
        </Button>
        {canClearFilters && (
          <Button
            type="button"
            variant="ghost"
            onClick={onClearFilters}
            className="text-muted-foreground pointer-coarse:h-11"
          >
            <XIcon aria-hidden="true" data-icon="inline-start" />
            Limpar filtros
          </Button>
        )}
      </div>
    </form>
  );
}
