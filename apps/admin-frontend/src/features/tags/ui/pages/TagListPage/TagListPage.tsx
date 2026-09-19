import { PlusIcon, SearchIcon } from 'lucide-react';
import { Form, Link, Outlet } from 'react-router';
import { buttonVariants } from '@/shared/ui/button';
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from '@/shared/ui/input-group';
import { Kbd } from '@/shared/ui/kbd';
import { ListSection } from '@/shared/ui/list-section';
import { tagColumns } from './tagColumns';
import { useTagListPage } from './useTagListPage';

export function TagListPage() {
  const { tags, status, query, newTagHref, newTagHint } = useTagListPage();

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4">
        <h1 className="text-2xl font-semibold tracking-tight">Etiquetas</h1>
        <Link to={newTagHref} className={buttonVariants({ variant: 'default' })}>
          <PlusIcon aria-hidden="true" />
          <span>Nova etiqueta</span>
          {newTagHint.visible && <Kbd className="ml-auto">{newTagHint.displayKey}</Kbd>}
        </Link>
      </div>

      <Form method="get" replace role="search">
        <InputGroup>
          <InputGroupAddon>
            <SearchIcon aria-hidden="true" />
          </InputGroupAddon>
          <InputGroupInput
            name="q"
            defaultValue={query}
            placeholder="Buscar etiquetas por nome..."
            aria-label="Buscar etiquetas por nome"
          />
          <InputGroupAddon align="inline-end">
            <InputGroupButton type="submit">Buscar</InputGroupButton>
          </InputGroupAddon>
        </InputGroup>
      </Form>

      <ListSection
        status={status}
        items={tags}
        getKey={(tag) => tag.id}
        aria-label="Etiquetas"
        columns={tagColumns()}
      />

      <Outlet />
    </div>
  );
}
