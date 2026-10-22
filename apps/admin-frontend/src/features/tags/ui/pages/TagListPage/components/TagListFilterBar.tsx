import { SearchIcon, XIcon } from 'lucide-react';
import { SearchField } from '@/shared/form/fields';
import { Button } from '@/shared/ui/button';
import { TAG_SEARCH_MAX_LENGTH } from '../../../../model/tag';
import type { TagListFilters } from '../../../../model/tagListFilters';
import type { UseTagListPageResult } from '../useTagListPage.types';

type TagListFilterBarProps = Pick<
  UseTagListPageResult,
  'canClearFilters' | 'onFiltersSubmit' | 'onClearFilters'
>;

export function TagListFilterBar({
  canClearFilters,
  onFiltersSubmit,
  onClearFilters,
}: TagListFilterBarProps) {
  return (
    <form onSubmit={onFiltersSubmit} role="search" className="@container">
      <div className="flex flex-col gap-2 @pagination:flex-row @pagination:flex-wrap @pagination:items-center">
        <SearchField<TagListFilters>
          name="search"
          label="Buscar etiquetas por nome"
          placeholder="Buscar etiquetas por nome..."
          maxLength={TAG_SEARCH_MAX_LENGTH}
          labelPlacement="inline"
          className="@pagination:min-w-64 @pagination:flex-1"
        />
        <Button type="submit" variant="outline" className="pointer-coarse:h-11">
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
