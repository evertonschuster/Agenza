import { PlusIcon } from 'lucide-react';
import { Link, Outlet } from 'react-router';
import type { CountNoun } from '@/shared/format/count';
import { buttonVariants } from '@/shared/ui/button';
import type { ListSectionEmptyCopy } from '@/widgets/list-section';
import { PaginatedListSection } from '@/widgets/paginated-list-section';
import { tagColumns } from './components/tagColumns';
import { TagListSearch } from './components/TagListSearch';
import { useTagListPage } from './useTagListPage';

const EMPTY_COPY: ListSectionEmptyCopy = {
  title: 'Nenhuma etiqueta ainda',
  description: 'Use o botão Nova etiqueta para cadastrar a primeira.',
  searchTitle: (term) => `Nenhuma etiqueta encontrada para «${term}»`,
  searchDescription: 'Confira a grafia do nome.',
};

const ITEM_LABEL: CountNoun = { singular: 'etiqueta', plural: 'etiquetas' };

export function TagListPage() {
  const { list, pagination, searchTerm, searchInputRef, onSearchSubmit, onClearSearch } =
    useTagListPage();

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4">
        <h1 className="text-2xl font-semibold tracking-tight">Etiquetas</h1>
        <Link to="new" className={buttonVariants()}>
          <PlusIcon aria-hidden="true" />
          Nova etiqueta
        </Link>
      </div>

      <TagListSearch searchInputRef={searchInputRef} onSearchSubmit={onSearchSubmit} />

      <PaginatedListSection
        {...list}
        getKey={(tag) => tag.id}
        aria-label="Etiquetas"
        columns={tagColumns()}
        emptyCopy={EMPTY_COPY}
        search={{ term: searchTerm, onClear: onClearSearch }}
        errorTitle="Não foi possível carregar as etiquetas."
        pagination={pagination}
        itemLabel={ITEM_LABEL}
      />

      <Outlet />
    </div>
  );
}
