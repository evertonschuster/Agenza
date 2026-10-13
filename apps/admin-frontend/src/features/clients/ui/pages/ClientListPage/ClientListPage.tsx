import { PlusIcon, SearchIcon } from 'lucide-react';
import { Link } from 'react-router';
import { buttonVariants } from '@/shared/ui/button';
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from '@/shared/ui/input-group';
import { CLIENT_SEARCH_MAX_LENGTH } from '../../../model/client';
import { NEW_CLIENT_PATH } from '../../clientsPaths';
import { ClientListResults } from './components/ClientListResults';
import { useClientListPage } from './useClientListPage';

export function ClientListPage() {
  const {
    clients,
    totalCount,
    isTruncated,
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

      <ClientListResults
        status={status}
        clients={clients}
        failure={failure}
        query={query}
        onClearSearch={onClearSearch}
        onRetry={onRetry}
      />

      {isTruncated && (
        <p role="status" className="text-sm text-muted-foreground">
          Exibindo {clients.length} de {totalCount.toLocaleString('pt-BR')} pessoas ativas.
        </p>
      )}
    </div>
  );
}
