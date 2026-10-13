import { PlusIcon } from 'lucide-react';
import { Link } from 'react-router';
import { buttonVariants } from '@/shared/ui/button';
import { ListSection, type ListSectionEmptyCopy } from '@/widgets/list-section';
import { NEW_CLIENT_PATH } from '../../clientsPaths';
import { clientColumns } from './components/clientColumns';
import { ClientListSearch } from './components/ClientListSearch';
import { useClientListPage } from './useClientListPage';

const EMPTY_COPY: ListSectionEmptyCopy = {
  title: 'Nenhuma pessoa ativa ainda',
  description: 'Use o botão Nova pessoa para cadastrar a primeira.',
  searchTitle: (term) => `Nenhuma pessoa encontrada para «${term}»`,
  searchDescription: 'Confira a grafia ou busque pelo e-mail ou pelo CPF.',
};

export function ClientListPage() {
  const {
    clients,
    status,
    failure,
    query,
    searchInputRef,
    onSearchSubmit,
    onClearSearch,
    onRetry,
  } = useClientListPage();

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4">
        <h1 className="text-2xl font-semibold tracking-tight">Pessoas</h1>
        <Link to={NEW_CLIENT_PATH} className={buttonVariants()}>
          <PlusIcon aria-hidden="true" />
          Nova pessoa
        </Link>
      </div>

      <ClientListSearch
        query={query}
        searchInputRef={searchInputRef}
        onSearchSubmit={onSearchSubmit}
      />

      <ListSection
        status={status}
        items={clients}
        getKey={(client) => client.id}
        aria-label="Pessoas"
        columns={clientColumns()}
        emptyCopy={EMPTY_COPY}
        search={{ term: query, onClear: onClearSearch }}
        errorTitle="Não foi possível carregar as pessoas."
        failure={failure && { ...failure, onRetry }}
      />
    </div>
  );
}
