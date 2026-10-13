import { Button } from '@/shared/ui/button';
import { EmptyState } from '@/shared/ui/empty-state';
import type { ListSectionEmptyProps } from '../list-section.types';

function ListSectionEmpty({ copy, search }: ListSectionEmptyProps) {
  if (search?.term) {
    return (
      <EmptyState
        title={copy?.searchTitle?.(search.term) ?? `Nenhum item encontrado para «${search.term}»`}
        description={copy?.searchDescription}
        action={
          <Button variant="outline" size="sm" onClick={search.onClear}>
            Limpar busca
          </Button>
        }
      />
    );
  }

  return (
    <EmptyState title={copy?.title ?? 'Nenhum item encontrado.'} description={copy?.description} />
  );
}

export { ListSectionEmpty };
