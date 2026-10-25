import { PlusIcon } from 'lucide-react';
import { FormProvider } from 'react-hook-form';
import { Outlet } from 'react-router';
import type { CountNoun } from '@/shared/format/count';
import { ActionLink } from '@/shared/ui/action-link';
import type { ListSectionEmptyCopy } from '@/widgets/list-section';
import { PageHeader } from '@/widgets/page-header';
import { PaginatedListSection } from '@/widgets/paginated-list-section';
import { tagColumns } from './components/tagColumns';
import { TagListFilterBar } from './components/TagListFilterBar';
import { useTagListPage } from './useTagListPage';

const EMPTY_COPY: ListSectionEmptyCopy = {
  title: 'Nenhuma etiqueta ainda',
  description: 'Use o botão Nova etiqueta para cadastrar a primeira.',
  searchTitle: (term) => `Nenhuma etiqueta encontrada para «${term}»`,
  searchDescription: 'Confira a grafia do nome.',
};

const ITEM_LABEL: CountNoun = { singular: 'etiqueta', plural: 'etiquetas' };

export function TagListPage() {
  const { list, pagination, searchTerm, filterForm, ...filterBar } = useTagListPage();

  return (
    <div className="space-y-4">
      <PageHeader
        actions={
          <ActionLink to="new" icon={PlusIcon}>
            Nova etiqueta
          </ActionLink>
        }
      />

      <FormProvider {...filterForm}>
        <TagListFilterBar {...filterBar} />
      </FormProvider>

      <PaginatedListSection
        {...list}
        getKey={(tag) => tag.id}
        aria-label="Etiquetas"
        columns={tagColumns()}
        emptyCopy={EMPTY_COPY}
        search={{ term: searchTerm, onClear: filterBar.onClearFilters }}
        errorTitle="Não foi possível carregar as etiquetas."
        pagination={pagination}
        itemLabel={ITEM_LABEL}
      />

      <Outlet />
    </div>
  );
}
