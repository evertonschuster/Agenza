import { SearchIcon } from 'lucide-react';
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from '@/shared/ui/input-group';
import { ListSection } from '@/shared/ui/list-section';
import { tagColumns } from './tagColumns';
import { useTagListPage } from './useTagListPage';

export function TagListPage() {
  const { tags, status, query, searchInputRef, onSearchSubmit } = useTagListPage();

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold tracking-tight">Etiquetas</h1>

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

      <ListSection
        status={status}
        items={tags}
        getKey={(tag) => tag.id}
        aria-label="Etiquetas"
        columns={tagColumns()}
      />
    </div>
  );
}
