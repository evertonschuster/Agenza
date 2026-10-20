import { PlusIcon, SearchIcon } from 'lucide-react';
import { Link, Outlet } from 'react-router';
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from '@/shared/ui/input-group';
import { buttonVariants } from '@/shared/ui/button';
import { ListSection, type ListSectionEmptyCopy } from '@/widgets/list-section';
import { tagColumns } from './components/tagColumns';
import { useTagListPage } from './useTagListPage';

const EMPTY_COPY: ListSectionEmptyCopy = {
  title: 'Nenhuma etiqueta ainda',
  description: 'Use o botão Nova etiqueta para cadastrar a primeira.',
  searchTitle: (term) => `Nenhuma etiqueta encontrada para «${term}»`,
  searchDescription: 'Confira a grafia do nome.',
};

export function TagListPage() {
  const { tags, status, failure, query, searchInputRef, onSearchSubmit, onClearSearch, onRetry } =
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

      <form onSubmit={onSearchSubmit} role="search">
        <InputGroup>
          <InputGroupAddon>
            <SearchIcon aria-hidden="true" />
          </InputGroupAddon>
          <InputGroupInput
            ref={searchInputRef}
            name="search"
            placeholder="Buscar etiquetas por nome..."
            aria-label="Buscar etiquetas por nome"
          />
          <InputGroupAddon align="inline-end">
            <InputGroupButton type="submit">Buscar</InputGroupButton>
          </InputGroupAddon>
        </InputGroup>
      </form>

      <ListSection
        status={status}
        items={tags}
        getKey={(tag) => tag.id}
        aria-label="Etiquetas"
        columns={tagColumns()}
        emptyCopy={EMPTY_COPY}
        search={{ term: query, onClear: onClearSearch }}
        errorTitle="Não foi possível carregar as etiquetas."
        failure={failure && { ...failure, onRetry }}
      />

      <Outlet />
    </div>
  );
}
