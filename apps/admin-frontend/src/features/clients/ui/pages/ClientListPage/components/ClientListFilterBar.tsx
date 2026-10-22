import { SearchIcon, XIcon } from 'lucide-react';
import { SearchField, SelectField } from '@/shared/form/fields';
import { Button } from '@/shared/ui/button';
import { CLIENT_SEARCH_MAX_LENGTH } from '../../../../model/client';
import {
  CLIENT_STATUS_FILTER_OPTIONS,
  type ClientListFilters,
} from '../../../../model/clientListFilters';
import type { UseClientListPageResult } from '../useClientListPage.types';

type ClientListFilterBarProps = Pick<
  UseClientListPageResult,
  'hasPendingFilters' | 'canClearFilters' | 'onFiltersSubmit' | 'onClearFilters'
>;

export function ClientListFilterBar({
  hasPendingFilters,
  canClearFilters,
  onFiltersSubmit,
  onClearFilters,
}: ClientListFilterBarProps) {
  return (
    <form onSubmit={onFiltersSubmit} role="search" className="@container">
      <div className="flex flex-col gap-2 @pagination:flex-row @pagination:flex-wrap @pagination:items-center">
        <SearchField<ClientListFilters>
          name="search"
          label="Buscar pessoas por nome, e-mail ou CPF"
          placeholder="Buscar por nome, e-mail ou CPF..."
          maxLength={CLIENT_SEARCH_MAX_LENGTH}
          labelPlacement="inline"
          className="@pagination:min-w-64 @pagination:flex-1"
        />
        <SelectField<ClientListFilters, 'status'>
          name="status"
          label="Situação"
          options={CLIENT_STATUS_FILTER_OPTIONS}
          labelPlacement="inline"
          className="w-full @pagination:w-fit"
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
