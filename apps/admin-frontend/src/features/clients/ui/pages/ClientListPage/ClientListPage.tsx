import { PlusIcon } from 'lucide-react';
import { FormProvider } from 'react-hook-form';
import { Link } from 'react-router';
import type { CountNoun } from '@/shared/format/count';
import { buttonVariants } from '@/shared/ui/button';
import type { ListSectionEmptyCopy } from '@/widgets/list-section';
import { PageHeader } from '@/widgets/page-header';
import { PaginatedListSection } from '@/widgets/paginated-list-section';
import { NEW_CLIENT_PATH } from '../../clientsPaths';
import { clientColumns } from './components/clientColumns';
import { ClientListFilterBar } from './components/ClientListFilterBar';
import { useClientListPage } from './useClientListPage';

const EMPTY_COPY: ListSectionEmptyCopy = {
  title: 'Nenhuma pessoa ainda',
  description: 'Use o botão Nova pessoa para cadastrar a primeira.',
  searchTitle: (term) => `Nenhuma pessoa encontrada para «${term}»`,
  searchDescription: 'Confira a grafia ou busque pelo e-mail ou pelo CPF.',
};

const ITEM_LABEL: CountNoun = { singular: 'pessoa', plural: 'pessoas' };

export function ClientListPage() {
  const { list, pagination, searchTerm, filterForm, ...filterBar } = useClientListPage();

  return (
    <div className="space-y-4">
      <PageHeader
        actions={
          <Link to={NEW_CLIENT_PATH} className={buttonVariants()}>
            <PlusIcon aria-hidden="true" />
            Nova pessoa
          </Link>
        }
      />

      <FormProvider {...filterForm}>
        <ClientListFilterBar {...filterBar} />
      </FormProvider>

      <PaginatedListSection
        {...list}
        getKey={(client) => client.id}
        aria-label="Pessoas"
        columns={clientColumns()}
        emptyCopy={EMPTY_COPY}
        search={{ term: searchTerm, onClear: filterBar.onClearFilters }}
        errorTitle="Não foi possível carregar as pessoas."
        pagination={pagination}
        itemLabel={ITEM_LABEL}
      />
    </div>
  );
}
