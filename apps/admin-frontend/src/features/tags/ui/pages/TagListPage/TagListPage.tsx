import { PlusIcon, SearchIcon } from 'lucide-react';
import { Link, Outlet } from 'react-router';
import { ErrorState } from '@/shared/ui/error-state';
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from '@/shared/ui/input-group';
import { buttonVariants } from '@/shared/ui/button';
import { ListSection } from '@/widgets/list-section';
import { tagColumns } from './components/tagColumns';
import { useTagListPage } from './useTagListPage';

export function TagListPage() {
  const { tags, status, failure, query, searchInputRef, onSearchSubmit, onRetry, newTagTo } =
    useTagListPage();

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4">
        <h1 className="text-2xl font-semibold tracking-tight">Etiquetas</h1>
        <Link to={newTagTo} className={buttonVariants()}>
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
            name="q"
            defaultValue={query}
            placeholder="Buscar etiquetas por nome..."
            aria-label="Buscar etiquetas por nome"
          />
          <InputGroupAddon align="inline-end">
            <InputGroupButton type="submit">Buscar</InputGroupButton>
          </InputGroupAddon>
        </InputGroup>
      </form>

      {failure ? (
        <ErrorState
          title="Não foi possível carregar as etiquetas."
          description={failure.message}
          code={failure.code}
          onRetry={onRetry}
        />
      ) : (
        <ListSection
          status={status}
          items={tags}
          getKey={(tag) => tag.id}
          aria-label="Etiquetas"
          columns={tagColumns()}
        />
      )}

      <Outlet />
    </div>
  );
}
